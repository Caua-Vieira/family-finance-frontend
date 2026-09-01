import { useEffect, useState, type SubmitEvent } from "react";
import { transactionsApi, type TransactionFilters } from "../../api/transactions";
import { categoriesApi } from "../../api/categories";
import { cardsApi } from "../../api/cards";
import { recurringApi } from "../../api/recurring";
import "./TransactionsPage.css";
import type { Transaction, TransactionType } from "../../types/transaction";
import type { Category } from "../../types/category";
import type { Card } from "../../types/card";
import type { RecurringTransaction } from "../../types/recurring-transaction";
import { centsFromInput, formatCentsInput } from "../../utils/currency";
import { useToast } from "../../components/Toast/useToast";
import { useConfirm } from "../../components/ConfirmDialog/useConfirm";
import { RecurringRulesModal } from "../../components/RecurringRulesModal/RecurringRulesModal";

function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function pad(n: number) {
    return String(n).padStart(2, "0");
}

function startOfMonth(reference: Date) {
    return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

function firstDayIso(reference: Date) {
    return `${reference.getFullYear()}-${pad(reference.getMonth() + 1)}-01`;
}

function monthRange(reference: Date) {
    const year = reference.getFullYear();
    const month = reference.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
        startDate: `${year}-${pad(month + 1)}-01`,
        endDate: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
    };
}

function monthLabel(reference: Date) {
    const label = reference.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [rules, setRules] = useState<RecurringTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [type, setType] = useState<TransactionType>("expense");
    const [amountCents, setAmountCents] = useState(0);
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [categoryId, setCategoryId] = useState("");
    const [cardId, setCardId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [recurring, setRecurring] = useState(false);
    const [recurDay, setRecurDay] = useState("");
    const [recurStart, setRecurStart] = useState(() => firstDayIso(new Date()));
    const [recurEnd, setRecurEnd] = useState("");
    const [rulesOpen, setRulesOpen] = useState(false);

    const [filterType, setFilterType] = useState<TransactionType | "">("");
    const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));

    const toast = useToast();
    const confirm = useConfirm();

    function currentFilters(): TransactionFilters {
        const { startDate, endDate } = monthRange(monthDate);
        const filters: TransactionFilters = {
            startDate,
            endDate,
            month: monthDate.getMonth() + 1,
            year: monthDate.getFullYear(),
        };
        if (filterType) filters.type = filterType;
        return filters;
    }

    function categoryLabel(id: string | null) {
        if (!id) return "—";
        const category = categories.find((c) => c.id === id);
        if (!category) return "—";
        if (category.parentId) {
            const parent = categories.find((c) => c.id === category.parentId);
            return parent ? `${parent.name} · ${category.name}` : category.name;
        }
        return category.name;
    }

    function cardLabel(id: number | null) {
        if (!id) return "—";
        return cards.find((c) => c.id === id)?.name ?? "—";
    }

    async function loadRules() {
        const data = await recurringApi.list();
        setRules(data);
    }

    async function loadLists() {
        const [categoriesData, cardsData, rulesData] = await Promise.all([
            categoriesApi.list(),
            cardsApi.list(),
            recurringApi.list(),
        ]);
        setCategories(categoriesData);
        setCards(cardsData);
        setRules(rulesData);
    }

    async function loadTransactions(filters: TransactionFilters = {}) {
        try {
            setLoading(true);
            const data = await transactionsApi.list(filters);
            setTransactions(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadLists().catch((err) => setError((err as Error).message));
    }, []);

    useEffect(() => {
        loadTransactions(currentFilters());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterType, monthDate]);

    function handleFilterChange(nextType: TransactionType | "") {
        setFilterType(nextType);
    }

    function handlePrevMonth() {
        setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }

    function handleNextMonth() {
        setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }

    function handleCurrentMonth() {
        setMonthDate(startOfMonth(new Date()));
    }

    function resetForm() {
        setAmountCents(0);
        setDescription("");
        setCategoryId("");
        setCardId("");
        setRecurDay("");
        setRecurEnd("");
    }

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (recurring) {
            const day = Number(recurDay);
            if (!Number.isInteger(day) || day < 1 || day > 31) {
                const message = "O dia do mês deve ser um número entre 1 e 31.";
                setError(message);
                toast.error(message);
                return;
            }

            setSubmitting(true);
            try {
                await recurringApi.create({
                    type,
                    amount: amountCents / 100,
                    description,
                    categoryId: categoryId || null,
                    cardId: type === "expense" && cardId ? Number(cardId) : null,
                    userId: null,
                    dayOfMonth: day,
                    startDate: recurStart,
                    endDate: recurEnd || null,
                });

                resetForm();
                await Promise.all([loadTransactions(currentFilters()), loadRules()]);
                toast.success("Recorrência criada. O lançamento deste mês já foi gerado.");
            } catch (err) {
                const message = (err as Error).message;
                setError(message);
                toast.error(message);
            } finally {
                setSubmitting(false);
            }
            return;
        }

        setSubmitting(true);
        try {
            await transactionsApi.create({
                type,
                amount: amountCents / 100,
                description,
                date,
                categoryId: categoryId || null,
                cardId: type === "expense" && cardId ? Number(cardId) : null,
                userId: null,
            });

            resetForm();
            await loadTransactions(currentFilters());
            toast.success(type === "income" ? "Receita lançada com sucesso." : "Despesa lançada com sucesso.");
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        const ok = await confirm({
            title: "Excluir lançamento",
            message: "Tem certeza que deseja excluir este lançamento? Essa ação não pode ser desfeita.",
            confirmLabel: "Excluir",
            danger: true,
        });
        if (!ok) return;

        try {
            await transactionsApi.remove(id);
            await loadTransactions(currentFilters());
            toast.success("Lançamento excluído.");
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            toast.error(message);
        }
    }

    const activeRulesCount = rules.filter((r) => r.active).length;

    return (
        <div className="transactions-page">
            <header className="transactions-header">
                <div className="transactions-heading">
                    <div className="transactions-heading-text">
                        <h1>Lançamentos</h1>
                        <p>Registre receitas e despesas da família.</p>
                    </div>
                    <button
                        type="button"
                        className="recurring-open-btn"
                        onClick={() => setRulesOpen(true)}
                    >
                        ↻ Recorrências{activeRulesCount > 0 ? ` (${activeRulesCount})` : ""}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="transaction-form">
                    <div className="transaction-form-top">
                        <div className="transaction-type-toggle">
                            <button
                                type="button"
                                className={type === "expense" ? "type-btn active-expense" : "type-btn"}
                                onClick={() => setType("expense")}
                            >
                                Despesa
                            </button>
                            <button
                                type="button"
                                className={type === "income" ? "type-btn active-income" : "type-btn"}
                                onClick={() => setType("income")}
                            >
                                Receita
                            </button>
                        </div>

                        <label className="transaction-recurring-toggle">
                            <input
                                type="checkbox"
                                checked={recurring}
                                onChange={(e) => setRecurring(e.target.checked)}
                            />
                            <span>Repetir todo mês</span>
                        </label>
                    </div>

                    <div className="transaction-form-row">
                        <label className="transaction-field">
                            <span>Descrição</span>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ex: Mercado, Salário..."
                                required
                            />
                        </label>

                        <label className="transaction-field">
                            <span>Valor</span>
                            <div className="transaction-amount-wrap">
                                <span>R$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formatCentsInput(amountCents)}
                                    onChange={(e) => setAmountCents(centsFromInput(e.target.value))}
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                        </label>

                        {recurring ? (
                            <label className="transaction-field">
                                <span>Dia do mês</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={recurDay}
                                    onChange={(e) => setRecurDay(e.target.value)}
                                    placeholder="Ex: 5"
                                    required
                                />
                            </label>
                        ) : (
                            <label className="transaction-field">
                                <span>Data</span>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </label>
                        )}
                    </div>

                    {recurring && (
                        <div className="transaction-form-row">
                            <label className="transaction-field">
                                <span>Início</span>
                                <input
                                    type="date"
                                    value={recurStart}
                                    onChange={(e) => setRecurStart(e.target.value)}
                                    required
                                />
                            </label>

                            <label className="transaction-field">
                                <span>Encerrar em (opcional)</span>
                                <input
                                    type="date"
                                    value={recurEnd}
                                    onChange={(e) => setRecurEnd(e.target.value)}
                                />
                            </label>
                        </div>
                    )}

                    <div className="transaction-form-row">
                        <label className="transaction-field">
                            <span>Categoria</span>
                            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                                <option value="">Sem categoria</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.parentId ? `— ${c.name}` : c.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {type === "expense" && (
                            <label className="transaction-field">
                                <span>Cartão</span>
                                <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
                                    <option value="">Sem cartão</option>
                                    {cards.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        <button type="submit" className="transaction-submit" disabled={submitting}>
                            {submitting
                                ? "Salvando..."
                                : recurring
                                    ? "Criar recorrência"
                                    : "Adicionar"}
                        </button>
                    </div>

                    {recurring && (
                        <p className="transaction-hint">
                            A regra gera um lançamento por mês automaticamente. O lançamento do mês atual é
                            criado na hora.
                        </p>
                    )}

                    {error && <p className="transaction-error">{error}</p>}
                </form>

                <div className="transaction-filters">
                    <button
                        type="button"
                        className={filterType === "" ? "filter-chip active" : "filter-chip"}
                        onClick={() => handleFilterChange("")}
                    >
                        Todos
                    </button>
                    <button
                        type="button"
                        className={filterType === "expense" ? "filter-chip active" : "filter-chip"}
                        onClick={() => handleFilterChange("expense")}
                    >
                        Despesas
                    </button>
                    <button
                        type="button"
                        className={filterType === "income" ? "filter-chip active" : "filter-chip"}
                        onClick={() => handleFilterChange("income")}
                    >
                        Receitas
                    </button>

                    <div className="transaction-month-nav">
                        <button
                            type="button"
                            className="month-nav-btn"
                            onClick={handlePrevMonth}
                            aria-label="Mês anterior"
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            className="month-nav-label"
                            onClick={handleCurrentMonth}
                            title="Voltar para o mês atual"
                        >
                            {monthLabel(monthDate)}
                        </button>
                        <button
                            type="button"
                            className="month-nav-btn"
                            onClick={handleNextMonth}
                            aria-label="Próximo mês"
                        >
                            ›
                        </button>
                    </div>
                </div>
            </header>

            {loading ? (
                <p className="transactions-empty">Carregando...</p>
            ) : transactions.length === 0 ? (
                <div className="transactions-empty-state">
                    <p>Nenhum lançamento cadastrado ainda.</p>
                    <span>Adicione o primeiro lançamento ali em cima.</span>
                </div>
            ) : (
                <div className="transaction-list">
                    {transactions.map((t) => (
                        <div
                            className={
                                (t.type === "income" ? "transaction-row income" : "transaction-row expense") +
                                (t.isProjected ? " projected" : "")
                            }
                            key={t.id || `proj-${t.recurringTransactionId}`}
                        >
                            <div className="transaction-main">
                                <span className="transaction-description">
                                    {t.description}
                                    {t.isProjected ? (
                                        <span
                                            className="transaction-projected-tag"
                                            title="Lançamento previsto a partir de uma recorrência ativa — ainda não foi gerado"
                                        >
                                            Previsto
                                        </span>
                                    ) : (
                                        t.recurringTransactionId && (
                                            <button
                                                type="button"
                                                className="transaction-recurring-tag"
                                                onClick={() => setRulesOpen(true)}
                                                title="Gerado por uma recorrência — gerenciar"
                                            >
                                                ↻ recorrente
                                            </button>
                                        )
                                    )}
                                </span>
                                <span className="transaction-meta">
                                    {formatDate(t.date)} · {categoryLabel(t.categoryId)}
                                    {t.cardId ? ` · ${cardLabel(t.cardId)}` : ""}
                                </span>
                            </div>
                            <span className={t.type === "income" ? "transaction-amount income" : "transaction-amount expense"}>
                                {t.type === "income" ? "+" : "-"} {formatCurrency(t.amount)}
                            </span>
                            {!t.isProjected && (
                                <button
                                    type="button"
                                    className="transaction-delete"
                                    onClick={() => handleDelete(t.id)}
                                >
                                    Excluir
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <RecurringRulesModal
                open={rulesOpen}
                onClose={() => setRulesOpen(false)}
                rules={rules}
                categories={categories}
                cards={cards}
                onChanged={async () => {
                    await Promise.all([loadRules(), loadTransactions(currentFilters())]);
                }}
            />
        </div>
    );
}

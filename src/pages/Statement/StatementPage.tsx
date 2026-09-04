import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import "./StatementPage.css";
import { cardsApi } from "../../api/cards";
import { categoriesApi } from "../../api/categories";
import { transactionsApi } from "../../api/transactions";
import { statementEntriesApi } from "../../api/statementEntries";
import type { Card } from "../../types/card";
import type { Category } from "../../types/category";
import type { Transaction } from "../../types/transaction";
import type { StatementEntry } from "../../types/statement-entry";
import { centsFromInput, formatCentsInput } from "../../utils/currency";
import { useToast } from "../../components/Toast/useToast";
import { useConfirm } from "../../components/ConfirmDialog/useConfirm";

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Paleta categórica calibrada do Painel (contraste + daltonismo, skill de dataviz).
const CARD_COLORS = ["#3F6F64", "#A6432F", "#B98A3D", "#3462A6", "#8B3E82", "#6B6F63"];

function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function pad(n: number) {
    return String(n).padStart(2, "0");
}

function monthRange(month: number, year: number) {
    const lastDay = new Date(year, month, 0).getDate();
    return { startDate: `${year}-${pad(month)}-01`, endDate: `${year}-${pad(month)}-${pad(lastDay)}` };
}

interface Bar {
    key: string;
    label: string;
    value: number;
    color: string;
}

function BarList({ bars, total }: { bars: Bar[]; total: number }) {
    const max = bars.reduce((m, b) => Math.max(m, b.value), 0) || 1;
    return (
        <div className="statement-bars">
            {bars.map((bar) => {
                const share = total > 0 ? Math.round((bar.value / total) * 100) : 0;
                return (
                    <div className="statement-bar" key={bar.key}>
                        <div className="statement-bar-head">
                            <span className="statement-bar-label">{bar.label}</span>
                            <span className="statement-bar-figures">
                                {formatCurrency(bar.value)}
                                <span className="statement-bar-share"> · {share}%</span>
                            </span>
                        </div>
                        <div className="statement-bar-track">
                            <div
                                className="statement-bar-fill"
                                style={{ width: `${Math.max((bar.value / max) * 100, 2)}%`, background: bar.color }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function StatementPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const [cards, setCards] = useState<Card[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [entries, setEntries] = useState<StatementEntry[]>([]);
    const [budgetExpenses, setBudgetExpenses] = useState<Transaction[]>([]);
    const [activeCardId, setActiveCardId] = useState<number | null>(null);
    const [activeSubcat, setActiveSubcat] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [qDate, setQDate] = useState("");
    const [qCategoryId, setQCategoryId] = useState("");
    const [qDescription, setQDescription] = useState("");
    const [qAmountCents, setQAmountCents] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const toast = useToast();
    const confirm = useConfirm();

    const subcategories = useMemo(
        () => categories.filter((c) => c.parentId).sort((a, b) => a.name.localeCompare(b.name)),
        [categories]
    );

    function categoryLabel(id: string | null) {
        if (!id) return "Sem subcategoria";
        const category = categories.find((c) => c.id === id);
        if (!category) return "Sem subcategoria";
        if (category.parentId) {
            const parent = categories.find((c) => c.id === category.parentId);
            return parent ? `${parent.name} · ${category.name}` : category.name;
        }
        return category.name;
    }

    function shortCategoryLabel(id: string) {
        return categories.find((c) => String(c.id) === id)?.name ?? "Subcategoria";
    }

    function subcatKey(categoryId: string | null) {
        return categoryId == null ? "__none__" : String(categoryId);
    }

    function cardColor(cardId: number) {
        const index = cards.findIndex((c) => c.id === cardId);
        return CARD_COLORS[index >= 0 ? index % CARD_COLORS.length : 0];
    }

    async function loadBaseData() {
        try {
            const [cardsData, categoriesData] = await Promise.all([cardsApi.list(), categoriesApi.list()]);
            setCards(cardsData);
            setCategories(categoriesData);
            setActiveCardId((current) => current ?? cardsData[0]?.id ?? null);
        } catch (err) {
            setError((err as Error).message);
        }
    }

    async function loadMonth() {
        try {
            setLoading(true);
            const { startDate, endDate } = monthRange(month, year);
            const [entriesData, expensesData] = await Promise.all([
                statementEntriesApi.list({ startDate, endDate }),
                transactionsApi.list({ type: "expense", startDate, endDate }),
            ]);
            setEntries(entriesData);
            setBudgetExpenses(expensesData.filter((t) => t.cardId != null && !t.isProjected));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadBaseData();
    }, []);

    useEffect(() => {
        loadMonth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month, year]);

    useEffect(() => {
        const viewingCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
        setQDate(viewingCurrentMonth ? now.toISOString().slice(0, 10) : `${year}-${pad(month)}-01`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month, year]);

    useEffect(() => {
        setActiveSubcat(null);
    }, [activeCardId, month, year]);

    function changePeriod(direction: -1 | 1) {
        let nextMonth = month + direction;
        let nextYear = year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        } else if (nextMonth < 1) {
            nextMonth = 12;
            nextYear -= 1;
        }
        setMonth(nextMonth);
        setYear(nextYear);
    }

    const cardTotals = useMemo(() => {
        const totals = new Map<number, number>();
        for (const e of entries) {
            totals.set(e.cardId, (totals.get(e.cardId) ?? 0) + Number(e.amount));
        }
        return totals;
    }, [entries]);

    const monthTotal = useMemo(
        () => [...cardTotals.values()].reduce((sum, v) => sum + v, 0),
        [cardTotals]
    );

    const cardBars: Bar[] = useMemo(
        () =>
            cards
                .map((c) => ({
                    key: String(c.id),
                    label: c.name,
                    value: cardTotals.get(c.id) ?? 0,
                    color: cardColor(c.id),
                }))
                .filter((b) => b.value > 0)
                .sort((a, b) => b.value - a.value),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cards, cardTotals]
    );

    const activeCardEntries = useMemo(
        () => entries.filter((e) => e.cardId === activeCardId).sort((a, b) => b.date.localeCompare(a.date)),
        [entries, activeCardId]
    );

    const detailedTotal = useMemo(
        () => activeCardEntries.reduce((sum, e) => sum + Number(e.amount), 0),
        [activeCardEntries]
    );

    const budgetedTotal = useMemo(
        () =>
            budgetExpenses
                .filter((t) => t.cardId === activeCardId)
                .reduce((sum, t) => sum + Number(t.amount), 0),
        [budgetExpenses, activeCardId]
    );

    const difference = budgetedTotal - detailedTotal;

    const subcatTotals = useMemo(() => {
        const buckets = new Map<string, number>();
        for (const e of activeCardEntries) {
            const key = subcatKey(e.categoryId);
            buckets.set(key, (buckets.get(key) ?? 0) + Number(e.amount));
        }
        return [...buckets.entries()]
            .map(([key, value]) => ({
                key,
                label: key === "__none__" ? "Sem subcategoria" : shortCategoryLabel(key),
                value,
            }))
            .sort((a, b) => b.value - a.value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCardEntries, categories]);

    const visibleEntries = useMemo(
        () =>
            activeSubcat == null
                ? activeCardEntries
                : activeCardEntries.filter((e) => subcatKey(e.categoryId) === activeSubcat),
        [activeCardEntries, activeSubcat]
    );

    const visibleTotal = useMemo(
        () => visibleEntries.reduce((sum, e) => sum + Number(e.amount), 0),
        [visibleEntries]
    );

    const activeSubcatLabel = activeSubcat
        ? subcatTotals.find((s) => s.key === activeSubcat)?.label ?? ""
        : null;

    async function handleQuickAdd(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (activeCardId == null) return;

        setSubmitting(true);
        setError(null);
        try {
            await statementEntriesApi.create({
                cardId: activeCardId,
                categoryId: qCategoryId || null,
                description: qDescription,
                amount: qAmountCents / 100,
                date: qDate,
            });
            setQDescription("");
            setQAmountCents(0);
            setQCategoryId("");
            await loadMonth();
            toast.success("Item adicionado ao extrato.");
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
            title: "Excluir item do extrato",
            message: "Remove só este item do detalhamento. Não afeta lançamentos, dashboard nem orçamento.",
            confirmLabel: "Excluir",
            danger: true,
        });
        if (!ok) return;

        try {
            await statementEntriesApi.remove(id);
            await loadMonth();
            toast.success("Item removido.");
        } catch (err) {
            toast.error((err as Error).message);
        }
    }

    const activeCard = cards.find((c) => c.id === activeCardId) ?? null;

    return (
        <div className="statement-page">
            <header className="statement-header">
                <div className="statement-heading">
                    <h1>Extrato por Cartão</h1>
                    <p>Detalhamento informativo da fatura — não entra no dashboard nem no orçamento.</p>
                </div>

                <div className="statement-controls">
                    <div className="statement-period-nav">
                        <button type="button" onClick={() => changePeriod(-1)} aria-label="Mês anterior">‹</button>
                        <span>{MONTH_NAMES[month - 1]} {year}</span>
                        <button type="button" onClick={() => changePeriod(1)} aria-label="Próximo mês">›</button>
                    </div>
                </div>

                {error && <p className="statement-error">{error}</p>}
            </header>

            {cards.length === 0 ? (
                <div className="statement-empty-state">
                    <p>Nenhum cartão cadastrado.</p>
                    <span>Cadastre um cartão em "Cartões" para detalhar a fatura.</span>
                </div>
            ) : (
                <>
                    <section className="statement-card">
                        <div className="statement-card-head">
                            <h2 className="statement-card-title">Total detalhado por cartão</h2>
                            {monthTotal > 0 && (
                                <span className="statement-card-total">{formatCurrency(monthTotal)}</span>
                            )}
                        </div>
                        {loading ? (
                            <p className="statement-muted">Carregando...</p>
                        ) : cardBars.length === 0 ? (
                            <p className="statement-muted">Nenhum item de extrato neste mês.</p>
                        ) : (
                            <BarList bars={cardBars} total={monthTotal} />
                        )}
                    </section>

                    <div className="statement-tabs" role="tablist">
                        {cards.map((card) => (
                            <button
                                key={card.id}
                                type="button"
                                role="tab"
                                aria-selected={card.id === activeCardId}
                                className={card.id === activeCardId ? "statement-tab active" : "statement-tab"}
                                style={card.id === activeCardId ? { borderBottomColor: cardColor(card.id) } : undefined}
                                onClick={() => setActiveCardId(card.id)}
                            >
                                <span className="statement-tab-dot" style={{ background: cardColor(card.id) }} />
                                {card.name}
                                <span className="statement-tab-total">{formatCurrency(cardTotals.get(card.id) ?? 0)}</span>
                            </button>
                        ))}
                    </div>

                    {activeCard && (
                        <section className="statement-card statement-tab-panel">
                            <form className="statement-quick-add" onSubmit={handleQuickAdd}>
                                <label className="statement-field statement-field-date">
                                    <span>Data</span>
                                    <input type="date" value={qDate} onChange={(e) => setQDate(e.target.value)} required />
                                </label>

                                <label className="statement-field">
                                    <span>Subcategoria</span>
                                    <select value={qCategoryId} onChange={(e) => setQCategoryId(e.target.value)}>
                                        <option value="">Sem subcategoria</option>
                                        {subcategories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {categoryLabel(c.id)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="statement-field statement-field-grow">
                                    <span>Descrição</span>
                                    <input
                                        type="text"
                                        value={qDescription}
                                        onChange={(e) => setQDescription(e.target.value)}
                                        placeholder={`Item da fatura ${activeCard.name}`}
                                        required
                                    />
                                </label>

                                <label className="statement-field statement-field-amount">
                                    <span>Valor</span>
                                    <div className="statement-amount-wrap">
                                        <span>R$</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={formatCentsInput(qAmountCents)}
                                            onChange={(e) => setQAmountCents(centsFromInput(e.target.value))}
                                            placeholder="0,00"
                                            required
                                        />
                                    </div>
                                </label>

                                <button type="submit" className="statement-add-btn" disabled={submitting}>
                                    {submitting ? "..." : "Adicionar"}
                                </button>
                            </form>

                            <div className="statement-subcat">
                                <div className="statement-card-head">
                                    <h2 className="statement-card-title">Gasto por subcategoria</h2>
                                    <span className="statement-card-total">{formatCurrency(detailedTotal)}</span>
                                </div>
                                {subcatTotals.length === 0 ? (
                                    <p className="statement-muted">Nenhum item neste cartão no mês.</p>
                                ) : (
                                    <div className="statement-subcat-filter">
                                        <button
                                            type="button"
                                            className={activeSubcat == null ? "statement-chip active" : "statement-chip"}
                                            onClick={() => setActiveSubcat(null)}
                                        >
                                            Todas
                                            <span className="statement-chip-value">{formatCurrency(detailedTotal)}</span>
                                        </button>
                                        {subcatTotals.map((s) => (
                                            <button
                                                key={s.key}
                                                type="button"
                                                className={activeSubcat === s.key ? "statement-chip active" : "statement-chip"}
                                                onClick={() => setActiveSubcat((current) => (current === s.key ? null : s.key))}
                                            >
                                                {s.label}
                                                <span className="statement-chip-value">{formatCurrency(s.value)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="statement-table-wrap">
                                <table className="statement-table">
                                    <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Subcategoria</th>
                                            <th>Descrição</th>
                                            <th className="statement-num">Valor</th>
                                            <th aria-label="Ações" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="statement-muted">Carregando...</td>
                                            </tr>
                                        ) : visibleEntries.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="statement-muted">
                                                    Nenhum item neste cartão no mês.
                                                </td>
                                            </tr>
                                        ) : (
                                            visibleEntries.map((e) => (
                                                <tr key={e.id}>
                                                    <td>{formatDate(e.date)}</td>
                                                    <td>{categoryLabel(e.categoryId)}</td>
                                                    <td>{e.description}</td>
                                                    <td className="statement-num">{formatCurrency(Number(e.amount))}</td>
                                                    <td className="statement-row-action">
                                                        <button type="button" onClick={() => handleDelete(e.id)}>
                                                            excluir
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {visibleEntries.length > 0 && (
                                        <tfoot>
                                            <tr>
                                                <td colSpan={3}>
                                                    {activeSubcatLabel ? `Total · ${activeSubcatLabel}` : "Total"}
                                                </td>
                                                <td className="statement-num">{formatCurrency(visibleTotal)}</td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            <div className="statement-compare">
                                <div className="statement-compare-item">
                                    <span>Lançado no orçamento</span>
                                    <strong>{formatCurrency(budgetedTotal)}</strong>
                                </div>
                                <div className="statement-compare-item">
                                    <span>Detalhado aqui</span>
                                    <strong>{formatCurrency(detailedTotal)}</strong>
                                </div>
                                <div className="statement-compare-item">
                                    <span>Diferença</span>
                                    <strong className={Math.abs(difference) < 0.01 ? "statement-diff-ok" : "statement-diff-off"}>
                                        {formatCurrency(difference)}
                                    </strong>
                                </div>
                            </div>
                            <p className="statement-compare-hint">
                                "Lançado no orçamento" = soma das transações de despesa deste cartão no mês (o
                                lançamento-resumo da fatura). Os itens acima são só o detalhamento e não somam em
                                lugar nenhum.
                            </p>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

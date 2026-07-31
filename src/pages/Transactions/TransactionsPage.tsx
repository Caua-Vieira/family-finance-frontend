import { useEffect, useState, type SubmitEvent } from "react";
import { transactionsApi, type TransactionFilters } from "../../api/transactions";
import { categoriesApi } from "../../api/categories";
import { cardsApi } from "../../api/cards";
import "./TransactionsPage.css";
import type { Transaction, TransactionType } from "../../types/transaction";
import type { Category } from "../../types/category";
import type { Card } from "../../types/card";

function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [type, setType] = useState<TransactionType>("expense");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [categoryId, setCategoryId] = useState("");
    const [cardId, setCardId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [filterType, setFilterType] = useState<TransactionType | "">("");

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

    async function loadLists() {
        const [categoriesData, cardsData] = await Promise.all([
            categoriesApi.list(),
            cardsApi.list(),
        ]);
        setCategories(categoriesData);
        setCards(cardsData);
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
        loadTransactions();
    }, []);

    function handleFilterChange(nextType: TransactionType | "") {
        setFilterType(nextType);
        loadTransactions(nextType ? { type: nextType } : {});
    }

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await transactionsApi.create({
                type,
                amount: Number(amount),
                description,
                date,
                categoryId: categoryId || null,
                cardId: type === "expense" && cardId ? Number(cardId) : null,
                userId: null,
            });

            setAmount("");
            setDescription("");
            setCategoryId("");
            setCardId("");
            await loadTransactions(filterType ? { type: filterType } : {});
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Excluir este lançamento?")) return;

        try {
            await transactionsApi.remove(id);
            await loadTransactions(filterType ? { type: filterType } : {});
        } catch (err) {
            setError((err as Error).message);
        }
    }

    return (
        <div className="transactions-page">
            <header className="transactions-header">
                <div className="transactions-heading">
                    <h1>Lançamentos</h1>
                    <p>Registre receitas e despesas da família.</p>
                </div>

                <form onSubmit={handleSubmit} className="transaction-form">
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
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0,00"
                                required
                            />
                        </label>

                        <label className="transaction-field">
                            <span>Data</span>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </label>
                    </div>

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
                            {submitting ? "Salvando..." : "Adicionar"}
                        </button>
                    </div>

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
                            className={t.type === "income" ? "transaction-row income" : "transaction-row expense"}
                            key={t.id}
                        >
                            <div className="transaction-main">
                                <span className="transaction-description">{t.description}</span>
                                <span className="transaction-meta">
                                    {formatDate(t.date)} · {categoryLabel(t.categoryId)}
                                    {t.cardId ? ` · ${cardLabel(t.cardId)}` : ""}
                                </span>
                            </div>
                            <span className={t.type === "income" ? "transaction-amount income" : "transaction-amount expense"}>
                                {t.type === "income" ? "+" : "-"} {formatCurrency(t.amount)}
                            </span>
                            <button
                                type="button"
                                className="transaction-delete"
                                onClick={() => handleDelete(t.id)}
                            >
                                Excluir
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

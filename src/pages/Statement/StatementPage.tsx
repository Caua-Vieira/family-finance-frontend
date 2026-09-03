import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
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

// Mesma paleta categórica calibrada do Painel (contraste + distinção sob
// daltonismo, skill de dataviz). As células do treemap são rotuladas
// diretamente, o que cobre o par adjacente de menor separação.
const CHART_COLORS = ["#1F8A6E", "#B8452E", "#C08A2E", "#3462A6", "#8B3E82"];
const CHART_OTHER_COLOR = "#9C9A8F";
const MAX_SLICES = CHART_COLORS.length;

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

function readableText(hex: string) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.5 ? "#1c1c1c" : "#f4f1e8";
}

interface TreemapDatum {
    name: string;
    value: number;
    fill: string;
    [key: string]: string | number;
}

// recharts chama o content para o nó raiz (sem name) e para cada folha.
function TreemapCell(props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    value?: number;
    fill?: string;
    payload?: TreemapDatum;
}) {
    const { x = 0, y = 0, width = 0, height = 0, name } = props;
    if (!name || width <= 0 || height <= 0) return null;

    const fill = props.fill ?? props.payload?.fill ?? CHART_OTHER_COLOR;
    const value = props.value ?? props.payload?.value ?? 0;
    const ink = readableText(fill);
    const showLabel = width > 56 && height > 30;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={fill}
                stroke="var(--color-surface)"
                strokeWidth={2}
                rx={2}
            />
            {showLabel && (
                <>
                    <text x={x + 8} y={y + 18} fontSize={12} fontWeight={600} fontFamily="var(--font-sans)" fill={ink}>
                        {name}
                    </text>
                    <text x={x + 8} y={y + 34} fontSize={11} fontFamily="var(--font-mono)" fill={ink} opacity={0.85}>
                        {formatCurrency(value)}
                    </text>
                </>
            )}
        </g>
    );
}

const TOOLTIP_STYLE = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-paper-dim)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-ink)",
};

export function StatementPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const [cards, setCards] = useState<Card[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [entries, setEntries] = useState<StatementEntry[]>([]);
    const [budgetExpenses, setBudgetExpenses] = useState<Transaction[]>([]);
    const [activeCardId, setActiveCardId] = useState<number | null>(null);

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

    function cardColor(cardId: number) {
        const index = cards.findIndex((c) => c.id === cardId);
        return index >= 0 && index < CHART_COLORS.length ? CHART_COLORS[index] : CHART_OTHER_COLOR;
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

    const cardTreemapData: TreemapDatum[] = useMemo(
        () =>
            cards
                .map((c) => ({ name: c.name, value: cardTotals.get(c.id) ?? 0, fill: cardColor(c.id) }))
                .filter((d) => d.value > 0)
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

    const subcategoryTreemapData: TreemapDatum[] = useMemo(() => {
        const buckets = new Map<string, number>();
        for (const e of activeCardEntries) {
            const key = categoryLabel(e.categoryId);
            buckets.set(key, (buckets.get(key) ?? 0) + Number(e.amount));
        }
        const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
        const top = sorted.slice(0, MAX_SLICES);
        const rest = sorted.slice(MAX_SLICES).reduce((sum, [, value]) => sum + value, 0);

        const data: TreemapDatum[] = top.map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i] }));
        if (rest > 0) data.push({ name: "Outros", value: rest, fill: CHART_OTHER_COLOR });
        return data;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCardEntries, categories]);

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
                        <h2 className="statement-card-title">Total detalhado por cartão</h2>
                        {cardTreemapData.length === 0 ? (
                            <p className="statement-muted">Nenhum item de extrato neste mês.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <Treemap
                                    data={cardTreemapData}
                                    dataKey="value"
                                    nameKey="name"
                                    isAnimationActive={false}
                                    content={<TreemapCell />}
                                >
                                    <Tooltip
                                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                                        contentStyle={TOOLTIP_STYLE}
                                        labelStyle={{ color: "var(--color-text-ink)" }}
                                    />
                                </Treemap>
                            </ResponsiveContainer>
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

                            <h2 className="statement-card-title">Distribuição por subcategoria — {activeCard.name}</h2>
                            {subcategoryTreemapData.length === 0 ? (
                                <p className="statement-muted">Nenhum item neste cartão no mês.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={180}>
                                    <Treemap
                                        data={subcategoryTreemapData}
                                        dataKey="value"
                                        nameKey="name"
                                        isAnimationActive={false}
                                        content={<TreemapCell />}
                                    >
                                        <Tooltip
                                            formatter={(value) => formatCurrency(Number(value ?? 0))}
                                            contentStyle={TOOLTIP_STYLE}
                                            labelStyle={{ color: "var(--color-text-ink)" }}
                                        />
                                    </Treemap>
                                </ResponsiveContainer>
                            )}

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
                                        ) : activeCardEntries.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="statement-muted">
                                                    Nenhum item neste cartão no mês.
                                                </td>
                                            </tr>
                                        ) : (
                                            activeCardEntries.map((e) => (
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
                                    {activeCardEntries.length > 0 && (
                                        <tfoot>
                                            <tr>
                                                <td colSpan={3}>Total</td>
                                                <td className="statement-num">{formatCurrency(detailedTotal)}</td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            <div className="statement-compare">
                                <div className="statement-compare-item">
                                    <span>Total lançado no orçamento</span>
                                    <strong>{formatCurrency(budgetedTotal)}</strong>
                                </div>
                                <div className="statement-compare-sep">|</div>
                                <div className="statement-compare-item">
                                    <span>Total detalhado aqui</span>
                                    <strong>{formatCurrency(detailedTotal)}</strong>
                                </div>
                                <div className="statement-compare-sep">|</div>
                                <div className="statement-compare-item">
                                    <span>Diferença</span>
                                    <strong
                                        className={
                                            Math.abs(difference) < 0.01
                                                ? "statement-diff-ok"
                                                : "statement-diff-off"
                                        }
                                    >
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

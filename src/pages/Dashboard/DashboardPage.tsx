import { useEffect, useState } from "react";
import { PieChart, Pie, Tooltip, ResponsiveContainer } from "recharts";
import "./DashboardPage.css";
import type { DashboardSummary } from "../../types/dashboard";
import { dashboardApi } from "../../api/dashboards";

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Paleta categórica derivada das cores da marca (jade/brick/brass), re-calibrada
// para passar nos checks de contraste e distinção sob daltonismo (skill de dataviz).
const PIE_COLORS = ["#1F8A6E", "#B8452E", "#C08A2E", "#3462A6", "#8B3E82"];
const PIE_OTHER_COLOR = "#9C9A8F";
const MAX_PIE_SLICES = PIE_COLORS.length;

function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DashboardPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const [data, setData] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function loadData() {
        try {
            setLoading(true);
            const summary = await dashboardApi.summary(month, year);
            setData(summary);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
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

    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

    const totalBudgeted = data?.categories.reduce((sum, c) => sum + c.budgeted, 0) ?? 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
    const percentTimeElapsed = Math.round((daysElapsed / daysInMonth) * 100);
    const percentBudgetUsed =
        totalBudgeted > 0 && data ? Math.round((data.expenses / totalBudgeted) * 100) : null;

    const categoriesWithSpend = [...(data?.categories ?? [])]
        .filter((c) => c.spent > 0)
        .sort((a, b) => b.spent - a.spent);

    const pieTopCategories = categoriesWithSpend.slice(0, MAX_PIE_SLICES);
    const pieOtherTotal = categoriesWithSpend
        .slice(MAX_PIE_SLICES)
        .reduce((sum, c) => sum + c.spent, 0);

    const pieData = [
        ...pieTopCategories.map((c, i) => ({
            name: c.categoryName,
            value: c.spent,
            fill: PIE_COLORS[i % PIE_COLORS.length],
        })),
        ...(pieOtherTotal > 0 ? [{ name: "Outros", value: pieOtherTotal, fill: PIE_OTHER_COLOR }] : []),
    ];

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="dashboard-heading">
                    <h1>Painel</h1>
                    <p>Visão geral do mês.</p>
                </div>

                <div className="dashboard-controls">
                    <div className="dashboard-period-nav">
                        <button type="button" onClick={() => changePeriod(-1)}>‹</button>
                        <span>{MONTH_NAMES[month - 1]} {year}</span>
                        <button type="button" onClick={() => changePeriod(1)}>›</button>
                    </div>
                </div>
            </header>

            {loading || !data ? (
                <p className="dashboard-empty">{error ?? "Carregando..."}</p>
            ) : (
                <>
                    <div className="summary-cards">
                        <div className="summary-card">
                            <span className="summary-label">Renda</span>
                            <span className="summary-value income">{formatCurrency(data.income)}</span>
                        </div>

                        <div className="summary-card">
                            <span className="summary-label">Despesas</span>
                            <span className="summary-value expense">{formatCurrency(data.expenses)}</span>
                            {data.previousMonth.expensesVariationPercentage !== null && (
                                <span
                                    className={
                                        data.previousMonth.expensesVariationPercentage > 0
                                            ? "variation-badge up"
                                            : "variation-badge down"
                                    }
                                >
                                    {data.previousMonth.expensesVariationPercentage > 0 ? "↑" : "↓"}{" "}
                                    {Math.abs(data.previousMonth.expensesVariationPercentage)}% vs mês anterior
                                </span>
                            )}
                        </div>

                        <div className="summary-card">
                            <span className="summary-label">Saldo</span>
                            <span className={data.balance >= 0 ? "summary-value income" : "summary-value expense"}>
                                {formatCurrency(data.balance)}
                            </span>
                            <span className="summary-sub">
                                {data.balance >= 0 ? "Dentro do orçamento" : "Fora do orçamento"}
                            </span>
                        </div>
                    </div>

                    {isCurrentMonth && (
                        <div className="pace-card">
                            <div className="pace-row">
                                <span>{daysElapsed} de {daysInMonth} dias do mês</span>
                                <span>{percentTimeElapsed}% do tempo</span>
                            </div>
                            <div className="pace-bar">
                                <div className="pace-bar-fill time" style={{ width: `${percentTimeElapsed}%` }} />
                            </div>

                            {percentBudgetUsed !== null && (
                                <>
                                    <div className="pace-row" style={{ marginTop: "0.75rem" }}>
                                        <span>Orçamento consumido</span>
                                        <span>{percentBudgetUsed}%</span>
                                    </div>
                                    <div className="pace-bar">
                                        <div
                                            className={
                                                percentBudgetUsed > percentTimeElapsed
                                                    ? "pace-bar-fill budget-alert"
                                                    : "pace-bar-fill budget-ok"
                                            }
                                            style={{ width: `${Math.min(percentBudgetUsed, 100)}%` }}
                                        />
                                    </div>
                                    {percentBudgetUsed > percentTimeElapsed && (
                                        <p className="pace-warning">
                                            Você já usou mais orçamento do que o tempo decorrido do mês — atenção ao ritmo.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div className="dashboard-content-grid">
                        <div className="category-progress-list">
                            {data.categories.map((category) => (
                                <div className="progress-row" key={category.categoryId}>
                                    <div className="progress-row-header">
                                        <span>{category.categoryName}</span>
                                        <span className="progress-values">
                                            {formatCurrency(category.spent)}
                                            {category.budgeted > 0 && ` / ${formatCurrency(category.budgeted)}`}
                                        </span>
                                    </div>
                                    {category.budgeted > 0 && (
                                        <div className="progress-bar">
                                            <div
                                                className={
                                                    category.percentageSpent > 100 ? "progress-bar-fill over" : "progress-bar-fill"
                                                }
                                                style={{ width: `${Math.min(category.percentageSpent, 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pie-card">
                            {pieData.length === 0 ? (
                                <p className="dashboard-empty">Nenhuma despesa registrada neste mês ainda.</p>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={55}
                                                outerRadius={90}
                                                paddingAngle={2}
                                                stroke="#fff"
                                                strokeWidth={2}
                                            />
                                            <Tooltip
                                                formatter={(value) =>
                                                    formatCurrency(typeof value === "number" ? value : Number(value ?? 0))
                                                }
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="pie-legend">
                                        {pieData.map((entry) => (
                                            <div className="pie-legend-item" key={entry.name}>
                                                <span
                                                    className="pie-legend-dot"
                                                    style={{ background: entry.fill }}
                                                />
                                                <span>{entry.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
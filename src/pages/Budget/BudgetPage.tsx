import { useEffect, useState } from "react";
import { budgetsApi } from "../../api/budgets";
import { categoriesApi } from "../../api/categories";
import "./BudgetPage.css";
import type { Category } from "../../types/category";
import type { Budget } from "../../types/budget";
import { centsFromInput, formatCentsInput } from "../../utils/currency";

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BudgetPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const [mainCategories, setMainCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [values, setValues] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    async function loadData() {
        try {
            setLoading(true);
            setSavedMessage(null);

            const [categoriesData, budgetsData] = await Promise.all([
                categoriesApi.list(),
                budgetsApi.list(month, year),
            ]);

            const mains = categoriesData.filter((c) => !c.parentId);
            setMainCategories(mains);
            setBudgets(budgetsData);

            const initialValues: Record<string, number> = {};
            mains.forEach((category) => {
                const existing = budgetsData.find((b) => b.categoryId === category.id);
                initialValues[category.id] = existing ? Math.round(existing.estimatedAmount * 100) : 0;
            });
            setValues(initialValues);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [month, year]);

    function handleValueChange(categoryId: string, rawValue: string) {
        setValues((prev) => ({ ...prev, [categoryId]: centsFromInput(rawValue) }));
    }

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

    async function handleSaveAll() {
        setError(null);
        setSaving(true);
        setSavedMessage(null);

        try {
            const requests = mainCategories.map((category) => {
                const estimatedAmount = (values[category.id] ?? 0) / 100;
                const existing = budgets.find((b) => b.categoryId === category.id);

                if (existing) {
                    return budgetsApi.update({
                        id: existing.id,
                        categoryId: category.id,
                        month,
                        year,
                        estimatedAmount,
                    });
                }

                if (estimatedAmount > 0) {
                    return budgetsApi.create({ categoryId: category.id, month, year, estimatedAmount });
                }

                return Promise.resolve(null);
            });

            await Promise.all(requests);
            setSavedMessage("Orçamento salvo.");
            await loadData();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    const totalEstimated = Object.values(values).reduce((sum, cents) => sum + cents, 0) / 100;

    return (
        <div className="budget-page">
            <header className="budget-header">
                <div className="budget-heading">
                    <h1>Orçamento</h1>
                    <p>Defina quanto a família pretende gastar em cada categoria no mês.</p>
                </div>

                <div className="budget-controls">
                    <div className="budget-period-nav">
                        <button type="button" onClick={() => changePeriod(-1)}>‹</button>
                        <span>{MONTH_NAMES[month - 1]} {year}</span>
                        <button type="button" onClick={() => changePeriod(1)}>›</button>
                    </div>

                    <div className="budget-summary">
                        <span>Total estimado</span>
                        <span className="budget-summary-value">{formatCurrency(totalEstimated)}</span>
                    </div>
                </div>

                {error && <p className="budget-error">{error}</p>}
            </header>

            {loading ? (
                <p className="budget-empty">Carregando...</p>
            ) : mainCategories.length === 0 ? (
                <div className="budget-empty-state">
                    <p>Nenhuma categoria principal cadastrada ainda.</p>
                    <span>Cadastre categorias principais primeiro para definir o orçamento.</span>
                </div>
            ) : (
                <>
                    <div className="budget-grid">
                        {mainCategories.map((category) => (
                            <article className="budget-card" key={category.id}>
                                <span className="budget-category-name">{category.name}</span>
                                <div className="budget-input-wrap">
                                    <span>R$</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={formatCentsInput(values[category.id] ?? 0)}
                                        onChange={(e) => handleValueChange(category.id, e.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>
                            </article>
                        ))}
                    </div>

                    {savedMessage && <p className="budget-saved">{savedMessage}</p>}

                    <button
                        type="button"
                        className="budget-save-btn"
                        onClick={handleSaveAll}
                        disabled={saving}
                    >
                        {saving ? "Salvando..." : "Salvar orçamento do mês"}
                    </button>
                </>
            )}
        </div>
    );
}

import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import "./InvestmentsPage.css";
import { investmentsApi } from "../../api/investments";
import { INVESTMENT_TYPE_LABELS, type Investment, type InvestmentType } from "../../types/investment";
import { centsFromInput, formatCentsInput } from "../../utils/currency";
import { useToast } from "../../components/Toast/useToast";
import { useConfirm } from "../../components/ConfirmDialog/useConfirm";

const INVESTMENT_TYPES = Object.keys(INVESTMENT_TYPE_LABELS) as InvestmentType[];

function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number) {
    return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function returnPercent(invested: number, current: number) {
    return invested > 0 ? ((current - invested) / invested) * 100 : 0;
}

function returnClass(value: number) {
    if (Math.abs(value) < 0.005) return "";
    return value > 0 ? "positive" : "negative";
}

export function InvestmentsPage() {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [type, setType] = useState<InvestmentType>("fixed_income");
    const [institution, setInstitution] = useState("");
    const [investedCents, setInvestedCents] = useState(0);
    const [currentCents, setCurrentCents] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const toast = useToast();
    const confirm = useConfirm();

    // Recarrega após salvar/excluir: a lista atual fica na tela até chegar a nova.
    async function loadInvestments() {
        try {
            setInvestments(await investmentsApi.list());
        } catch (err) {
            setError((err as Error).message);
        }
    }

    useEffect(() => {
        investmentsApi
            .list()
            .then(setInvestments)
            .catch((err) => setError((err as Error).message))
            .finally(() => setLoading(false));
    }, []);

    const totals = useMemo(() => {
        const invested = investments.reduce((sum, i) => sum + Number(i.investedAmount), 0);
        const current = investments.reduce((sum, i) => sum + Number(i.currentValue), 0);
        return { invested, current, gain: current - invested, gainPercent: returnPercent(invested, current) };
    }, [investments]);

    const allocation = useMemo(() => {
        const byType = new Map<InvestmentType, number>();
        for (const i of investments) {
            byType.set(i.type, (byType.get(i.type) ?? 0) + Number(i.currentValue));
        }
        return [...byType.entries()]
            .map(([key, value]) => ({ key, label: INVESTMENT_TYPE_LABELS[key] ?? key, value }))
            .filter((item) => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [investments]);

    function resetForm() {
        setEditingId(null);
        setName("");
        setType("fixed_income");
        setInstitution("");
        setInvestedCents(0);
        setCurrentCents(0);
    }

    function startEditing(investment: Investment) {
        setEditingId(investment.id);
        setName(investment.name);
        setType(investment.type);
        setInstitution(investment.institution ?? "");
        setInvestedCents(Math.round(Number(investment.investedAmount) * 100));
        setCurrentCents(Math.round(Number(investment.currentValue) * 100));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        const payload = {
            name,
            type,
            institution: institution.trim() || null,
            investedAmount: investedCents / 100,
            currentValue: currentCents / 100,
        };

        try {
            if (editingId) {
                await investmentsApi.update(editingId, payload);
                toast.success("Investimento atualizado.");
            } else {
                await investmentsApi.create(payload);
                toast.success("Investimento adicionado.");
            }
            resetForm();
            await loadInvestments();
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(investment: Investment) {
        const ok = await confirm({
            title: "Excluir investimento",
            message: `Tem certeza que deseja excluir "${investment.name}"? Essa ação não pode ser desfeita.`,
            confirmLabel: "Excluir",
            danger: true,
        });
        if (!ok) return;

        try {
            await investmentsApi.remove(investment.id);
            if (editingId === investment.id) resetForm();
            await loadInvestments();
            toast.success("Investimento excluído.");
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            toast.error(message);
        }
    }

    return (
        <div className="investments-page">
            <header className="investments-header">
                <div className="investments-heading">
                    <h1>Investimentos</h1>
                    <p>Acompanhe o patrimônio investido da família. Não entra no painel nem no orçamento.</p>
                </div>

                <form onSubmit={handleSubmit} className="investment-form">
                    <div className="investment-form-row">
                        <label className="investment-field investment-field-grow">
                            <span>Nome</span>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Tesouro Selic 2029, PETR4..."
                                required
                            />
                        </label>

                        <label className="investment-field">
                            <span>Tipo</span>
                            <select value={type} onChange={(e) => setType(e.target.value as InvestmentType)}>
                                {INVESTMENT_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {INVESTMENT_TYPE_LABELS[t]}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="investment-field">
                            <span>Instituição (opcional)</span>
                            <input
                                type="text"
                                value={institution}
                                onChange={(e) => setInstitution(e.target.value)}
                                placeholder="Ex: XP, Nubank..."
                            />
                        </label>
                    </div>

                    <div className="investment-form-row">
                        <label className="investment-field">
                            <span>Valor aplicado</span>
                            <div className="investment-amount-wrap">
                                <span>R$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formatCentsInput(investedCents)}
                                    onChange={(e) => setInvestedCents(centsFromInput(e.target.value))}
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                        </label>

                        <label className="investment-field">
                            <span>Valor atual</span>
                            <div className="investment-amount-wrap">
                                <span>R$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formatCentsInput(currentCents)}
                                    onChange={(e) => setCurrentCents(centsFromInput(e.target.value))}
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                        </label>

                        <div className="investment-form-actions">
                            {editingId && (
                                <button type="button" className="investment-cancel" onClick={resetForm}>
                                    Cancelar
                                </button>
                            )}
                            <button type="submit" className="investment-submit" disabled={submitting}>
                                {submitting ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar"}
                            </button>
                        </div>
                    </div>

                    {error && <p className="investment-error">{error}</p>}
                </form>
            </header>

            {loading ? (
                <p className="investments-empty">Carregando...</p>
            ) : investments.length === 0 ? (
                <div className="investments-empty-state">
                    <p>Nenhum investimento cadastrado ainda.</p>
                    <span>Adicione o primeiro investimento ali em cima.</span>
                </div>
            ) : (
                <>
                    <div className="investment-summary">
                        <div className="investment-summary-card">
                            <span>Total aplicado</span>
                            <strong>{formatCurrency(totals.invested)}</strong>
                        </div>
                        <div className="investment-summary-card">
                            <span>Valor atual</span>
                            <strong>{formatCurrency(totals.current)}</strong>
                        </div>
                        <div className="investment-summary-card">
                            <span>Rendimento</span>
                            <strong className={returnClass(totals.gain)}>
                                {formatCurrency(totals.gain)}
                                <small>{formatPercent(totals.gainPercent)}</small>
                            </strong>
                        </div>
                    </div>

                    <section className="investment-card">
                        <h2 className="investment-card-title">Distribuição por tipo</h2>
                        <div className="investment-bars">
                            {allocation.map((item) => {
                                const share = totals.current > 0 ? (item.value / totals.current) * 100 : 0;
                                return (
                                    <div className="investment-bar" key={item.key}>
                                        <div className="investment-bar-head">
                                            <span>{item.label}</span>
                                            <span className="investment-bar-figures">
                                                {formatCurrency(item.value)}
                                                <span className="investment-bar-share"> · {Math.round(share)}%</span>
                                            </span>
                                        </div>
                                        <div className="investment-bar-track">
                                            <div className="investment-bar-fill" style={{ width: `${Math.max(share, 2)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <div className="investment-table-wrap">
                        <table className="investment-table">
                            <thead>
                                <tr>
                                    <th>Investimento</th>
                                    <th>Tipo</th>
                                    <th className="investment-num">Aplicado</th>
                                    <th className="investment-num">Atual</th>
                                    <th className="investment-num">Rendimento</th>
                                    <th aria-label="Ações" />
                                </tr>
                            </thead>
                            <tbody>
                                {investments.map((investment) => {
                                    const invested = Number(investment.investedAmount);
                                    const current = Number(investment.currentValue);
                                    const gain = current - invested;
                                    return (
                                        <tr key={investment.id} className={editingId === investment.id ? "editing" : ""}>
                                            <td>
                                                <span className="investment-name">{investment.name}</span>
                                                {investment.institution && (
                                                    <span className="investment-institution">{investment.institution}</span>
                                                )}
                                            </td>
                                            <td>{INVESTMENT_TYPE_LABELS[investment.type] ?? investment.type}</td>
                                            <td className="investment-num">{formatCurrency(invested)}</td>
                                            <td className="investment-num">{formatCurrency(current)}</td>
                                            <td className={`investment-num ${returnClass(gain)}`}>
                                                {formatCurrency(gain)}
                                                <small>{formatPercent(returnPercent(invested, current))}</small>
                                            </td>
                                            <td className="investment-row-actions">
                                                <button type="button" onClick={() => startEditing(investment)}>
                                                    editar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="investment-row-danger"
                                                    onClick={() => handleDelete(investment)}
                                                >
                                                    excluir
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

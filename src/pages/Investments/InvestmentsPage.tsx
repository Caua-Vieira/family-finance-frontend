import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import "./InvestmentsPage.css";
import { investmentsApi } from "../../api/investments";
import {
    INVESTMENT_TYPE_LABELS,
    type Investment,
    type InvestmentIndexer,
    type InvestmentType,
} from "../../types/investment";
import { centsFromInput, formatCentsInput } from "../../utils/currency";
import { todayIso } from "../../utils/date";
import { useToast } from "../../components/Toast/useToast";
import { useConfirm } from "../../components/ConfirmDialog/useConfirm";
import { Spinner } from "../../components/Spinner/Spinner";

const INVESTMENT_TYPES = Object.keys(INVESTMENT_TYPE_LABELS) as InvestmentType[];

function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number) {
    return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatRate(value: number) {
    return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function returnPercent(invested: number, current: number) {
    return invested > 0 ? ((current - invested) / invested) * 100 : 0;
}

function returnClass(value: number) {
    if (Math.abs(value) < 0.005) return "";
    return value > 0 ? "positive" : "negative";
}

function yieldLabel(investment: Investment) {
    if (!investment.indexer || investment.rate == null) return null;
    return investment.indexer === "cdi"
        ? `${formatRate(investment.rate)}% do CDI`
        : `Prefixado ${formatRate(investment.rate)}% a.a.`;
}

export function InvestmentsPage() {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [type, setType] = useState<InvestmentType>("fixed_income");
    const [institution, setInstitution] = useState("");
    const [indexer, setIndexer] = useState<InvestmentIndexer | "">("cdi");
    const [rate, setRate] = useState("");
    const [investedCents, setInvestedCents] = useState(0);
    const [balanceCents, setBalanceCents] = useState(0);
    const [referenceDate, setReferenceDate] = useState(todayIso);
    const [contributionCents, setContributionCents] = useState(0);
    const [contributionDay, setContributionDay] = useState("");
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
        const invested = investments.reduce((sum, i) => sum + i.estimate.invested, 0);
        const current = investments.reduce((sum, i) => sum + i.estimate.value, 0);
        const monthly = investments.reduce((sum, i) => sum + Number(i.monthlyContribution), 0);
        return { invested, current, monthly, gain: current - invested, gainPercent: returnPercent(invested, current) };
    }, [investments]);

    const allocation = useMemo(() => {
        const byType = new Map<InvestmentType, number>();
        for (const i of investments) {
            byType.set(i.type, (byType.get(i.type) ?? 0) + i.estimate.value);
        }
        return [...byType.entries()]
            .map(([key, value]) => ({ key, label: INVESTMENT_TYPE_LABELS[key] ?? key, value }))
            .filter((item) => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [investments]);

    const ratesUntil = investments
        .map((i) => i.estimate.ratesUntil)
        .filter((d): d is string => d != null)
        .sort()
        .at(-1);
    const ratesUnavailable = investments.some((i) => i.estimate.yieldUnavailable);

    const isFixedIncome = type === "fixed_income";
    const hasIndexer = isFixedIncome && indexer !== "";

    function resetForm() {
        setEditingId(null);
        setName("");
        setType("fixed_income");
        setInstitution("");
        setIndexer("cdi");
        setRate("");
        setInvestedCents(0);
        setBalanceCents(0);
        setReferenceDate(todayIso());
        setContributionCents(0);
        setContributionDay("");
    }

    // Na edição o formulário vem com o valor estimado de hoje: salvar sem mexer
    // só "atualiza o ponto de partida", sem contar aportes duas vezes.
    function startEditing(investment: Investment) {
        setEditingId(investment.id);
        setName(investment.name);
        setType(investment.type);
        setInstitution(investment.institution ?? "");
        setIndexer(investment.indexer ?? "");
        setRate(investment.rate != null ? String(Number(investment.rate)) : "");
        setInvestedCents(Math.round(investment.estimate.invested * 100));
        setBalanceCents(Math.round(investment.estimate.value * 100));
        setReferenceDate(todayIso());
        setContributionCents(Math.round(Number(investment.monthlyContribution) * 100));
        setContributionDay(investment.contributionDay != null ? String(investment.contributionDay) : "");
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
            currentValue: balanceCents / 100,
            referenceDate,
            indexer: hasIndexer ? (indexer as InvestmentIndexer) : null,
            rate: hasIndexer ? Number(rate.replace(",", ".")) : null,
            monthlyContribution: contributionCents / 100,
            contributionDay: contributionCents > 0 ? Number(contributionDay) : null,
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
                                placeholder="Ex: CDB Banco Inter, Tesouro Selic..."
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
                                placeholder="Ex: Nubank, Inter..."
                            />
                        </label>
                    </div>

                    {isFixedIncome && (
                        <div className="investment-form-row">
                            <label className="investment-field">
                                <span>Rendimento</span>
                                <select
                                    value={indexer}
                                    onChange={(e) => setIndexer(e.target.value as InvestmentIndexer | "")}
                                >
                                    <option value="cdi">% do CDI</option>
                                    <option value="prefixed">Prefixado (% ao ano)</option>
                                    <option value="">Manual (sem cálculo automático)</option>
                                </select>
                            </label>

                            {hasIndexer && (
                                <label className="investment-field">
                                    <span>Taxa</span>
                                    <div className="investment-amount-wrap">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={rate}
                                            onChange={(e) => setRate(e.target.value.replace(/[^\d,.]/g, ""))}
                                            placeholder={indexer === "cdi" ? "Ex: 110" : "Ex: 12,5"}
                                            required
                                        />
                                        <span>{indexer === "cdi" ? "% do CDI" : "% a.a."}</span>
                                    </div>
                                </label>
                            )}
                        </div>
                    )}

                    <div className="investment-form-row">
                        <label className="investment-field">
                            <span>Total aplicado</span>
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
                            <span>Saldo atual</span>
                            <div className="investment-amount-wrap">
                                <span>R$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formatCentsInput(balanceCents)}
                                    onChange={(e) => setBalanceCents(centsFromInput(e.target.value))}
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                        </label>

                        <label className="investment-field">
                            <span>Saldo em</span>
                            <input
                                type="date"
                                value={referenceDate}
                                max={todayIso()}
                                onChange={(e) => setReferenceDate(e.target.value)}
                                required
                            />
                        </label>
                    </div>

                    <div className="investment-form-row">
                        <label className="investment-field">
                            <span>Aporte mensal (opcional)</span>
                            <div className="investment-amount-wrap">
                                <span>R$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formatCentsInput(contributionCents)}
                                    onChange={(e) => setContributionCents(centsFromInput(e.target.value))}
                                    placeholder="0,00"
                                />
                            </div>
                        </label>

                        {contributionCents > 0 && (
                            <label className="investment-field investment-field-small">
                                <span>Dia do aporte</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={contributionDay}
                                    onChange={(e) => setContributionDay(e.target.value)}
                                    placeholder="Ex: 5"
                                    required
                                />
                            </label>
                        )}

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

                    <p className="investment-hint">
                        {editingId
                            ? "O saldo e o total aplicado já vêm atualizados até hoje. Se quiser, troque pelo valor que aparece no app do banco."
                            : "Informe o saldo de hoje (ou de uma data passada). A partir dele o sistema soma os aportes mensais e, na renda fixa, aplica o CDI de cada dia útil."}
                    </p>

                    {error && <p className="investment-error">{error}</p>}
                </form>
            </header>

            {loading ? (
                <p className="investments-empty loading-inline"><Spinner /> Carregando...</p>
            ) : investments.length === 0 ? (
                <div className="investments-empty-state">
                    <p>Nenhum investimento cadastrado ainda.</p>
                    <span>Adicione o primeiro investimento ali em cima.</span>
                </div>
            ) : (
                <>
                    {ratesUnavailable && (
                        <p className="investment-warning">
                            Não foi possível consultar o CDI no Banco Central agora. Os valores abaixo estão sem o
                            rendimento automático — tente recarregar em alguns minutos.
                        </p>
                    )}

                    <div className="investment-summary">
                        <div className="investment-summary-card">
                            <span>Total aplicado</span>
                            <strong>{formatCurrency(totals.invested)}</strong>
                        </div>
                        <div className="investment-summary-card">
                            <span>Valor atual (estimado)</span>
                            <strong>{formatCurrency(totals.current)}</strong>
                        </div>
                        <div className="investment-summary-card">
                            <span>Rendimento</span>
                            <strong className={returnClass(totals.gain)}>
                                {formatCurrency(totals.gain)}
                                <small>{formatPercent(totals.gainPercent)}</small>
                            </strong>
                        </div>
                        <div className="investment-summary-card">
                            <span>Aporte mensal</span>
                            <strong>{formatCurrency(totals.monthly)}</strong>
                        </div>
                    </div>

                    {ratesUntil && (
                        <p className="investment-hint">
                            Renda fixa corrigida pelo CDI do Banco Central até {formatDate(ratesUntil)}. Valor estimado,
                            sem desconto de IR/IOF.
                        </p>
                    )}

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
                                    const { invested, value } = investment.estimate;
                                    const gain = value - invested;
                                    const label = yieldLabel(investment);
                                    const monthly = Number(investment.monthlyContribution);
                                    return (
                                        <tr key={investment.id} className={editingId === investment.id ? "editing" : ""}>
                                            <td>
                                                <span className="investment-name">{investment.name}</span>
                                                <span className="investment-meta">
                                                    {[
                                                        investment.institution,
                                                        label,
                                                        monthly > 0
                                                            ? `+ ${formatCurrency(monthly)}/mês · dia ${investment.contributionDay}`
                                                            : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </span>
                                            </td>
                                            <td>{INVESTMENT_TYPE_LABELS[investment.type] ?? investment.type}</td>
                                            <td className="investment-num">{formatCurrency(invested)}</td>
                                            <td className="investment-num">
                                                {formatCurrency(value)}
                                                {investment.referenceDate && (
                                                    <small className="investment-muted">
                                                        saldo de {formatDate(investment.referenceDate)}
                                                    </small>
                                                )}
                                            </td>
                                            <td className={`investment-num ${returnClass(gain)}`}>
                                                {formatCurrency(gain)}
                                                <small>{formatPercent(returnPercent(invested, value))}</small>
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

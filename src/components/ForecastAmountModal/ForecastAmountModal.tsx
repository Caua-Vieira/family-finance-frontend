import { useEffect, useState, type SubmitEvent } from "react";
import type { Transaction } from "../../types/transaction";
import { recurringApi } from "../../api/recurring";
import { centsFromInput, formatCentsInput } from "../../utils/currency";
import { useToast } from "../Toast/useToast";
import "../EditTransactionModal/EditTransactionModal.css";
import "./ForecastAmountModal.css";

interface ForecastAmountModalProps {
    // Lançamento previsto (isProjected) cujo valor do mês será ajustado
    transaction: Transaction;
    onClose: () => void;
    onSaved: () => void | Promise<void>;
}

function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthOf(date: string) {
    const [year, month] = date.slice(0, 10).split("-").map(Number);
    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    });
    return { year, month, label };
}

/** Ajusta o valor previsto de uma recorrência em um mês futuro (ex.: conta de luz), sem mudar a regra. */
export function ForecastAmountModal({ transaction, onClose, onSaved }: ForecastAmountModalProps) {
    const [amountCents, setAmountCents] = useState(() => Math.round(Number(transaction.amount) * 100));
    const [saving, setSaving] = useState(false);

    const toast = useToast();
    const { year, month, label } = monthOf(transaction.date);
    const ruleAmount = transaction.ruleAmount ?? transaction.amount;

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    async function run(action: () => Promise<void>, message: string) {
        setSaving(true);
        try {
            await action();
            toast.success(message);
            await onSaved();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!transaction.recurringTransactionId || amountCents <= 0) return;

        const id = transaction.recurringTransactionId;
        await run(
            () => recurringApi.setForecastAmount(id, year, month, amountCents / 100),
            `Valor previsto de ${label} atualizado.`
        );
    }

    async function handleReset() {
        if (!transaction.recurringTransactionId) return;

        const id = transaction.recurringTransactionId;
        await run(
            () => recurringApi.resetForecastAmount(id, year, month),
            `${label.charAt(0).toUpperCase() + label.slice(1)} voltou ao valor da recorrência.`
        );
    }

    return (
        <div className="edit-tx-overlay" onMouseDown={onClose}>
            <div
                className="edit-tx-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="forecast-title"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="edit-tx-header">
                    <div>
                        <h2 id="forecast-title">Valor previsto</h2>
                        <p>
                            {transaction.description} · {label}
                        </p>
                    </div>
                    <button type="button" className="edit-tx-close" onClick={onClose} aria-label="Fechar">
                        ×
                    </button>
                </header>

                <form className="edit-tx-form" onSubmit={handleSubmit}>
                    <label className="edit-tx-field">
                        <span>Valor previsto para {label}</span>
                        <div className="edit-tx-amount-wrap">
                            <span>R$</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={formatCentsInput(amountCents)}
                                onChange={(e) => setAmountCents(centsFromInput(e.target.value))}
                                placeholder="0,00"
                                autoFocus
                                required
                            />
                        </div>
                    </label>

                    <p className="edit-tx-hint">
                        Muda só este mês. Os outros meses continuam com o valor da recorrência ({formatCurrency(ruleAmount)}).
                        Quando o mês chegar, o lançamento já é gerado com o valor previsto.
                    </p>

                    <div className="edit-tx-actions forecast-actions">
                        {transaction.amountAdjusted && (
                            <button
                                type="button"
                                className="edit-tx-btn ghost forecast-reset"
                                onClick={handleReset}
                                disabled={saving}
                            >
                                Voltar ao valor da recorrência
                            </button>
                        )}
                        <button type="button" className="edit-tx-btn ghost" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="edit-tx-btn" disabled={saving || amountCents <= 0}>
                            {saving ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

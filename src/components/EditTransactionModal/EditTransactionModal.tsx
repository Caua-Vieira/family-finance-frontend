import { useEffect, useState, type SubmitEvent } from "react";
import type { Transaction, TransactionType } from "../../types/transaction";
import type { Category } from "../../types/category";
import type { Card } from "../../types/card";
import { transactionsApi } from "../../api/transactions";
import { centsFromInput, formatCentsInput } from "../../utils/currency";
import { useToast } from "../Toast/useToast";
import "./EditTransactionModal.css";

interface EditTransactionModalProps {
    transaction: Transaction | null;
    categories: Category[];
    cards: Card[];
    onClose: () => void;
    onSaved: () => void | Promise<void>;
}

export function EditTransactionModal({ transaction, categories, cards, onClose, onSaved }: EditTransactionModalProps) {
    const [type, setType] = useState<TransactionType>("expense");
    const [amountCents, setAmountCents] = useState(0);
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [cardId, setCardId] = useState("");
    const [saving, setSaving] = useState(false);

    const toast = useToast();

    useEffect(() => {
        if (!transaction) return;
        setType(transaction.type);
        setAmountCents(Math.round(Number(transaction.amount) * 100));
        setDescription(transaction.description);
        setDate(transaction.date.slice(0, 10));
        setCategoryId(transaction.categoryId != null ? String(transaction.categoryId) : "");
        setCardId(transaction.cardId != null ? String(transaction.cardId) : "");
    }, [transaction]);

    useEffect(() => {
        if (!transaction) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [transaction, onClose]);

    if (!transaction) return null;

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!transaction) return;

        setSaving(true);
        try {
            await transactionsApi.update(transaction.id, {
                type,
                amount: amountCents / 100,
                description,
                date,
                categoryId: categoryId || null,
                cardId: type === "expense" && cardId ? Number(cardId) : null,
            });
            toast.success("Lançamento atualizado.");
            await onSaved();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="edit-tx-overlay" onMouseDown={onClose}>
            <div
                className="edit-tx-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-tx-title"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="edit-tx-header">
                    <div>
                        <h2 id="edit-tx-title">Editar lançamento</h2>
                        <p>Atualize valor, descrição, data, categoria ou cartão.</p>
                    </div>
                    <button type="button" className="edit-tx-close" onClick={onClose} aria-label="Fechar">
                        ×
                    </button>
                </header>

                <form className="edit-tx-form" onSubmit={handleSubmit}>
                    <div className="edit-tx-type-toggle">
                        <button
                            type="button"
                            className={type === "expense" ? "edit-tx-type-btn active-expense" : "edit-tx-type-btn"}
                            onClick={() => setType("expense")}
                        >
                            Despesa
                        </button>
                        <button
                            type="button"
                            className={type === "income" ? "edit-tx-type-btn active-income" : "edit-tx-type-btn"}
                            onClick={() => setType("income")}
                        >
                            Receita
                        </button>
                    </div>

                    <label className="edit-tx-field">
                        <span>Descrição</span>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </label>

                    <div className="edit-tx-field-row">
                        <label className="edit-tx-field">
                            <span>Valor</span>
                            <div className="edit-tx-amount-wrap">
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

                        <label className="edit-tx-field">
                            <span>Data</span>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                        </label>
                    </div>

                    <div className="edit-tx-field-row">
                        <label className="edit-tx-field">
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
                            <label className="edit-tx-field">
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
                    </div>

                    {transaction.recurringTransactionId && (
                        <p className="edit-tx-hint">
                            Este lançamento veio de uma recorrência. Editar aqui muda só ele — a regra continua igual.
                        </p>
                    )}

                    <div className="edit-tx-actions">
                        <button type="button" className="edit-tx-btn ghost" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="edit-tx-btn" disabled={saving}>
                            {saving ? "Salvando..." : "Salvar alterações"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

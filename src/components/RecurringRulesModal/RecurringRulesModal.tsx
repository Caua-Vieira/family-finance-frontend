import { useEffect, useState, type SubmitEvent } from "react";
import type { RecurringTransaction } from "../../types/recurring-transaction";
import type { Category } from "../../types/category";
import type { Card } from "../../types/card";
import { recurringApi } from "../../api/recurring";
import { centsFromInput, formatCentsInput } from "../../utils/currency";
import { useToast } from "../Toast/useToast";
import { useConfirm } from "../ConfirmDialog/useConfirm";
import "./RecurringRulesModal.css";

interface RecurringRulesModalProps {
    open: boolean;
    onClose: () => void;
    rules: RecurringTransaction[];
    categories: Category[];
    cards: Card[];
    onChanged: () => void | Promise<void>;
}

function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface EditState {
    description: string;
    amountCents: number;
    dayOfMonth: string;
    categoryId: string;
    cardId: string;
    endDate: string;
}

export function RecurringRulesModal({
    open,
    onClose,
    rules,
    categories,
    cards,
    onChanged,
}: RecurringRulesModalProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [edit, setEdit] = useState<EditState | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const toast = useToast();
    const confirm = useConfirm();

    useEffect(() => {
        if (!open) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    function categoryLabel(id: string | null) {
        if (!id) return "Sem categoria";
        const category = categories.find((c) => c.id === id);
        if (!category) return "Sem categoria";
        if (category.parentId) {
            const parent = categories.find((c) => c.id === category.parentId);
            return parent ? `${parent.name} · ${category.name}` : category.name;
        }
        return category.name;
    }

    function cardLabel(id: number | null) {
        if (!id) return null;
        return cards.find((c) => c.id === id)?.name ?? null;
    }

    function startEdit(rule: RecurringTransaction) {
        setEditingId(rule.id);
        setEdit({
            description: rule.description,
            amountCents: Math.round(Number(rule.amount) * 100),
            dayOfMonth: String(rule.dayOfMonth),
            categoryId: rule.categoryId != null ? String(rule.categoryId) : "",
            cardId: rule.cardId ? String(rule.cardId) : "",
            endDate: rule.endDate ? rule.endDate.slice(0, 10) : "",
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEdit(null);
    }

    async function handleSaveEdit(e: SubmitEvent<HTMLFormElement>, rule: RecurringTransaction) {
        e.preventDefault();
        if (!edit) return;

        const day = Number(edit.dayOfMonth);
        if (!Number.isInteger(day) || day < 1 || day > 31) {
            toast.error("O dia do mês deve ser um número entre 1 e 31.");
            return;
        }

        setBusyId(rule.id);
        try {
            await recurringApi.update(rule.id, {
                description: edit.description,
                amount: edit.amountCents / 100,
                dayOfMonth: day,
                categoryId: edit.categoryId || null,
                cardId: rule.type === "expense" && edit.cardId ? Number(edit.cardId) : null,
                endDate: edit.endDate || null,
            });
            toast.success("Regra atualizada.");
            cancelEdit();
            await onChanged();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusyId(null);
        }
    }

    async function handleToggleActive(rule: RecurringTransaction) {
        if (rule.active) {
            const ok = await confirm({
                title: "Parar recorrência",
                message:
                    "A regra deixa de gerar novos lançamentos a partir do próximo mês. Os lançamentos já gerados não são afetados.",
                confirmLabel: "Parar",
                danger: true,
            });
            if (!ok) return;
        }

        setBusyId(rule.id);
        try {
            await recurringApi.update(rule.id, { active: !rule.active });
            toast.success(rule.active ? "Recorrência pausada." : "Recorrência reativada.");
            await onChanged();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="recurring-modal-overlay" onMouseDown={onClose}>
            <div
                className="recurring-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="recurring-modal-title"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="recurring-modal-header">
                    <div>
                        <h2 id="recurring-modal-title">Recorrências</h2>
                        <p>Regras que geram lançamentos automaticamente todo mês.</p>
                    </div>
                    <button type="button" className="recurring-modal-close" onClick={onClose} aria-label="Fechar">
                        ×
                    </button>
                </header>

                <div className="recurring-modal-body">
                    {rules.length === 0 ? (
                        <div className="recurring-modal-empty">
                            <p>Nenhuma recorrência cadastrada.</p>
                            <span>Marque "Repetir todo mês" ao lançar uma receita ou despesa.</span>
                        </div>
                    ) : (
                        rules.map((rule) => {
                            const isEditing = editingId === rule.id;
                            const card = cardLabel(rule.cardId);

                            return (
                                <div
                                    className={rule.active ? "recurring-rule" : "recurring-rule inactive"}
                                    key={rule.id}
                                >
                                    <div className="recurring-rule-top">
                                        <span
                                            className={
                                                rule.type === "income"
                                                    ? "recurring-rule-dot income"
                                                    : "recurring-rule-dot expense"
                                            }
                                            aria-hidden="true"
                                        />
                                        <div className="recurring-rule-info">
                                            <span className="recurring-rule-description">{rule.description}</span>
                                            <span className="recurring-rule-meta">
                                                {formatCurrency(rule.amount)} · todo dia {rule.dayOfMonth} ·{" "}
                                                {categoryLabel(rule.categoryId)}
                                                {card ? ` · ${card}` : ""}
                                                {rule.endDate ? ` · até ${rule.endDate.slice(0, 10)}` : ""}
                                            </span>
                                        </div>
                                        {!rule.active && <span className="recurring-rule-badge">Pausada</span>}
                                    </div>

                                    {isEditing && edit ? (
                                        <form
                                            className="recurring-rule-edit"
                                            onSubmit={(e) => handleSaveEdit(e, rule)}
                                        >
                                            <label className="recurring-field">
                                                <span>Descrição</span>
                                                <input
                                                    type="text"
                                                    value={edit.description}
                                                    onChange={(e) =>
                                                        setEdit({ ...edit, description: e.target.value })
                                                    }
                                                    required
                                                />
                                            </label>

                                            <div className="recurring-field-row">
                                                <label className="recurring-field">
                                                    <span>Valor</span>
                                                    <div className="recurring-amount-wrap">
                                                        <span>R$</span>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={formatCentsInput(edit.amountCents)}
                                                            onChange={(e) =>
                                                                setEdit({
                                                                    ...edit,
                                                                    amountCents: centsFromInput(e.target.value),
                                                                })
                                                            }
                                                            placeholder="0,00"
                                                            required
                                                        />
                                                    </div>
                                                </label>

                                                <label className="recurring-field">
                                                    <span>Dia do mês</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={31}
                                                        value={edit.dayOfMonth}
                                                        onChange={(e) =>
                                                            setEdit({ ...edit, dayOfMonth: e.target.value })
                                                        }
                                                        required
                                                    />
                                                </label>
                                            </div>

                                            <div className="recurring-field-row">
                                                <label className="recurring-field">
                                                    <span>Categoria</span>
                                                    <select
                                                        value={edit.categoryId}
                                                        onChange={(e) =>
                                                            setEdit({ ...edit, categoryId: e.target.value })
                                                        }
                                                    >
                                                        <option value="">Sem categoria</option>
                                                        {categories.map((c) => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.parentId ? `— ${c.name}` : c.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>

                                                {rule.type === "expense" && (
                                                    <label className="recurring-field">
                                                        <span>Cartão</span>
                                                        <select
                                                            value={edit.cardId}
                                                            onChange={(e) =>
                                                                setEdit({ ...edit, cardId: e.target.value })
                                                            }
                                                        >
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

                                            <label className="recurring-field">
                                                <span>Encerrar em (opcional)</span>
                                                <input
                                                    type="date"
                                                    value={edit.endDate}
                                                    onChange={(e) =>
                                                        setEdit({ ...edit, endDate: e.target.value })
                                                    }
                                                />
                                            </label>

                                            <div className="recurring-rule-edit-actions">
                                                <button
                                                    type="button"
                                                    className="recurring-btn ghost"
                                                    onClick={cancelEdit}
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="recurring-btn"
                                                    disabled={busyId === rule.id}
                                                >
                                                    {busyId === rule.id ? "Salvando..." : "Salvar"}
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="recurring-rule-actions">
                                            <button
                                                type="button"
                                                className="recurring-btn ghost"
                                                onClick={() => startEdit(rule)}
                                                disabled={busyId === rule.id}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                className={
                                                    rule.active
                                                        ? "recurring-btn danger-text"
                                                        : "recurring-btn"
                                                }
                                                onClick={() => handleToggleActive(rule)}
                                                disabled={busyId === rule.id}
                                            >
                                                {rule.active ? "Parar recorrência" : "Reativar"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

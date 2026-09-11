import { useEffect, useState, type SubmitEvent } from "react";
import type { StatementEntry } from "../../types/statement-entry";
import type { Category } from "../../types/category";
import { statementEntriesApi } from "../../api/statementEntries";
import { centsFromInput, formatCentsInput } from "../../utils/currency";
import { useToast } from "../Toast/useToast";
import "./EditStatementEntryModal.css";

interface EditStatementEntryModalProps {
    entry: StatementEntry | null;
    categories: Category[];
    onClose: () => void;
    onSaved: () => void | Promise<void>;
}

export function EditStatementEntryModal({ entry, categories, onClose, onSaved }: EditStatementEntryModalProps) {
    const [date, setDate] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [description, setDescription] = useState("");
    const [amountCents, setAmountCents] = useState(0);
    const [saving, setSaving] = useState(false);

    const toast = useToast();

    const subcategories = categories
        .filter((c) => c.parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

    function subcategoryLabel(c: Category) {
        const parent = categories.find((p) => p.id === c.parentId);
        return parent ? `${parent.name} · ${c.name}` : c.name;
    }

    useEffect(() => {
        if (!entry) return;
        setDate(entry.date.slice(0, 10));
        setCategoryId(entry.categoryId != null ? String(entry.categoryId) : "");
        setDescription(entry.description);
        setAmountCents(Math.round(Number(entry.amount) * 100));
    }, [entry]);

    useEffect(() => {
        if (!entry) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [entry, onClose]);

    if (!entry) return null;

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!entry) return;

        setSaving(true);
        try {
            await statementEntriesApi.update(entry.id, {
                date,
                categoryId: categoryId || null,
                description,
                amount: amountCents / 100,
            });
            toast.success("Item do extrato atualizado.");
            await onSaved();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="edit-entry-overlay" onMouseDown={onClose}>
            <div
                className="edit-entry-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-entry-title"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="edit-entry-header">
                    <div>
                        <h2 id="edit-entry-title">Editar item do extrato</h2>
                        <p>Atualize data, subcategoria, descrição ou valor.</p>
                    </div>
                    <button type="button" className="edit-entry-close" onClick={onClose} aria-label="Fechar">
                        ×
                    </button>
                </header>

                <form className="edit-entry-form" onSubmit={handleSubmit}>
                    <div className="edit-entry-field-row">
                        <label className="edit-entry-field">
                            <span>Data</span>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                        </label>

                        <label className="edit-entry-field">
                            <span>Valor</span>
                            <div className="edit-entry-amount-wrap">
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
                    </div>

                    <label className="edit-entry-field">
                        <span>Subcategoria</span>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">Sem subcategoria</option>
                            {subcategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {subcategoryLabel(c)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="edit-entry-field">
                        <span>Descrição</span>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </label>

                    <div className="edit-entry-actions">
                        <button type="button" className="edit-entry-btn ghost" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="edit-entry-btn" disabled={saving}>
                            {saving ? "Salvando..." : "Salvar alterações"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

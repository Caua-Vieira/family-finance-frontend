import { useEffect, useState, type SubmitEvent } from "react";
import type { Category } from "../../types/category";
import { categoriesApi } from "../../api/categories";
import { useToast } from "../Toast/useToast";
import "./EditCategoryModal.css";

interface EditCategoryModalProps {
    category: Category | null;
    mainCategories: Category[];
    onClose: () => void;
    onSaved: () => void | Promise<void>;
}

export function EditCategoryModal({ category, mainCategories, onClose, onSaved }: EditCategoryModalProps) {
    const [name, setName] = useState("");
    const [parentId, setParentId] = useState("");
    const [saving, setSaving] = useState(false);

    const toast = useToast();
    const isSubcategory = Boolean(category?.parentId);

    useEffect(() => {
        if (!category) return;
        setName(category.name);
        setParentId(category.parentId ?? "");
    }, [category]);

    useEffect(() => {
        if (!category) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [category, onClose]);

    if (!category) return null;

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!category) return;

        setSaving(true);
        try {
            await categoriesApi.update(category.id, {
                name,
                parentId: isSubcategory ? parentId : null,
            });
            toast.success(isSubcategory ? "Subcategoria atualizada." : "Categoria atualizada.");
            await onSaved();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="edit-category-overlay" onMouseDown={onClose}>
            <div
                className="edit-category-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-category-title"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="edit-category-header">
                    <div>
                        <h2 id="edit-category-title">{isSubcategory ? "Editar subcategoria" : "Editar categoria"}</h2>
                        <p>{isSubcategory ? "Atualize o nome ou a categoria principal." : "Atualize o nome da categoria."}</p>
                    </div>
                    <button type="button" className="edit-category-close" onClick={onClose} aria-label="Fechar">
                        ×
                    </button>
                </header>

                <form className="edit-category-form" onSubmit={handleSubmit}>
                    <label className="edit-category-field">
                        <span>Nome</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </label>

                    {isSubcategory && (
                        <label className="edit-category-field">
                            <span>Categoria principal</span>
                            <select value={parentId} onChange={(e) => setParentId(e.target.value)} required>
                                {mainCategories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <div className="edit-category-actions">
                        <button type="button" className="edit-category-btn ghost" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="edit-category-btn" disabled={saving}>
                            {saving ? "Salvando..." : "Salvar alterações"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

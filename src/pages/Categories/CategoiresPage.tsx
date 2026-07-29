import { useEffect, useState, type SubmitEvent } from "react";
import { categoriesApi } from "../../api/categories";
import "./CategoriesPage.css";
import type { Category } from "../../types/category";

export function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [isSubcategory, setIsSubcategory] = useState(false);
    const [parentId, setParentCategoryId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const mainCategories = categories.filter((c) => !c.parentId);

    function subcategoriesOf(parentId: string) {
        return categories.filter((c) => c.parentId === parentId);
    }

    async function loadCategories() {
        try {
            setLoading(true);
            const data = await categoriesApi.list();
            setCategories(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCategories();
    }, []);

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await categoriesApi.create({
                name,
                parentId: isSubcategory ? parentId : null,
            });

            setName("");
            setIsSubcategory(false);
            setParentCategoryId("");
            await loadCategories();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Excluir esta categoria?")) return;

        try {
            await categoriesApi.remove(id);
            await loadCategories();
        } catch (err) {
            setError((err as Error).message);
        }
    }

    return (
        <div className="categories-page">
            <header className="categories-header">
                <div className="categories-heading">
                    <h1>Categorias</h1>
                    <p>Organize as categorias principais e as subcategorias da família.</p>
                </div>

                <form onSubmit={handleSubmit} className="category-form">
                    <label className="category-field">
                        <span>Nome</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Água, Uber, Mercado..."
                            required
                        />
                    </label>

                    <label className="category-checkbox">
                        <input
                            type="checkbox"
                            checked={isSubcategory}
                            onChange={(e) => setIsSubcategory(e.target.checked)}
                        />
                        <span>É subcategoria</span>
                    </label>

                    {isSubcategory && (
                        <label className="category-field">
                            <span>Categoria principal</span>
                            <select
                                value={parentId}
                                onChange={(e) => setParentCategoryId(e.target.value)}
                                required
                            >
                                <option value="">Selecione...</option>
                                {mainCategories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <button type="submit" className="category-submit" disabled={submitting}>
                        {submitting ? "Salvando..." : "Adicionar"}
                    </button>
                </form>

                {error && <p className="category-error">{error}</p>}
            </header>

            {loading ? (
                <p className="categories-empty">Carregando...</p>
            ) : mainCategories.length === 0 ? (
                <div className="categories-empty-state">
                    <p>Nenhuma categoria cadastrada ainda.</p>
                    <span>Adicione a primeira categoria principal ali em cima.</span>
                </div>
            ) : (
                <div className="category-grid">
                    {mainCategories.map((main) => {
                        const subs = subcategoriesOf(main.id);

                        return (
                            <article className="category-card" key={main.id}>
                                <div className="category-card-header">
                                    <div className="category-card-title">
                                        <span className="category-main-name">{main.name}</span>
                                        <span className="category-count">
                                            {subs.length} subcategoria{subs.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="category-delete"
                                        onClick={() => handleDelete(main.id)}
                                    >
                                        Excluir
                                    </button>
                                </div>

                                <div className="category-sub-list">
                                    {subs.length > 0 ? (
                                        subs.map((sub) => (
                                            <div key={sub.id} className="category-sub-row">
                                                <span className="category-sub-dot" aria-hidden="true" />
                                                <span className="category-sub-name">{sub.name}</span>
                                                <button
                                                    type="button"
                                                    className="category-delete"
                                                    onClick={() => handleDelete(sub.id)}
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="category-sub-empty">Sem subcategorias</p>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
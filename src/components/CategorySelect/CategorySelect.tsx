import type { Category } from "../../types/category";

interface CategorySelectProps {
    categories: Category[];
    value: string;
    onChange: (categoryId: string) => void;
    fieldClassName: string;
    noneLabel?: string;
}

export function CategorySelect({
    categories,
    value,
    onChange,
    fieldClassName,
    noneLabel = "Sem categoria",
}: CategorySelectProps) {
    const topCategories = categories
        .filter((c) => !c.parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

    const selected = categories.find((c) => String(c.id) === String(value)) ?? null;
    const selectedTopId = selected ? String(selected.parentId ?? selected.id) : "";

    const subcategories = categories
        .filter((c) => c.parentId != null && String(c.parentId) === selectedTopId)
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <>
            <label className={fieldClassName}>
                <span>Categoria</span>
                <select value={selectedTopId} onChange={(e) => onChange(e.target.value)}>
                    <option value="">{noneLabel}</option>
                    {topCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </label>

            {selectedTopId && subcategories.length > 0 && (
                <label className={fieldClassName}>
                    <span>Subcategoria</span>
                    <select
                        value={value === selectedTopId ? "" : value}
                        onChange={(e) => onChange(e.target.value || selectedTopId)}
                    >
                        <option value="">Sem subcategoria</option>
                        {subcategories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>
            )}
        </>
    );
}

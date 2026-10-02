import { useEffect, useState, type DragEvent } from "react";
import type { Card } from "../../types/card";
import type { Category } from "../../types/category";
import type { StatementImportPreviewRow } from "../../types/statement-entry";
import { statementEntriesApi } from "../../api/statementEntries";
import { useToast } from "../Toast/useToast";
import "./ImportStatementModal.css";

// Montado só enquanto está aberto: cada abertura começa com estado limpo.
interface ImportStatementModalProps {
    card: Card;
    categories: Category[];
    onClose: () => void;
    onImported: (importedDates: string[]) => void | Promise<void>;
}

interface ReviewRow extends StatementImportPreviewRow {
    selected: boolean;
    categoryId: string;
}

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function ImportStatementModal({ card, categories, onClose, onImported }: ImportStatementModalProps) {
    const [rows, setRows] = useState<ReviewRow[] | null>(null);
    const [skipped, setSkipped] = useState<string[]>([]);
    const [fileName, setFileName] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toast = useToast();

    const subcategories = categories
        .filter((c) => c.parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

    function subcategoryLabel(c: Category) {
        const parent = categories.find((p) => p.id === c.parentId);
        return parent ? `${parent.name} · ${c.name}` : c.name;
    }

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    async function handleFile(file: File | undefined) {
        if (!file) return;

        const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
            setError("Envie um arquivo .csv, .xlsx ou .xls.");
            return;
        }

        setLoading(true);
        setError(null);
        setFileName(file.name);
        try {
            const preview = await statementEntriesApi.previewImport(card.id, file);
            const subcategoryIds = new Set(subcategories.map((c) => String(c.id)));
            setRows(
                preview.rows.map((row) => {
                    const suggested = row.suggestedCategoryId != null ? String(row.suggestedCategoryId) : "";
                    return {
                        ...row,
                        // Duplicados e créditos (pagamento, estorno) começam desmarcados.
                        selected: !row.duplicate && row.amount > 0,
                        categoryId: subcategoryIds.has(suggested) ? suggested : "",
                    };
                })
            );
            setSkipped(preview.errors);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    function handleDrop(e: DragEvent<HTMLLabelElement>) {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
    }

    function updateRow(index: number, patch: Partial<ReviewRow>) {
        setRows((current) => current?.map((row, i) => (i === index ? { ...row, ...patch } : row)) ?? null);
    }

    function toggleAll(selected: boolean) {
        setRows((current) => current?.map((row) => ({ ...row, selected })) ?? null);
    }

    const selectedRows = rows?.filter((r) => r.selected) ?? [];
    const selectedTotal = selectedRows.reduce((sum, r) => sum + r.amount, 0);
    const duplicateCount = rows?.filter((r) => r.duplicate).length ?? 0;
    const suggestedCount = rows?.filter((r) => r.categoryId).length ?? 0;
    const allSelected = rows != null && rows.length > 0 && selectedRows.length === rows.length;

    async function handleImport() {
        if (selectedRows.length === 0) return;

        setSaving(true);
        try {
            const { imported } = await statementEntriesApi.importEntries(
                card.id,
                selectedRows.map((r) => ({
                    date: r.date,
                    description: r.description,
                    amount: r.amount,
                    categoryId: r.categoryId || null,
                }))
            );
            toast.success(`${imported} ${imported === 1 ? "item importado" : "itens importados"} para ${card.name}.`);
            await onImported(selectedRows.map((r) => r.date));
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="import-overlay" onMouseDown={onClose}>
            <div
                className={rows ? "import-modal wide" : "import-modal"}
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-title"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="import-header">
                    <div>
                        <h2 id="import-title">Importar extrato · {card.name}</h2>
                        <p>
                            {rows
                                ? `${fileName} — revise os itens antes de importar.`
                                : "Envie o CSV ou a planilha da fatura e o sistema separa os itens."}
                        </p>
                    </div>
                    <button type="button" className="import-close" onClick={onClose} aria-label="Fechar">
                        ×
                    </button>
                </header>

                {!rows ? (
                    <div className="import-body">
                        <label
                            className={dragging ? "import-dropzone dragging" : "import-dropzone"}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                accept={ACCEPTED_EXTENSIONS.join(",")}
                                onChange={(e) => {
                                    handleFile(e.target.files?.[0]);
                                    e.target.value = "";
                                }}
                                disabled={loading}
                            />
                            <strong>{loading ? "Lendo arquivo..." : "Escolha ou arraste o arquivo aqui"}</strong>
                            <span>.csv, .xlsx ou .xls · até 5MB</span>
                        </label>

                        <p className="import-hint">
                            O arquivo precisa ter colunas de <b>data</b>, <b>descrição</b> e <b>valor</b> (ex.: o CSV
                            da fatura exportado pelo app do banco). Os itens entram só no detalhamento deste cartão —
                            não afetam lançamentos, painel nem orçamento.
                        </p>

                        {error && <p className="import-error">{error}</p>}
                    </div>
                ) : (
                    <>
                        <div className="import-summary">
                            <span>{rows.length} itens encontrados</span>
                            {suggestedCount > 0 && <span>{suggestedCount} com subcategoria sugerida</span>}
                            {duplicateCount > 0 && <span className="warn">{duplicateCount} já existem neste cartão</span>}
                            {skipped.length > 0 && (
                                <details className="import-skipped">
                                    <summary>{skipped.length} linhas ignoradas</summary>
                                    <ul>
                                        {skipped.map((message) => (
                                            <li key={message}>{message}</li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                        </div>

                        <div className="import-table-wrap">
                            <table className="import-table">
                                <thead>
                                    <tr>
                                        <th className="import-check">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={(e) => toggleAll(e.target.checked)}
                                                aria-label="Selecionar todos"
                                            />
                                        </th>
                                        <th>Data</th>
                                        <th>Descrição</th>
                                        <th>Subcategoria</th>
                                        <th className="import-num">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr key={`${row.line}-${index}`} className={row.selected ? "" : "unselected"}>
                                            <td className="import-check">
                                                <input
                                                    type="checkbox"
                                                    checked={row.selected}
                                                    onChange={(e) => updateRow(index, { selected: e.target.checked })}
                                                    aria-label={`Importar ${row.description}`}
                                                />
                                            </td>
                                            <td className="import-date">{formatDate(row.date)}</td>
                                            <td>
                                                {row.description}
                                                {row.duplicate && <span className="import-tag warn">Já importado</span>}
                                                {row.amount < 0 && <span className="import-tag">Crédito</span>}
                                            </td>
                                            <td>
                                                <select
                                                    value={row.categoryId}
                                                    onChange={(e) => updateRow(index, { categoryId: e.target.value })}
                                                >
                                                    <option value="">Sem subcategoria</option>
                                                    {subcategories.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {subcategoryLabel(c)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className={row.amount < 0 ? "import-num credit" : "import-num"}>
                                                {formatCurrency(row.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <footer className="import-footer">
                            <span className="import-footer-total">
                                {selectedRows.length} selecionados · <strong>{formatCurrency(selectedTotal)}</strong>
                            </span>
                            <div className="import-actions">
                                <button
                                    type="button"
                                    className="import-btn ghost"
                                    onClick={() => setRows(null)}
                                    disabled={saving}
                                >
                                    Trocar arquivo
                                </button>
                                <button
                                    type="button"
                                    className="import-btn"
                                    onClick={handleImport}
                                    disabled={saving || selectedRows.length === 0}
                                >
                                    {saving
                                        ? "Importando..."
                                        : `Importar ${selectedRows.length} ${selectedRows.length === 1 ? "item" : "itens"}`}
                                </button>
                            </div>
                        </footer>
                    </>
                )}
            </div>
        </div>
    );
}

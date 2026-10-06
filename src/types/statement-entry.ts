export interface StatementEntry {
    id: string;
    householdId: string;
    cardId: number;
    categoryId: string | null;
    description: string;
    amount: number;
    date: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateStatementEntryPayload {
    cardId: number;
    categoryId: string | null;
    description: string;
    amount: number;
    date: string;
}

export interface StatementImportPreviewRow {
    line: number;
    date: string;
    description: string;
    amount: number;
    suggestedCategoryId: number | null;
    duplicate: boolean;
}

export interface StatementImportPreview {
    rows: StatementImportPreviewRow[];
    errors: string[];
}

export interface StatementImportEntry {
    date: string;
    description: string;
    amount: number;
    categoryId: string | null;
}

export interface UpdateStatementEntryPayload {
    cardId?: number;
    categoryId?: string | null;
    description?: string;
    amount?: number;
    date?: string;
}

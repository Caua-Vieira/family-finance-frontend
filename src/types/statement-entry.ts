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

export interface UpdateStatementEntryPayload {
    cardId?: number;
    categoryId?: string | null;
    description?: string;
    amount?: number;
    date?: string;
}

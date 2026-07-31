export type TransactionType = "income" | "expense";

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    categoryId: string | null;
    cardId: number | null;
    userId: string | null;
    createdAt: string;
}

export interface CreateTransactionPayload {
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    categoryId: string | null;
    cardId: number | null;
    userId: string | null;
}
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
    recurringTransactionId: string | null;
    createdAt: string;
    isProjected?: boolean;
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
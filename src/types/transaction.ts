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
    // Só em previstos: valor da regra e se este mês tem um valor previsto ajustado
    ruleAmount?: number;
    amountAdjusted?: boolean;
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

export interface UpdateTransactionPayload {
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    categoryId: string | null;
    cardId: number | null;
}
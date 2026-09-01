import type { TransactionType } from "./transaction";

export interface RecurringTransaction {
    id: string;
    householdId: string;
    type: TransactionType;
    amount: number;
    description: string;
    categoryId: string | null;
    cardId: number | null;
    userId: string | null;
    dayOfMonth: number;
    startDate: string;
    endDate: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRecurringTransactionPayload {
    type: TransactionType;
    amount: number;
    description: string;
    categoryId: string | null;
    cardId: number | null;
    userId: string | null;
    dayOfMonth: number;
    startDate: string;
    endDate: string | null;
}

export interface UpdateRecurringTransactionPayload {
    type?: TransactionType;
    amount?: number;
    description?: string;
    categoryId?: string | null;
    cardId?: number | null;
    userId?: string | null;
    dayOfMonth?: number;
    startDate?: string;
    endDate?: string | null;
    active?: boolean;
}

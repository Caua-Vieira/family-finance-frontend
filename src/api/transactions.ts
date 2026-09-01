import type { CreateTransactionPayload, Transaction } from "../types/transaction";
import { api } from "./client";

export interface TransactionFilters {
    type?: "income" | "expense";
    categoryId?: string;
    cardId?: number;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
}

function buildQuery(filters: TransactionFilters): string {
    const params = new URLSearchParams();

    if (filters.type) params.set("type", filters.type);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.cardId) params.set("cardId", String(filters.cardId));
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.month) params.set("month", String(filters.month));
    if (filters.year) params.set("year", String(filters.year));

    const query = params.toString();
    return query ? `?${query}` : "";
}

export const transactionsApi = {
    list: (filters: TransactionFilters = {}) =>
        api.get<Transaction[]>(`/transactions${buildQuery(filters)}`),
    create: (payload: CreateTransactionPayload) =>
        api.post<Transaction>("/transactions", payload),
    remove: (id: string) => api.delete<void>(`/transactions/${id}`),
};
import type {
    CreateRecurringTransactionPayload,
    RecurringTransaction,
    UpdateRecurringTransactionPayload,
} from "../types/recurring-transaction";
import { api } from "./client";

export const recurringApi = {
    list: () => api.get<RecurringTransaction[]>("/recurring"),
    create: (payload: CreateRecurringTransactionPayload) =>
        api.post<RecurringTransaction>("/recurring", payload),
    update: (id: string, payload: UpdateRecurringTransactionPayload) =>
        api.put<RecurringTransaction>(`/recurring/${id}`, payload),
    remove: (id: string) => api.delete<void>(`/recurring/${id}`),
    // Valor previsto de um mês futuro específico, sem mudar a regra
    setForecastAmount: (id: string, year: number, month: number, amount: number) =>
        api.put<void>(`/recurring/${id}/forecast/${year}/${month}`, { amount }),
    resetForecastAmount: (id: string, year: number, month: number) =>
        api.delete<void>(`/recurring/${id}/forecast/${year}/${month}`),
};

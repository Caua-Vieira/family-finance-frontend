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
};

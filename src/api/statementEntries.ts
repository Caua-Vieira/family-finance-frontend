import type {
    CreateStatementEntryPayload,
    StatementEntry,
    UpdateStatementEntryPayload,
} from "../types/statement-entry";
import { api } from "./client";

export interface StatementEntryFilters {
    cardId?: number;
    startDate?: string;
    endDate?: string;
}

function buildQuery(filters: StatementEntryFilters): string {
    const params = new URLSearchParams();
    if (filters.cardId) params.set("cardId", String(filters.cardId));
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    const query = params.toString();
    return query ? `?${query}` : "";
}

export const statementEntriesApi = {
    list: (filters: StatementEntryFilters = {}) =>
        api.get<StatementEntry[]>(`/statement-entries${buildQuery(filters)}`),
    create: (payload: CreateStatementEntryPayload) =>
        api.post<StatementEntry>("/statement-entries", payload),
    update: (id: string, payload: UpdateStatementEntryPayload) =>
        api.put<StatementEntry>(`/statement-entries/${id}`, payload),
    remove: (id: string) => api.delete<void>(`/statement-entries/${id}`),
};

import type { Budget, CreateBudgetPayload, UpdateBudgetPayload } from "../types/budget";
import { api } from "./client";

export const budgetsApi = {
    list: (month: number, year: number) =>
        api.get<Budget[]>(`/budgets?month=${month}&year=${year}`),
    create: (payload: CreateBudgetPayload) => api.post<Budget>("/budgets", payload),
    update: (payload: UpdateBudgetPayload) =>
        api.put<Budget>(`/budgets/${payload.id}`, payload),
};
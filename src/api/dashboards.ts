import type { DashboardSummary } from "../types/dashboard";
import { api } from "./client";

export const dashboardApi = {
    summary: (month: number, year: number) =>
        api.get<DashboardSummary>(`/dashboard/summary?month=${month}&year=${year}`),
};
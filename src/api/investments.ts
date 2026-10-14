import type { Investment, InvestmentPayload } from "../types/investment";
import { api } from "./client";

export const investmentsApi = {
    list: () => api.get<Investment[]>("/investments"),
    create: (payload: InvestmentPayload) => api.post<Investment>("/investments", payload),
    update: (id: string, payload: InvestmentPayload) => api.put<Investment>(`/investments/${id}`, payload),
    remove: (id: string) => api.delete<void>(`/investments/${id}`),
};

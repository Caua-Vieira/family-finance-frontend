import type { Card, CreateCardPayload } from "../types/card";
import type { HouseholdMember } from "../types/household-member";
import { api } from "./client";

export const cardsApi = {
    list: () => api.get<Card[]>("/cards"),
    create: (payload: CreateCardPayload) => api.post<Card>("/cards", payload),
    remove: (id: number) => api.delete<void>(`/cards/${id}`),
};

export const householdsApi = {
    members: () => api.get<HouseholdMember[]>("/users"),
};
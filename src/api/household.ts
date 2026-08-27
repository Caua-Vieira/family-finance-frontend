import type { Household } from "../types/household";
import { api } from "./client";

export const householdApi = {
    get: () => api.get<Household>("/household"),
};

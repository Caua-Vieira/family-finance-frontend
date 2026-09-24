import type { Category, CreateCategoryPayload } from "../types/category";
import { api } from "./client";

export const categoriesApi = {
    list: () => api.get<Category[]>("/categories"),
    create: (payload: CreateCategoryPayload) =>
        api.post<Category>("/categories", payload),
    update: (id: string, payload: CreateCategoryPayload) =>
        api.put<void>(`/categories/${id}`, payload),
    remove: (id: string) => api.delete<void>(`/categories/${id}`),
};
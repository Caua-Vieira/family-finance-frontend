export interface Category {
    id: string;
    name: string;
    householdId: string;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCategoryPayload {
    name: string;
    parentId: string | null;
}

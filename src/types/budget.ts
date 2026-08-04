export interface Budget {
    id: string;
    categoryId: string;
    householdId: string;
    month: number;
    year: number;
    estimatedAmount: number;
}

export interface CreateBudgetPayload {
    categoryId: string;
    month: number;
    year: number;
    estimatedAmount: number;
}

export interface UpdateBudgetPayload extends CreateBudgetPayload {
    id: string;
}
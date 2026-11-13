export interface DashboardCategory {
    categoryId: number;
    categoryName: string;
    budgeted: number;
    spent: number;
    percentageSpent: number;
}

export interface DashboardPreviousMonth {
    month: number;
    year: number;
    income: number;
    expenses: number;
    expensesVariationPercentage: number | null;
}

export interface DashboardSummary {
    month: number;
    year: number;
    income: number;
    // Despesas totais (despesas + investimentos); o saldo é renda - expenses
    expenses: number;
    // Parte das despesas totais que foi investida
    investments: number;
    balance: number;
    isProjection?: boolean;
    categories: DashboardCategory[];
    previousMonth: DashboardPreviousMonth;
}
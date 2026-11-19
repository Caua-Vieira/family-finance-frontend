export type SpendingVerdict = "ok" | "tight" | "no";

export interface PressuredCategory {
    categoryName: string;
    budgeted: number;
    spent: number;
    percentageSpent: number;
}

export interface SpendingQuestion {
    amount: number;
    balanceAfter: number;
    verdict: SpendingVerdict;
    message: string;
}

export interface SpendingCapacity {
    today: string;
    month: number;
    year: number;
    income: number;
    expenses: number;
    investments: number;
    balance: number;
    daysLeft: number;
    dailyAllowance: number;
    weekendAllowance: number;
    safetyMargin: number;
    incomeRegistered: boolean;
    pressuredCategories: PressuredCategory[];
    question?: SpendingQuestion;
    chatEnabled?: boolean;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export type InvestmentType =
    | "fixed_income"
    | "stocks"
    | "funds"
    | "real_estate_funds"
    | "crypto"
    | "pension"
    | "other";

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
    fixed_income: "Renda fixa",
    stocks: "Ações",
    funds: "Fundos",
    real_estate_funds: "Fundos imobiliários",
    crypto: "Cripto",
    pension: "Previdência",
    other: "Outros",
};

export interface Investment {
    id: string;
    householdId: string;
    name: string;
    type: InvestmentType;
    institution: string | null;
    investedAmount: number;
    currentValue: number;
    createdAt: string;
    updatedAt: string;
}

export interface InvestmentPayload {
    name: string;
    type: InvestmentType;
    institution: string | null;
    investedAmount: number;
    currentValue: number;
}

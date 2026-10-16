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

// Rendimento automático (só renda fixa): X% do CDI ou X% a.a. prefixado.
export type InvestmentIndexer = "cdi" | "prefixed";

export interface InvestmentEstimate {
    value: number;
    invested: number;
    contributionsApplied: number;
    ratesUntil: string | null;
    yieldUnavailable: boolean;
}

export interface Investment {
    id: string;
    householdId: string;
    name: string;
    type: InvestmentType;
    institution: string | null;
    investedAmount: number;
    currentValue: number;
    referenceDate: string | null;
    indexer: InvestmentIndexer | null;
    rate: number | null;
    monthlyContribution: number;
    contributionDay: number | null;
    estimate: InvestmentEstimate;
    createdAt: string;
    updatedAt: string;
}

export interface InvestmentPayload {
    name: string;
    type: InvestmentType;
    institution: string | null;
    investedAmount: number;
    currentValue: number;
    referenceDate: string;
    indexer: InvestmentIndexer | null;
    rate: number | null;
    monthlyContribution: number;
    contributionDay: number | null;
}

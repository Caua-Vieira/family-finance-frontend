import { api } from "./client";
import type { ChatMessage, SpendingCapacity } from "../types/advisor";

export const advisorApi = {
    spendingCapacity: (amount?: number) =>
        api.get<SpendingCapacity>(
            amount && amount > 0 ? `/advisor/spending-capacity?amount=${amount}` : "/advisor/spending-capacity"
        ),
    chat: (messages: ChatMessage[]) => api.post<{ reply: string }>("/advisor/chat", { messages }),
};

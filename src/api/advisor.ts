import { api } from "./client";
import type { ChatMessage } from "../types/advisor";

export const advisorApi = {
    chat: (messages: ChatMessage[]) => api.post<{ reply: string }>("/advisor/chat", { messages }),
};

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import "./AiChat.css";
import { advisorApi } from "../../api/advisor";
import type { ChatMessage } from "../../types/advisor";

const STORAGE_KEY = "ai-chat-messages";

const SUGGESTIONS = [
    "Posso gastar R$ 300 neste fim de semana?",
    "Como está o meu mês até agora?",
    "Onde estou gastando mais?",
    "Como estou em relação ao mês passado?",
];

function loadMessages(): ChatMessage[] {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        return stored ? (JSON.parse(stored) as ChatMessage[]) : [];
    } catch {
        return [];
    }
}

function saveMessages(messages: ChatMessage[]) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
        // sem armazenamento disponível: a conversa só vive em memória
    }
}

export function AiChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const threadRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        saveMessages(messages);
    }, [messages]);

    useEffect(() => {
        const thread = threadRef.current;
        if (thread) thread.scrollTop = thread.scrollHeight;
    }, [messages, sending, open]);

    useEffect(() => {
        if (!open) return;

        inputRef.current?.focus();

        function onKeyDown(event: globalThis.KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    async function send(text: string) {
        const content = text.trim();
        if (!content || sending) return;

        const next: ChatMessage[] = [...messages, { role: "user", content }];
        setMessages(next);
        setInput("");
        setError(null);
        setSending(true);

        try {
            const { reply } = await advisorApi.chat(next);
            setMessages([...next, { role: "assistant", content: reply }]);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSending(false);
        }
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        void send(input);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void send(input);
        }
    }

    function handleNewConversation() {
        setMessages([]);
        setError(null);
        setInput("");
        inputRef.current?.focus();
    }

    return (
        <>
            {!open && (
                <button
                    type="button"
                    className="ai-chat-fab"
                    onClick={() => setOpen(true)}
                    aria-label="Abrir assistente"
                >
                    <span aria-hidden="true">✦</span>
                    <span className="ai-chat-fab-label">Assistente</span>
                </button>
            )}

            {open && (
                <section className="ai-chat-panel" role="dialog" aria-label="Assistente do Razão Financeiro">
                    <header className="ai-chat-header">
                        <div>
                            <h2>Assistente</h2>
                            <p>Pergunte sobre o seu orçamento</p>
                        </div>
                        <div className="ai-chat-header-actions">
                            {messages.length > 0 && (
                                <button type="button" onClick={handleNewConversation}>
                                    Nova conversa
                                </button>
                            )}
                            <button
                                type="button"
                                className="ai-chat-close"
                                onClick={() => setOpen(false)}
                                aria-label="Fechar assistente"
                            >
                                ×
                            </button>
                        </div>
                    </header>

                    <div className="ai-chat-thread" ref={threadRef} aria-live="polite">
                        {messages.length === 0 && (
                            <div className="ai-chat-empty">
                                <p>
                                    Oi! Eu analiso o seu mês e respondo com os números do app. Experimente perguntar:
                                </p>
                                <div className="ai-chat-suggestions">
                                    {SUGGESTIONS.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => void send(suggestion)}
                                            disabled={sending}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((message, index) => (
                            <p key={index} className={`ai-chat-bubble ${message.role}`}>
                                {message.content}
                            </p>
                        ))}

                        {sending && <p className="ai-chat-bubble assistant typing">Pensando...</p>}
                        {error && <p className="ai-chat-error">{error}</p>}
                    </div>

                    <form className="ai-chat-composer" onSubmit={handleSubmit}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escreva sua pergunta..."
                            rows={1}
                            maxLength={1000}
                            aria-label="Pergunta sobre o orçamento"
                        />
                        <button type="submit" disabled={sending || !input.trim()} aria-label="Enviar">
                            Enviar
                        </button>
                    </form>
                    <p className="ai-chat-disclaimer">
                        Respostas baseadas nos seus lançamentos. Não substituem orientação financeira.
                    </p>
                </section>
            )}
        </>
    );
}

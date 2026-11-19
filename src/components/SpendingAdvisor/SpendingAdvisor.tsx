import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./SpendingAdvisor.css";
import { advisorApi } from "../../api/advisor";
import type { ChatMessage, SpendingCapacity } from "../../types/advisor";

const SUGGESTIONS = [
    "Posso gastar R$ 300 neste fim de semana?",
    "Onde estou gastando mais este mês?",
    "Como estou em relação ao mês passado?",
];

function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseAmount(value: string): number | undefined {
    const normalized = value.replace(/\./g, "").replace(",", ".").trim();
    const amount = Number(normalized);
    return normalized !== "" && Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

export function SpendingAdvisor() {
    const [capacity, setCapacity] = useState<SpendingCapacity | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [amountInput, setAmountInput] = useState("");
    const [checking, setChecking] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [sending, setSending] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const threadRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let active = true;
        advisorApi
            .spendingCapacity()
            .then((result) => active && setCapacity(result))
            .catch(() => active && setLoadError(true));
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const thread = threadRef.current;
        if (thread) thread.scrollTop = thread.scrollHeight;
    }, [messages, sending]);

    async function handleCheck(event: FormEvent) {
        event.preventDefault();
        const amount = parseAmount(amountInput);

        if (!amount) {
            setFormError("Informe um valor maior que zero.");
            return;
        }

        try {
            setFormError(null);
            setChecking(true);
            setCapacity(await advisorApi.spendingCapacity(amount));
        } catch (err) {
            setFormError((err as Error).message);
        } finally {
            setChecking(false);
        }
    }

    async function sendMessage(text: string) {
        const content = text.trim();
        if (!content || sending) return;

        const next: ChatMessage[] = [...messages, { role: "user", content }];
        setMessages(next);
        setChatInput("");
        setChatError(null);
        setSending(true);

        try {
            const { reply } = await advisorApi.chat(next);
            setMessages([...next, { role: "assistant", content: reply }]);
        } catch (err) {
            setChatError((err as Error).message);
        } finally {
            setSending(false);
        }
    }

    function handleChatSubmit(event: FormEvent) {
        event.preventDefault();
        void sendMessage(chatInput);
    }

    if (loadError || !capacity) return null;

    const question = capacity.question;

    return (
        <section className="advisor-card">
            <h2 className="advisor-title">Quanto posso gastar</h2>

            <div className="advisor-figures">
                <div>
                    <span className="advisor-label">Resta no mês</span>
                    <strong className={capacity.balance >= 0 ? "advisor-value ok" : "advisor-value no"}>
                        {formatCurrency(capacity.balance)}
                    </strong>
                </div>
                <div>
                    <span className="advisor-label">Por dia</span>
                    <strong className="advisor-value">{formatCurrency(capacity.dailyAllowance)}</strong>
                </div>
                <div>
                    <span className="advisor-label">Fim de semana</span>
                    <strong className="advisor-value">{formatCurrency(capacity.weekendAllowance)}</strong>
                </div>
                <div>
                    <span className="advisor-label">Dias restantes</span>
                    <strong className="advisor-value">{capacity.daysLeft}</strong>
                </div>
            </div>

            {!capacity.incomeRegistered && (
                <p className="advisor-note">Lance as receitas do mês para o cálculo refletir sua realidade.</p>
            )}

            {capacity.pressuredCategories.length > 0 && (
                <p className="advisor-note warn">
                    Atenção ao orçamento:{" "}
                    {capacity.pressuredCategories
                        .map((category) => `${category.categoryName} (${Math.round(category.percentageSpent)}%)`)
                        .join(", ")}
                    .
                </p>
            )}

            <form className="advisor-form" onSubmit={handleCheck}>
                <label htmlFor="advisor-amount">Posso gastar</label>
                <div className="advisor-amount-field">
                    <span>R$</span>
                    <input
                        id="advisor-amount"
                        inputMode="decimal"
                        placeholder="300,00"
                        value={amountInput}
                        onChange={(event) => setAmountInput(event.target.value)}
                    />
                </div>
                <button type="submit" disabled={checking}>
                    {checking ? "Calculando..." : "Ver"}
                </button>
            </form>
            {formError && <p className="advisor-note warn">{formError}</p>}

            {question && (
                <div className={`advisor-verdict ${question.verdict}`} role="status">
                    <strong>
                        {question.verdict === "ok" ? "Pode" : question.verdict === "tight" ? "Dá, mas aperta" : "Não dá"}
                    </strong>
                    <span>{question.message}</span>
                </div>
            )}

            {capacity.chatEnabled && (
                <div className="advisor-chat">
                    <h3 className="advisor-chat-title">Pergunte ao seu orçamento</h3>

                    {messages.length === 0 && (
                        <div className="advisor-suggestions">
                            {SUGGESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => void sendMessage(suggestion)}
                                    disabled={sending}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    {(messages.length > 0 || sending) && (
                        <div className="advisor-thread" ref={threadRef} aria-live="polite">
                            {messages.map((message, index) => (
                                <p key={index} className={`advisor-bubble ${message.role}`}>
                                    {message.content}
                                </p>
                            ))}
                            {sending && <p className="advisor-bubble assistant typing">Pensando...</p>}
                        </div>
                    )}

                    {chatError && <p className="advisor-note warn">{chatError}</p>}

                    <form className="advisor-chat-form" onSubmit={handleChatSubmit}>
                        <input
                            value={chatInput}
                            onChange={(event) => setChatInput(event.target.value)}
                            placeholder="Ex.: dá para jantar fora no sábado?"
                            maxLength={1000}
                            aria-label="Pergunta sobre o orçamento"
                        />
                        <button type="submit" disabled={sending || !chatInput.trim()}>
                            Enviar
                        </button>
                    </form>
                    <p className="advisor-disclaimer">
                        As respostas usam apenas os números do seu app e não substituem orientação financeira.
                    </p>
                </div>
            )}
        </section>
    );
}

import { useCallback, useEffect, useRef, useState } from "react";

// O backend fica no plano gratuito do Render, que "dorme" sem uso: a primeira
// requisição depois de um tempo pode levar perto de 1 minuto.
const SLOW_SERVER_HINT_MS = 4000;
const REQUEST_TIMEOUT_MS = 90_000;

export class AuthRequestError extends Error {
    code?: string;

    constructor(message: string, code?: string) {
        super(message);
        this.name = "AuthRequestError";
        this.code = code;
    }
}

/**
 * POST para as rotas públicas de /auth (fora do `api` client, que trata 401 como
 * sessão expirada). Controla o estado de carregamento e o aviso de servidor lento,
 * e converte falhas de rede/timeout em mensagens amigáveis.
 */
export function useAuthRequest() {
    const [loading, setLoading] = useState(false);
    const [slowServer, setSlowServer] = useState(false);
    const slowTimer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(slowTimer.current), []);

    const post = useCallback(async <T = unknown>(endpoint: string, body: unknown): Promise<T> => {
        setLoading(true);
        setSlowServer(false);
        slowTimer.current = window.setTimeout(() => setSlowServer(true), SLOW_SERVER_HINT_MS);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new AuthRequestError(data?.message || data?.error || "Não foi possível continuar", data?.code);
            }

            return data as T;
        } catch (err) {
            const error = err as Error;
            if (error.name === "TimeoutError") {
                throw new AuthRequestError("O servidor demorou demais para responder. Tente novamente em instantes.");
            }
            if (error instanceof TypeError) {
                throw new AuthRequestError("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.");
            }
            throw error;
        } finally {
            window.clearTimeout(slowTimer.current);
            setLoading(false);
            setSlowServer(false);
        }
    }, []);

    return { post, loading, slowServer };
}

import { useEffect, useRef, useState } from "react";
import "./GoogleSignInButton.css";
import { GOOGLE_CLIENT_ID as CLIENT_ID } from "./googleConfig";

const GSI_SRC = "https://accounts.google.com/gsi/client";
const MAX_BUTTON_WIDTH = 400;

interface GoogleCredentialResponse {
    credential: string;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize(config: {
                        client_id: string;
                        callback: (response: GoogleCredentialResponse) => void;
                        ux_mode?: "popup" | "redirect";
                    }): void;
                    renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
                };
            };
        };
    }
}

let gsiScript: Promise<void> | null = null;

function loadGoogleIdentity(): Promise<void> {
    if (window.google?.accounts) return Promise.resolve();

    gsiScript ??= new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = GSI_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            gsiScript = null; // permite tentar de novo na próxima montagem
            script.remove();
            reject(new Error("Falha ao carregar o Google Identity Services"));
        };
        document.head.appendChild(script);
    });

    return gsiScript;
}

interface GoogleSignInButtonProps {
    // Recebe o ID token (JWT) do Google, que o backend valida em /auth/google
    onCredential: (credential: string) => void;
    text?: "signin_with" | "signup_with" | "continue_with";
    disabled?: boolean;
}

/** Botão oficial "Entrar com o Google". Não renderiza nada se VITE_GOOGLE_CLIENT_ID não estiver definido. */
export function GoogleSignInButton({ onCredential, text = "continue_with", disabled }: GoogleSignInButtonProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const callbackRef = useRef(onCredential);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        callbackRef.current = onCredential;
    });

    useEffect(() => {
        const clientId = CLIENT_ID;
        if (!clientId) return;
        let cancelled = false;

        loadGoogleIdentity()
            .then(() => {
                const container = containerRef.current;
                if (cancelled || !container || !window.google) return;

                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response) => callbackRef.current(response.credential),
                    ux_mode: "popup",
                });
                window.google.accounts.id.renderButton(container, {
                    type: "standard",
                    theme: document.documentElement.dataset.theme === "dark" ? "filled_black" : "outline",
                    size: "large",
                    shape: "rectangular",
                    text,
                    locale: "pt-BR",
                    logo_alignment: "center",
                    width: Math.min(container.offsetWidth || MAX_BUTTON_WIDTH, MAX_BUTTON_WIDTH),
                });
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [text]);

    if (!CLIENT_ID) return null;

    if (failed) {
        return <p className="google-signin-error">Não foi possível carregar o login com Google.</p>;
    }

    return (
        <div
            ref={containerRef}
            className={disabled ? "google-signin disabled" : "google-signin"}
            aria-disabled={disabled}
        />
    );
}

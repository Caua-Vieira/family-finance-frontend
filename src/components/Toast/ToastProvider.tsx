import { useCallback, useRef, useState, type ReactNode } from "react";
import { ToastContext } from "./ToastContext";
import "./Toast.css";

type ToastType = "success" | "error";

interface ToastItem {
    id: number;
    type: ToastType;
    message: string;
}

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextId = useRef(0);

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const pushToast = useCallback((type: ToastType, message: string) => {
        const id = nextId.current++;
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    }, [removeToast]);

    const success = useCallback((message: string) => pushToast("success", message), [pushToast]);
    const error = useCallback((message: string) => pushToast("error", message), [pushToast]);

    return (
        <ToastContext.Provider value={{ success, error }}>
            {children}
            <div className="toast-viewport" aria-live="polite" aria-atomic="true">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast-${t.type}`} role="status">
                        <span className="toast-icon" aria-hidden="true">
                            {t.type === "success" ? "✓" : "!"}
                        </span>
                        <span className="toast-message">{t.message}</span>
                        <button
                            type="button"
                            className="toast-close"
                            onClick={() => removeToast(t.id)}
                            aria-label="Fechar aviso"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

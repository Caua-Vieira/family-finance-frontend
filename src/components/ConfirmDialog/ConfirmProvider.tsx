import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ConfirmContext, type ConfirmOptions } from "./ConfirmContext";
import "./ConfirmDialog.css";

type ResolvedConfirmOptions = Required<ConfirmOptions>;

interface PendingConfirm {
    options: ResolvedConfirmOptions;
    resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    const confirm = useCallback((opts: ConfirmOptions | string) => {
        const options: ConfirmOptions = typeof opts === "string" ? { message: opts } : opts;

        return new Promise<boolean>((resolve) => {
            setPending({
                options: {
                    title: options.title ?? "Confirmar ação",
                    message: options.message,
                    confirmLabel: options.confirmLabel ?? "Confirmar",
                    cancelLabel: options.cancelLabel ?? "Cancelar",
                    danger: options.danger ?? false,
                },
                resolve,
            });
        });
    }, []);

    const settle = useCallback((value: boolean) => {
        setPending((current) => {
            current?.resolve(value);
            return null;
        });
    }, []);

    useEffect(() => {
        if (!pending) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") settle(false);
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [pending, settle]);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {pending && (
                <div className="confirm-overlay" onMouseDown={() => settle(false)}>
                    <div
                        className="confirm-dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-dialog-title"
                        aria-describedby="confirm-dialog-message"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <h2 id="confirm-dialog-title" className="confirm-dialog-title">
                            {pending.options.title}
                        </h2>
                        <p id="confirm-dialog-message" className="confirm-dialog-message">
                            {pending.options.message}
                        </p>
                        <div className="confirm-dialog-actions">
                            <button
                                type="button"
                                className="confirm-dialog-cancel"
                                onClick={() => settle(false)}
                            >
                                {pending.options.cancelLabel}
                            </button>
                            <button
                                type="button"
                                className={
                                    pending.options.danger
                                        ? "confirm-dialog-confirm danger"
                                        : "confirm-dialog-confirm"
                                }
                                onClick={() => settle(true)}
                                autoFocus
                            >
                                {pending.options.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

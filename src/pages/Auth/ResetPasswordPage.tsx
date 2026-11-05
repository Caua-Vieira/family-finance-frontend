import { useState, type SubmitEvent } from "react";
import "./AuthPage.css";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Spinner } from "../../components/Spinner/Spinner";
import { useToast } from "../../components/Toast/useToast";
import { AuthBrand } from "./AuthBrand";
import { useAuthRequest } from "./useAuthRequest";

const MIN_PASSWORD_LENGTH = 6;

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [error, setError] = useState<string | null>(null);

    const { post, loading, slowServer } = useAuthRequest();
    const navigate = useNavigate();
    const toast = useToast();

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (loading) return;
        setError(null);

        if (password !== confirmation) {
            setError("As senhas não conferem.");
            return;
        }

        try {
            const data = await post<{ token: string }>("/auth/reset-password", { token, password });
            localStorage.setItem("token", data.token);
            toast.success("Senha redefinida com sucesso.");
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError((err as Error).message);
        }
    }

    return (
        <div className="auth-shell">
            <AuthBrand />

            <main className="auth-form-panel">
                <div className={loading ? "auth-form-wrap loading" : "auth-form-wrap"}>
                    {loading && <div className="auth-progress" aria-hidden="true" />}

                    <Link to="/login" className="auth-back">
                        ← Voltar para o login
                    </Link>

                    <h2 className="auth-form-title">Nova senha</h2>

                    {!token ? (
                        <p className="auth-notice">
                            Este link de recuperação está incompleto. Abra novamente o link do e-mail ou peça uma
                            nova recuperação na tela de login.
                        </p>
                    ) : (
                        <>
                            <p className="auth-form-subtitle">Escolha a nova senha da sua conta.</p>

                            <form onSubmit={handleSubmit} className="auth-form" aria-busy={loading}>
                                <fieldset className="auth-fieldset" disabled={loading}>
                                    <label className="auth-field">
                                        <span>Nova senha</span>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            minLength={MIN_PASSWORD_LENGTH}
                                            required
                                        />
                                        <span className="auth-field-hint">
                                            Pelo menos {MIN_PASSWORD_LENGTH} caracteres.
                                        </span>
                                    </label>

                                    <label className="auth-field">
                                        <span>Confirme a nova senha</span>
                                        <input
                                            type="password"
                                            value={confirmation}
                                            onChange={(e) => setConfirmation(e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            minLength={MIN_PASSWORD_LENGTH}
                                            required
                                        />
                                    </label>

                                    {error && <p className="auth-error">{error}</p>}

                                    <button type="submit" className="auth-submit">
                                        {loading ? (
                                            <>
                                                <Spinner size={15} />
                                                Salvando...
                                            </>
                                        ) : (
                                            "Salvar nova senha"
                                        )}
                                    </button>
                                </fieldset>

                                <p className="auth-status" role="status" aria-live="polite">
                                    {loading && slowServer
                                        ? "O servidor está iniciando — na primeira vez do dia isso pode levar até 1 minuto. Não feche a página."
                                        : ""}
                                </p>
                            </form>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

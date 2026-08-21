import { useState, type SubmitEvent } from "react";
import "./AuthPage.css";
import { useNavigate } from "react-router-dom";

type Mode = "login" | "register";

const LEDGER_ROWS = [
    { label: "Água", value: "70,54" },
    { label: "Condomínio", value: "175,00" },
    { label: "Cartão de crédito", value: "400,60" },
    { label: "Despesas extras", value: "760,00" },
];

export function AuthPage() {
    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [householdName, setHouseholdName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
            const body =
                mode === "login"
                    ? { email, password }
                    : { name, email, password, householdName };

            const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Não foi possível continuar");
            }

            localStorage.setItem("token", data.token);
            navigate("/dashboard");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-shell">
            <aside className="auth-brand">
                <div className="auth-brand-content">
                    <p className="auth-brand-eyebrow">Razão Financeira</p>
                    <h1 className="auth-brand-title">Cada real, com seu lugar.</h1>

                    <div className="ledger-ticker" aria-hidden="true">
                        {LEDGER_ROWS.map((row, i) => (
                            <div
                                className="ledger-row"
                                key={row.label}
                                style={{ animationDelay: `${i * 0.35}s` }}
                            >
                                <span className="ledger-row-label">{row.label}</span>
                                <span className="ledger-row-value">R$ {row.value}</span>
                            </div>
                        ))}
                        <div className="ledger-total" style={{ animationDelay: "1.4s" }}>
                            <span>Total do mês</span>
                            <span>R$ 1.406,14</span>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="auth-form-panel">
                <div className="auth-form-wrap">
                    <div className="auth-tabs">
                        <button
                            type="button"
                            className={mode === "login" ? "auth-tab active" : "auth-tab"}
                            onClick={() => setMode("login")}
                        >
                            Entrar
                        </button>
                        <button
                            type="button"
                            className={mode === "register" ? "auth-tab active" : "auth-tab"}
                            onClick={() => setMode("register")}
                        >
                            Criar conta
                        </button>
                    </div>

                    <h2 className="auth-form-title">
                        {mode === "login" ? "Bem-vindo de volta" : "Vamos começar"}
                    </h2>
                    <p className="auth-form-subtitle">
                        {mode === "login"
                            ? "Entre para ver o orçamento do mês."
                            : "Cria a sua família e o primeiro login em um passo."}
                    </p>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {mode === "register" && (
                            <>
                                <label className="auth-field">
                                    <span>Seu nome</span>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Seu nome..."
                                        required
                                    />
                                </label>

                                <label className="auth-field">
                                    <span>Nome da família</span>
                                    <input
                                        type="text"
                                        value={householdName}
                                        onChange={(e) => setHouseholdName(e.target.value)}
                                        placeholder="Nome da família"
                                        required
                                    />
                                </label>
                            </>
                        )}

                        <label className="auth-field">
                            <span>Email</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="voce@email.com"
                                required
                            />
                        </label>

                        <label className="auth-field">
                            <span>Senha</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </label>

                        {error && <p className="auth-error">{error}</p>}

                        <button type="submit" className="auth-submit" disabled={loading}>
                            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
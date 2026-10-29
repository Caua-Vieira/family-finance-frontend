import { useState, type SubmitEvent } from "react";
import "./AuthPage.css";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../../components/Spinner/Spinner";
import { GoogleSignInButton } from "../../components/GoogleSignInButton/GoogleSignInButton";
import { isGoogleSignInEnabled } from "../../components/GoogleSignInButton/googleConfig";
import { AuthBrand } from "./AuthBrand";
import { AuthRequestError, useAuthRequest } from "./useAuthRequest";

// "google-household": primeiro acesso pelo Google, falta escolher/criar a família
type Mode = "login" | "register" | "forgot" | "google-household";
type FamilyMode = "new" | "join";

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
    login: { title: "Bem-vindo de volta", subtitle: "Entre para ver o orçamento do mês." },
    register: { title: "Vamos iniciar", subtitle: "Crie a sua família e o primeiro login em um passo." },
    forgot: { title: "Esqueceu a senha?", subtitle: "Informe seu e-mail e enviaremos um link para criar uma nova." },
    "google-household": {
        title: "Quase lá",
        subtitle: "É o seu primeiro acesso com o Google. Crie a sua família ou entre em uma existente.",
    },
};

const LOADING_LABELS: Record<Mode, string> = {
    login: "Entrando...",
    register: "Criando sua conta...",
    forgot: "Enviando...",
    "google-household": "Criando sua conta...",
};

const SUBMIT_LABELS: Record<Mode, string> = {
    login: "Entrar",
    register: "Criar conta",
    forgot: "Enviar link",
    "google-household": "Concluir cadastro",
};

export function AuthPage() {
    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [householdName, setHouseholdName] = useState("");
    const [familyMode, setFamilyMode] = useState<FamilyMode>("new");
    const [inviteCode, setInviteCode] = useState("");
    const [googleCredential, setGoogleCredential] = useState<string | null>(null);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { post, loading, slowServer } = useAuthRequest();
    const navigate = useNavigate();

    function changeMode(next: Mode) {
        setMode(next);
        setError(null);
        setResetEmailSent(false);
        if (next !== "google-household") setGoogleCredential(null);
    }

    function familyPayload() {
        return familyMode === "new"
            ? { householdName }
            : { inviteCode: inviteCode.trim().toUpperCase() };
    }

    async function authenticate(endpoint: string, body: unknown) {
        const data = await post<{ token: string }>(endpoint, body);
        localStorage.setItem("token", data.token);
        navigate("/dashboard");
    }

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (loading) return;
        setError(null);

        try {
            if (mode === "login") {
                await authenticate("/auth/login", { email, password });
            } else if (mode === "register") {
                await authenticate("/auth/register", { name, email, password, ...familyPayload() });
            } else if (mode === "google-household") {
                await authenticate("/auth/google", { credential: googleCredential, ...familyPayload() });
            } else {
                await post("/auth/forgot-password", { email });
                setResetEmailSent(true);
            }
        } catch (err) {
            setError((err as Error).message);
        }
    }

    async function handleGoogleCredential(credential: string) {
        if (loading) return;
        setError(null);

        // Na aba de cadastro, aproveita a família que já foi preenchida
        const family = mode === "register" && (householdName || inviteCode) ? familyPayload() : {};

        try {
            await authenticate("/auth/google", { credential, ...family });
        } catch (err) {
            if (err instanceof AuthRequestError && err.code === "HOUSEHOLD_REQUIRED") {
                setGoogleCredential(credential);
                setMode("google-household");
                return;
            }
            setError((err as Error).message);
        }
    }

    const showTabs = mode === "login" || mode === "register";
    const showFamilyFields = mode === "register" || mode === "google-household";
    const showCredentials = mode === "login" || mode === "register";

    return (
        <div className="auth-shell">
            <AuthBrand />

            <main className="auth-form-panel">
                <div className={loading ? "auth-form-wrap loading" : "auth-form-wrap"}>
                    {loading && <div className="auth-progress" aria-hidden="true" />}

                    {showTabs ? (
                        <div className="auth-tabs">
                            <button
                                type="button"
                                className={mode === "login" ? "auth-tab active" : "auth-tab"}
                                onClick={() => changeMode("login")}
                                disabled={loading}
                            >
                                Entrar
                            </button>
                            <button
                                type="button"
                                className={mode === "register" ? "auth-tab active" : "auth-tab"}
                                onClick={() => changeMode("register")}
                                disabled={loading}
                            >
                                Criar conta
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="auth-back"
                            onClick={() => changeMode("login")}
                            disabled={loading}
                        >
                            ← Voltar para o login
                        </button>
                    )}

                    <h2 className="auth-form-title">{TITLES[mode].title}</h2>
                    <p className="auth-form-subtitle">{TITLES[mode].subtitle}</p>

                    {mode === "forgot" && resetEmailSent ? (
                        <p className="auth-notice" role="status">
                            Se existir uma conta com <strong>{email}</strong>, você vai receber um e-mail com o link
                            para redefinir a senha. O link vale por 1 hora — confira também a caixa de spam.
                        </p>
                    ) : (
                    <form onSubmit={handleSubmit} className="auth-form" aria-busy={loading}>
                        {/* fieldset desabilitado trava todos os campos e botões enquanto envia */}
                        <fieldset className="auth-fieldset" disabled={loading}>
                        {mode === "register" && (
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
                        )}

                        {showFamilyFields && (
                            <>
                                <div className="auth-family-toggle">
                                    <button
                                        type="button"
                                        className={familyMode === "new" ? "auth-pill active" : "auth-pill"}
                                        onClick={() => setFamilyMode("new")}
                                    >
                                        Criar família
                                    </button>
                                    <button
                                        type="button"
                                        className={familyMode === "join" ? "auth-pill active" : "auth-pill"}
                                        onClick={() => setFamilyMode("join")}
                                    >
                                        Já tenho um código
                                    </button>
                                </div>

                                {familyMode === "new" ? (
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
                                ) : (
                                    <label className="auth-field">
                                        <span>Código da família</span>
                                        <input
                                            type="text"
                                            className="auth-invite-code-input"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                            placeholder="Ex: A3F8K3"
                                            maxLength={6}
                                            autoCapitalize="characters"
                                            required
                                        />
                                        <span className="auth-field-hint">
                                            Peça o código a quem já cadastrou a família.
                                        </span>
                                    </label>
                                )}
                            </>
                        )}

                        {(showCredentials || mode === "forgot") && (
                            <label className="auth-field">
                                <span>Email</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="voce@email.com"
                                    autoComplete="email"
                                    required
                                />
                            </label>
                        )}

                        {showCredentials && (
                            <label className="auth-field">
                                <span>Senha</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                                    required
                                />
                            </label>
                        )}

                        {error && <p className="auth-error">{error}</p>}

                        <button type="submit" className="auth-submit">
                            {loading ? (
                                <>
                                    <Spinner size={15} />
                                    {LOADING_LABELS[mode]}
                                </>
                            ) : (
                                SUBMIT_LABELS[mode]
                            )}
                        </button>

                        {mode === "login" && (
                            <button
                                type="button"
                                className="auth-link"
                                onClick={() => changeMode("forgot")}
                            >
                                Esqueci minha senha
                            </button>
                        )}
                        </fieldset>

                        {showTabs && isGoogleSignInEnabled && (
                            <>
                                <div className="auth-divider" aria-hidden="true">
                                    <span>ou</span>
                                </div>
                                <GoogleSignInButton
                                    onCredential={handleGoogleCredential}
                                    text={mode === "login" ? "signin_with" : "signup_with"}
                                    disabled={loading}
                                />
                            </>
                        )}

                        <p className="auth-status" role="status" aria-live="polite">
                            {loading && slowServer
                                ? "O servidor está iniciando — na primeira vez do dia isso pode levar até 1 minuto. Não feche a página."
                                : ""}
                        </p>
                    </form>
                    )}
                </div>
            </main>
        </div>
    );
}

import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { householdApi } from "../api/household";
import { useToast } from "../components/Toast/useToast";
import "./AppLayout.css";

const NAV_ITEMS = [
    { to: "/dashboard", label: "Painel" },
    { to: "/categorias", label: "Categorias" },
    { to: "/transacoes", label: "Lançamentos" },
    { to: "/cartoes", label: "Cartões" },
    { to: "/orcamento", label: "Orçamentos" },
];

export function AppLayout() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const toast = useToast();
    const [inviteCode, setInviteCode] = useState<string | null>(null);

    useEffect(() => {
        householdApi
            .get()
            .then((household) => setInviteCode(household.inviteCode))
            .catch(() => setInviteCode(null));
    }, []);

    function handleLogout() {
        localStorage.removeItem("token");
        navigate("/login");
    }

    async function handleCopyInviteCode() {
        if (!inviteCode) return;
        try {
            await navigator.clipboard.writeText(inviteCode);
            toast.success("Código copiado.");
        } catch {
            toast.error("Não foi possível copiar o código.");
        }
    }

    return (
        <div className="app-shell">
            <aside className="app-sidebar">
                <div className="app-sidebar-top">
                    <p className="app-sidebar-brand">Livro-razão</p>

                    <nav className="app-nav">
                        {NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    isActive ? "app-nav-item active" : "app-nav-item"
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="app-sidebar-bottom">
                    {inviteCode && (
                        <button
                            type="button"
                            className="app-invite-code"
                            onClick={handleCopyInviteCode}
                            title="Copiar código para convidar alguém da família"
                        >
                            <span className="app-invite-code-label">Código da família</span>
                            <span className="app-invite-code-value">{inviteCode}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        className="app-theme-toggle"
                        onClick={toggleTheme}
                        aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
                    >
                        {theme === "dark" ? "☀️ Claro" : "🌙 Escuro"}
                    </button>

                    <button type="button" className="app-logout" onClick={handleLogout}>
                        Sair
                    </button>
                </div>
            </aside>

            <main className="app-content">
                <Outlet />
            </main>
        </div>
    );
}
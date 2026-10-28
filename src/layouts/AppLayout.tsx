import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { householdApi } from "../api/household";
import { useToast } from "../components/Toast/useToast";
import "./AppLayout.css";

const NAV_ITEMS = [
    { to: "/dashboard", label: "Painel" },
    { to: "/categorias", label: "Categorias" },
    { to: "/transacoes", label: "Lançamentos" },
    { to: "/extrato", label: "Extrato" },
    { to: "/cartoes", label: "Cartões" },
    { to: "/orcamento", label: "Orçamentos" },
    { to: "/investimentos", label: "Investimentos" },
];

export function AppLayout() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const toast = useToast();
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    // Menu lateral no celular: vira uma gaveta aberta pelo botão da barra do topo.
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!menuOpen) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setMenuOpen(false);
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [menuOpen]);

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
        <div className={menuOpen ? "app-shell menu-open" : "app-shell"}>
            <header className="app-topbar">
                <Link
                    to="/dashboard"
                    className="app-topbar-brand"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Ir para o painel"
                >
                    Razão Financeira
                </Link>
                <button
                    type="button"
                    className="app-menu-toggle"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                    aria-expanded={menuOpen}
                    aria-controls="app-sidebar"
                >
                    <span className="app-menu-icon" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </span>
                </button>
            </header>

            <div className="app-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />

            <aside className="app-sidebar" id="app-sidebar">
                <div className="app-sidebar-top">
                    <Link
                        to="/dashboard"
                        className="app-sidebar-brand"
                        onClick={() => setMenuOpen(false)}
                        aria-label="Ir para o painel"
                    >
                        Razão Financeira
                    </Link>

                    <nav className="app-nav">
                        {NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setMenuOpen(false)}
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
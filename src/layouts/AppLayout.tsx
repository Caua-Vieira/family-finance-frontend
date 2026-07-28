import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./AppLayout.css";

const NAV_ITEMS = [
    { to: "/dashboard", label: "Painel" },
    { to: "/categorias", label: "Categorias" },
    { to: "/transacoes", label: "Lançamentos" },
    { to: "/cartoes", label: "Cartões" },
];

export function AppLayout() {
    const navigate = useNavigate();

    function handleLogout() {
        localStorage.removeItem("token");
        navigate("/login");
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

                <button type="button" className="app-logout" onClick={handleLogout}>
                    Sair
                </button>
            </aside>

            <main className="app-content">
                <Outlet />
            </main>
        </div>
    );
}
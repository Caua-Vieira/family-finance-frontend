const LEDGER_ROWS = [
    { label: "Água", value: "70,54" },
    { label: "Condomínio", value: "175,00" },
    { label: "Cartão de crédito", value: "400,60" },
    { label: "Despesas extras", value: "760,00" },
];

export function AuthBrand() {
    return (
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
    );
}

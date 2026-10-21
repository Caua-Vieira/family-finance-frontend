import "./Spinner.css";

interface SpinnerProps {
    size?: number;
    // Com label vira um "status" anunciado por leitores de tela; sem label é só decorativo.
    label?: string;
}

export function Spinner({ size = 14, label }: SpinnerProps) {
    return (
        <span
            className="spinner"
            style={{ width: size, height: size }}
            role={label ? "status" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
        />
    );
}

// Data de hoje (YYYY-MM-DD) no fuso local. `toISOString()` usa UTC e, no Brasil,
// vira o dia seguinte a partir das 21h.
export function todayIso(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

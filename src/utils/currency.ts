export function centsFromInput(value: string): number {
    const digits = value.replace(/\D/g, "");
    return digits ? parseInt(digits, 10) : 0;
}

export function formatCentsInput(cents: number): string {
    if (!cents) return "";
    return (cents / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

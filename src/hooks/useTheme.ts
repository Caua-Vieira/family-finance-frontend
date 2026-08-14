import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function systemTheme(): Theme {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function currentTheme(): Theme {
    const attr = document.documentElement.dataset.theme;
    if (attr === "light" || attr === "dark") return attr;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;

    return systemTheme();
}

/**
 * Tema claro/escuro do app. Segue a preferência do sistema operacional por
 * padrão; assim que o usuário troca manualmente, a escolha fica salva no
 * navegador e passa a valer sobre o SO. O atributo `data-theme` no `<html>`
 * é o que os tokens em `tokens.css` leem para trocar as cores.
 */
export function useTheme() {
    const [theme, setTheme] = useState<Theme>(currentTheme);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        if (localStorage.getItem(STORAGE_KEY)) return;

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = (event: MediaQueryListEvent) => {
            setTheme(event.matches ? "dark" : "light");
        };

        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next: Theme = prev === "dark" ? "light" : "dark";
            localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    }, []);

    return { theme, toggleTheme };
}

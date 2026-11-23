// Feature toggles. Ficam desligados por padrão: para ligar, defina a variável
// correspondente como "true" (na Vercel, por exemplo) e faça um novo deploy.
export const FEATURES = {
    // Assistente de IA (chat flutuante). Exige ANTHROPIC_API_KEY configurada no backend.
    aiChat: import.meta.env.VITE_FEATURE_AI_CHAT === "true",
};

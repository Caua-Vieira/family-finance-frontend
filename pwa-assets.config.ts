import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Gera os ícones do PWA a partir de public/pwa-icon.svg: `npm run generate-pwa-assets`.
// O SVG já tem fundo cheio e o desenho dentro da zona segura, então nenhum ícone leva margem extra.
const INK = "#17251F";

export default defineConfig({
    headLinkOptions: { preset: "2023" },
    preset: {
        ...minimal2023Preset,
        transparent: { ...minimal2023Preset.transparent, padding: 0 },
        maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: INK } },
        apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: INK } },
    },
    images: ["public/pwa-icon.svg"],
});

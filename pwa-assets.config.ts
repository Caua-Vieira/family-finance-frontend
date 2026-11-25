import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

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

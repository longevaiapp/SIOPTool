import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Module brand colours (project rules)
                "m01-crm": "#2563eb",
                "m02-rfq": "#16a34a",
                "m03-contracts": "#7c3aed",
                "m04-pm": "#ea580c",
                "m05-pmo": "#0d9488",
                "m06-health": "#e11d48",
                "m07-portal": "#d97706",
                "m08-suppliers": "#4f46e5",
                "m09-siop": "#0891b2",
                "m10-analytics": "#475569",
                infrastructure: "#64748b",
            },
        },
    },
    plugins: [],
};

export default config;

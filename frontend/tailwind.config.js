/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary-container": "#fb923c",
        "on-secondary-fixed": "#00201c",
        "primary-fixed": "#ffdcc5",
        "on-secondary-fixed-variant": "#005047",
        "tertiary": "#61d5ff",
        "tertiary-container": "#00bbe9",
        "on-primary": "#4f2500",
        "secondary": "#44e2cd",
        "on-tertiary-fixed": "#001f29",
        "surface-dim": "#131313",
        "surface-variant": "#353534",
        "secondary-container": "#03c6b2",
        "secondary-fixed-dim": "#3cddc7",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
        "surface-tint": "#ffb783",
        "surface": "#171717",
        "primary-fixed-dim": "#ffb783",
        "surface-container-lowest": "#0e0e0e",
        "on-error": "#690005",
        "error": "#ffb4ab",
        "watchlist": "#fbbf24",
        "tertiary-fixed": "#baeaff",
        "text-secondary": "#a3a3a3",
        "surface-container-high": "#2a2a2a",
        "text-primary": "#f5f5f5",
        "forming": "#fb923c",
        "secondary-fixed": "#62fae3",
        "outline-variant": "#554337",
        "on-secondary-container": "#004d44",
        "on-primary-container": "#673200",
        "surface-bright": "#3a3939",
        "text-tertiary": "#737373",
        "on-secondary": "#003731",
        "on-tertiary": "#003545",
        "surface-container-low": "#1c1b1b",
        "on-background": "#e5e2e1",
        "on-primary-fixed-variant": "#713700",
        "border": "#333333",
        "on-tertiary-container": "#00465a",
        "contained": "#34d399",
        "inverse-primary": "#944a00",
        "on-tertiary-fixed-variant": "#004d62",
        "background": "#131313",
        "inverse-on-surface": "#313030",
        "inverse-surface": "#e5e2e1",
        "on-surface": "#e5e2e1",
        "outline": "#a38c7e",
        "primary": "#ffb887",
        "surface-container-highest": "#353534",
        "on-surface-variant": "#dbc1b2",
        "tertiary-fixed-dim": "#5bd4ff",
        "surface-container": "#201f1f",
        "on-primary-fixed": "#301400",
        "calm": "#2dd4bf"
      },
      borderRadius: {
        "DEFAULT": "0px",
        "lg": "0px",
        "xl": "0px",
        "full": "0px"
      },
      spacing: {
        "gutter": "1px",
        "container-max": "896px",
        "card-py-active": "20px",
        "card-px": "20px",
        "base": "4px",
        "card-py-contained": "10px"
      },
      fontFamily: {
        "data-mono": ["JetBrains Mono", "monospace"],
        "body-sm": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "micro-caps": ["JetBrains Mono", "monospace"],
        "label-xs": ["JetBrains Mono", "monospace"],
        "display-risk": ["JetBrains Mono", "monospace"],
        "headline-lg": ["Inter", "sans-serif"]
      },
      fontSize: {
        "data-mono": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "body-sm": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "headline-md": ["18px", { "lineHeight": "24px", "fontWeight": "600" }],
        "micro-caps": ["10px", { "lineHeight": "12px", "letterSpacing": "0.1em", "fontWeight": "700" }],
        "label-xs": ["12px", { "lineHeight": "16px", "fontWeight": "500" }],
        "display-risk": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "600" }],
        "headline-lg": ["20px", { "lineHeight": "28px", "fontWeight": "600" }]
      },
      animation: {
        "fade-in-up": "fadeInUp 0.8s ease-out forwards",
        "pulse-slow": "pulseSlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseSlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".5" }
        }
      }
    }
  },
  plugins: [],
}

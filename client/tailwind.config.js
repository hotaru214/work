/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 供下载的 shadcn / aceternity 组件使用的语义色（映射到黑白灰主基调）
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--primary) / <alpha-value>)",
      },
      keyframes: {
        rippling: {
          "0%": { opacity: "1" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        "meteor-effect": {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": {
            transform: "rotate(215deg) translateX(-500px)",
            opacity: "0",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        rippling: "rippling var(--duration, 0.6s) ease-out",
        "meteor-effect": "meteor-effect 5s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === "analyze"
      ? [
          visualizer({
            filename: "stats.html",
            emitFile: true,
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const normalized = id.replace(/\\/g, "/");
          if (normalized.includes("/node_modules/react-router") || normalized.includes("/node_modules/@remix-run/router/")) return "vendor-router";
          if (normalized.includes("/node_modules/@tanstack/")) return "vendor-query";
          if (normalized.includes("/node_modules/@tabler/") || normalized.includes("/node_modules/lucide-react/")) return "vendor-icons";
          if (
            normalized.includes("/node_modules/motion/") ||
            normalized.includes("/node_modules/motion-dom/") ||
            normalized.includes("/node_modules/motion-utils/") ||
            normalized.includes("/node_modules/framer-motion/") ||
            normalized.includes("/node_modules/animejs/") ||
            normalized.includes("/node_modules/@motionone/")
          ) {
            return "vendor-animation";
          }
          if (normalized.includes("/node_modules/highlight.js/") || normalized.includes("/node_modules/lowlight/")) return "vendor-highlight";
          if (
            normalized.includes("/node_modules/react-markdown/") ||
            normalized.includes("/node_modules/remark-") ||
            normalized.includes("/node_modules/rehype-") ||
            normalized.includes("/node_modules/unified/") ||
            normalized.includes("/node_modules/katex/") ||
            normalized.includes("/node_modules/@ungap/structured-clone/") ||
            normalized.includes("/node_modules/micromark") ||
            normalized.includes("/node_modules/mdast-") ||
            normalized.includes("/node_modules/mdast-util-") ||
            normalized.includes("/node_modules/hast-") ||
            normalized.includes("/node_modules/hast-util-") ||
            normalized.includes("/node_modules/hastscript/") ||
            normalized.includes("/node_modules/unist-") ||
            normalized.includes("/node_modules/vfile") ||
            normalized.includes("/node_modules/bail/") ||
            normalized.includes("/node_modules/ccount/") ||
            normalized.includes("/node_modules/character-") ||
            normalized.includes("/node_modules/comma-separated-tokens/") ||
            normalized.includes("/node_modules/decode-named-character-reference/") ||
            normalized.includes("/node_modules/devlop/") ||
            normalized.includes("/node_modules/escape-string-regexp/") ||
            normalized.includes("/node_modules/entities/") ||
            normalized.includes("/node_modules/estree-") ||
            normalized.includes("/node_modules/extend/") ||
            normalized.includes("/node_modules/fault/") ||
            normalized.includes("/node_modules/html-") ||
            normalized.includes("/node_modules/inline-style-parser/") ||
            normalized.includes("/node_modules/is-plain-obj/") ||
            normalized.includes("/node_modules/longest-streak/") ||
            normalized.includes("/node_modules/markdown-table/") ||
            normalized.includes("/node_modules/mdurl/") ||
            normalized.includes("/node_modules/parse-entities/") ||
            normalized.includes("/node_modules/property-information/") ||
            normalized.includes("/node_modules/style-to-js/") ||
            normalized.includes("/node_modules/style-to-object/") ||
            normalized.includes("/node_modules/space-separated-tokens/") ||
            normalized.includes("/node_modules/stringify-entities/") ||
            normalized.includes("/node_modules/trim-") ||
            normalized.includes("/node_modules/trough/") ||
            normalized.includes("/node_modules/web-namespaces/") ||
            normalized.includes("/node_modules/zwitch/")
          ) {
            return "vendor-markdown";
          }
          if (
            normalized.includes("/node_modules/@radix-ui/") ||
            normalized.includes("/node_modules/aria-hidden/") ||
            normalized.includes("/node_modules/class-variance-authority/") ||
            normalized.includes("/node_modules/clsx/") ||
            normalized.includes("/node_modules/detect-node-es/") ||
            normalized.includes("/node_modules/get-nonce/") ||
            normalized.includes("/node_modules/react-remove-scroll/") ||
            normalized.includes("/node_modules/react-remove-scroll-bar/") ||
            normalized.includes("/node_modules/react-style-singleton/") ||
            normalized.includes("/node_modules/tailwind-merge/") ||
            normalized.includes("/node_modules/use-callback-ref/") ||
            normalized.includes("/node_modules/use-sidecar/")
          ) {
            return "vendor-ui";
          }
          if (
            normalized.includes("/node_modules/react-dropzone/") ||
            normalized.includes("/node_modules/file-selector/") ||
            normalized.includes("/node_modules/attr-accept/") ||
            normalized.includes("/node_modules/prop-types/")
          ) {
            return "vendor-upload";
          }
          if (normalized.includes("/node_modules/ogl/")) return "vendor-graphics";
          if (
            normalized.includes("/node_modules/react/") ||
            normalized.includes("/node_modules/react-dom/") ||
            normalized.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
}));

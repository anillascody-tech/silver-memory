import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";

export default defineConfig({
  envPrefix: ["VITE_", "GEMINI_"],
  plugins: [crx({ manifest })]
});

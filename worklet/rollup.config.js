// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: ["DenoiserWorklet.ts"],
  output: {
    format: "es",
    dir: "../dist",
  },
  plugins: [typescript(), terser()],
};

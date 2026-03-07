// rollup.config.js
import typescript from "@rollup/plugin-typescript";

export default {
  input: ["DenoiserWorklet.ts"],
  output: {
    format: "es",
    dir: "../dist",
  },
  plugins: [typescript()],
};

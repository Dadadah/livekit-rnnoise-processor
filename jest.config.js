import { createJsWithTsEsmPreset } from "ts-jest";
const presetConfig = createJsWithTsEsmPreset();
/** @type {import("jest").Config} **/
export default {
  ...presetConfig,
  verbose: true,
};

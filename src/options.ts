export class RNNoiseOptions {
  /**
   * Whether to log debug information.
   */
  debugLogs?: boolean = false;

  /**
   * Whether to log VAD information. Requires debugLogs.
   */
  vadLogs?: boolean = false;

  /**
   * Custom CDN URL. Must end in a `/`. If omitted, the upstream git version will be used.
   *
   * The following files must exist:
   *
   * workletCDNURL + "rnnoise.wasm"
   *
   * workletCDNURL + "RNNoiseWorklet.js"
   */
  workletCDNURL?: string;
}

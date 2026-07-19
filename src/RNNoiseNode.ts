import { RNNoiseOptions } from "./options";

const defaultCDNURL = "https://cdn.jsdelivr.net/gh/dadadah/livekit-rnnoise-processor@f014bc339da67f4aa60066832839fbb09151db03/dist/";

let wasmBytes: ArrayBuffer;

export default class RNNoiseNode extends AudioWorkletNode {
  static async loadModule(ctx: AudioContext, cdn?: string) {
    let url = defaultCDNURL + "RNNoiseWorklet.js";
    if (cdn) {
      url = cdn + "RNNoiseWorklet.js";
    }
    await ctx.audioWorklet.addModule(new URL(url));

    url = url.replace("RNNoiseWorklet.js", "rnnoise.wasm");
    const resp = await fetch(url);
    wasmBytes = await resp.arrayBuffer();
  }

  constructor(ctx: AudioContext, options?: RNNoiseOptions) {
    if (!wasmBytes || wasmBytes.byteLength === 0) {
      throw new Error("WASM not initialized, call loadModule() first");
    }

    super(ctx, "RNNoiseWorklet", {
      processorOptions: {
        debugLogs: options?.debugLogs,
        vadLogs: options?.vadLogs,
        rnnoiseBuffer: wasmBytes,
      },
      numberOfInputs: 1,
      numberOfOutputs: 1,
    });
  }
}

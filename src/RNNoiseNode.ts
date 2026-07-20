import { RNNoiseOptions } from "./options";

const defaultCDNURL = "https://cdn.jsdelivr.net/gh/dadadah/livekit-rnnoise-processor@f014bc339da67f4aa60066832839fbb09151db03/dist/";

let wasmBytes: ArrayBuffer;

/**
 * An AudioWorkletNode that removes noise from a voice audio stream.
 *
 * Always ensure to call RNNoiseNode.loadModule before instantiating an RNNoiseNode.
 */
export class RNNoiseNode extends AudioWorkletNode {
  /**
   * Load the RNNoise worklet and WASM modules. This should always be called before instantiating an RNNoiseNode.
   *
   * @param ctx The AudioContext for the node.
   * @param cdn The CDN URL for the worklet and RNNoise WASM. If omitted, the upstream git version will be used.
   */
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

  constructor(ctx: AudioContext, options?: Omit<RNNoiseOptions, "workletCDNURL">) {
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

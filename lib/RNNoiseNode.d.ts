import { RNNoiseOptions } from "./options";
export declare class RNNoiseNode extends AudioWorkletNode {
    static loadModule(ctx: AudioContext, cdn?: string): Promise<void>;
    constructor(ctx: AudioContext, options?: RNNoiseOptions);
}

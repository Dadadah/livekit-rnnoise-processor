import { DenoiseOptions } from "./options";
const defaultCDNURL = "https://cdn.jsdelivr.net/gh/dadadah/livekit-rnnoise-processor@860d8053d4917389dfdebb20d88d0bb6ce950bda/dist/";
export class DenoiseTrackProcessor {
    static loadedContexts = new WeakSet();
    name = "rnnoise-denoise-filter";
    processedTrack;
    audioOpts;
    filterOpts;
    denoiseNode;
    orgSourceNode;
    enabled = true;
    constructor(options) {
        this.filterOpts = options ?? new DenoiseOptions();
    }
    static isSupported() {
        return true;
    }
    async init(opts) {
        if (this.filterOpts?.debugLogs) {
            console.log("DenoiseTrackProcessor.init", opts);
        }
        await this._initInternal(opts, false);
    }
    async restart(opts) {
        // restart with empty audio context
        opts.audioContext = opts.audioContext ?? this.audioOpts?.audioContext;
        if (this.filterOpts?.debugLogs) {
            console.log("DenoiseTrackProcessor.restart", opts);
        }
        await this._initInternal(opts, true);
    }
    async onPublish(room) {
        if (this.filterOpts?.debugLogs) {
            console.log("DenoiseTrackProcessor.onPublish", room.name);
        }
    }
    async onUnpublish() {
        if (this.filterOpts?.debugLogs) {
            console.log("DenoiseTrackProcessor.onUnpublish");
        }
    }
    async setEnabled(enable) {
        if (this.filterOpts?.debugLogs) {
            console.log("DenoiseTrackProcessor.setEnabled", enable);
        }
        if (this.denoiseNode) {
            this.enabled = enable;
            this.denoiseNode.port.postMessage({ message: "SET_ENABLED", enable });
        }
    }
    async isEnabled() {
        if (this.denoiseNode) {
            return this.enabled;
        }
        else {
            return false;
        }
    }
    async destroy() {
        if (this.filterOpts?.debugLogs) {
            console.log("DenoiseTrackProcessor.destroy");
        }
        this._closeInternal();
    }
    async _initInternal(opts, restart) {
        if (!opts || !opts.audioContext || !opts.track) {
            throw new Error("audioContext and track are required");
        }
        if (restart) {
            this._closeInternal();
        }
        this.audioOpts = opts;
        const ctx = this.audioOpts.audioContext;
        if (!DenoiseTrackProcessor.loadedContexts.has(ctx)) {
            let url;
            if (!this.filterOpts?.workletCDNURL) {
                url = defaultCDNURL + "DenoiserWorklet.js";
            }
            else {
                url = this.filterOpts.workletCDNURL + "DenoiserWorklet.js";
            }
            await ctx.audioWorklet.addModule(new URL(url));
            DenoiseTrackProcessor.loadedContexts.add(ctx);
        }
        // Fetch the rnnoise binary from cdn
        let url;
        if (!this.filterOpts?.workletCDNURL) {
            url = defaultCDNURL + "rnnoise.wasm";
        }
        else {
            url = this.filterOpts.workletCDNURL + "rnnoise.wasm";
        }
        const resp = await fetch(url);
        const content = await resp.arrayBuffer();
        // process node
        this.denoiseNode = new AudioWorkletNode(ctx, "DenoiserWorklet", {
            processorOptions: {
                debugLogs: this.filterOpts?.debugLogs,
                vadLogs: this.filterOpts?.vadLogs,
                rnnoiseBuffer: content,
            },
            numberOfInputs: 1,
            numberOfOutputs: 1,
        });
        // source node
        this.orgSourceNode = ctx.createMediaStreamSource(new MediaStream([this.audioOpts.track]));
        // source node==>process node
        this.orgSourceNode.connect(this.denoiseNode);
        // destination node
        const destination = ctx.createMediaStreamDestination();
        // process node==>destination node
        this.denoiseNode.connect(destination);
        this.processedTrack = destination.stream.getAudioTracks()[0];
        if (this.filterOpts?.debugLogs) {
            console.log(`DenoiseTrackProcessor.init: sourceID: ${this.audioOpts.track.id}, newTrackID: ${this.processedTrack.id}`);
        }
    }
    _closeInternal() {
        this.denoiseNode?.port.postMessage({ message: "DESTROY" });
        this.denoiseNode?.port.close();
        this.denoiseNode?.disconnect();
        this.orgSourceNode?.disconnect();
        this.denoiseNode = undefined;
        this.orgSourceNode = undefined;
        this.processedTrack = undefined;
    }
}

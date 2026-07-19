import { RNNoiseOptions } from "./options";
import { RNNoiseNode } from "./RNNoiseNode";
export class RNNoiseTrackProcessor {
    name = "rnnoise-track-processor";
    processedTrack;
    audioOpts;
    filterOpts;
    denoiseNode;
    orgSourceNode;
    enabled = true;
    constructor(options) {
        this.filterOpts = options ?? new RNNoiseOptions();
    }
    static isSupported() {
        return true;
    }
    async init(opts) {
        if (this.filterOpts?.debugLogs) {
            console.log("RNNoiseTrackProcessor.init", opts);
        }
        await RNNoiseNode.loadModule(opts.audioContext, this.filterOpts?.workletCDNURL);
        await this._initInternal(opts, false);
    }
    async restart(opts) {
        // restart with empty audio context
        opts.audioContext = opts.audioContext ?? this.audioOpts?.audioContext;
        if (this.filterOpts?.debugLogs) {
            console.log("RNNoiseTrackProcessor.restart", opts);
        }
        await this._initInternal(opts, true);
    }
    async onPublish(room) {
        if (this.filterOpts?.debugLogs) {
            console.log("RNNoiseTrackProcessor.onPublish", room.name);
        }
    }
    async onUnpublish() {
        if (this.filterOpts?.debugLogs) {
            console.log("RNNoiseTrackProcessor.onUnpublish");
        }
    }
    async setEnabled(enable) {
        if (this.filterOpts?.debugLogs) {
            console.log("RNNoiseTrackProcessor.setEnabled", enable);
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
            console.log("RNNoiseTrackProcessor.destroy");
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
        // process node
        this.denoiseNode = new RNNoiseNode(ctx, this.filterOpts);
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
            console.log(`RNNoiseTrackProcessor.init: sourceID: ${this.audioOpts.track.id}, newTrackID: ${this.processedTrack.id}`);
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

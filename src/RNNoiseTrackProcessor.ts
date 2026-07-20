import { Track } from "livekit-client";
import type { AudioProcessorOptions, Room, TrackProcessor } from "livekit-client";
import { RNNoiseOptions } from "./options";
import { RNNoiseNode } from "./RNNoiseNode";

/**
 * A livekit track processor that reduces noise in a voice stream with RNNoise.
 */
export class RNNoiseTrackProcessor implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
  readonly name = "rnnoise-track-processor";
  processedTrack?: MediaStreamTrack | undefined;
  private audioOpts?: AudioProcessorOptions | undefined;
  private filterOpts?: RNNoiseOptions | undefined;
  private denoiseNode?: AudioWorkletNode | undefined;
  private orgSourceNode?: MediaStreamAudioSourceNode | undefined;
  private enabled: boolean = true;

  constructor(options?: RNNoiseOptions) {
    this.filterOpts = options ?? new RNNoiseOptions();
  }

  static isSupported(): boolean {
    return true;
  }

  async init(opts: AudioProcessorOptions): Promise<void> {
    if (this.filterOpts?.debugLogs) {
      console.log("RNNoiseTrackProcessor.init", opts);
    }
    await RNNoiseNode.loadModule(opts.audioContext, this.filterOpts?.workletCDNURL);

    await this._initInternal(opts, false);
  }

  async restart(opts: AudioProcessorOptions): Promise<void> {
    // restart with empty audio context
    opts.audioContext = opts.audioContext ?? this.audioOpts?.audioContext;

    if (this.filterOpts?.debugLogs) {
      console.log("RNNoiseTrackProcessor.restart", opts);
    }
    await this._initInternal(opts, true);
  }

  async onPublish(room: Room): Promise<void> {
    if (this.filterOpts?.debugLogs) {
      console.log("RNNoiseTrackProcessor.onPublish", room.name);
    }
  }

  async onUnpublish(): Promise<void> {
    if (this.filterOpts?.debugLogs) {
      console.log("RNNoiseTrackProcessor.onUnpublish");
    }
  }

  async setEnabled(enable: boolean): Promise<void> {
    if (this.filterOpts?.debugLogs) {
      console.log("RNNoiseTrackProcessor.setEnabled", enable);
    }

    if (this.denoiseNode) {
      this.enabled = enable;
      this.denoiseNode.port.postMessage({ message: "SET_ENABLED", enable });
    }
  }

  async isEnabled(): Promise<boolean> {
    if (this.denoiseNode) {
      return this.enabled;
    } else {
      return false;
    }
  }

  async destroy(): Promise<void> {
    if (this.filterOpts?.debugLogs) {
      console.log("RNNoiseTrackProcessor.destroy");
    }

    this._closeInternal();
  }

  async _initInternal(opts: AudioProcessorOptions, restart: boolean): Promise<void> {
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

import { Track } from "livekit-client";
import type { AudioProcessorOptions, Room, TrackProcessor } from "livekit-client";
import { RNNoiseOptions } from "./options";
export declare class RNNoiseTrackProcessor implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
    readonly name = "rnnoise-track-processor";
    processedTrack?: MediaStreamTrack | undefined;
    private audioOpts?;
    private filterOpts?;
    private denoiseNode?;
    private orgSourceNode?;
    private enabled;
    constructor(options?: RNNoiseOptions);
    static isSupported(): boolean;
    init(opts: AudioProcessorOptions): Promise<void>;
    restart(opts: AudioProcessorOptions): Promise<void>;
    onPublish(room: Room): Promise<void>;
    onUnpublish(): Promise<void>;
    setEnabled(enable: boolean): Promise<void>;
    isEnabled(): Promise<boolean>;
    destroy(): Promise<void>;
    _initInternal(opts: AudioProcessorOptions, restart: boolean): Promise<void>;
    _closeInternal(): void;
}

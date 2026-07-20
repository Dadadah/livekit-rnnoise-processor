# Livekit RNNoise Processor

#### A Livekit processor using RNNoise to suppress noise in input microphone streams.

This processor will resample incoming audio to 48000hz, process the audio with RNNoise, then resample the audio back to the input sample rate. If the incoming audio is already 48000hz, no resampling will occur. If the audio must be resampled, RNNoise will not perform as well, but most noise will still be suppressed. This processor only operates on a single channel, so any microphone data processed will be output as mono.

## Building WASM Module and Worklet

To build the WASM RNNoise module and Worklet, run

```
pnpm i

pnpm build:worklet
```

This will build the worklet and wasm file into the dist directory which should then be hosted by a CDN.

## Usage

### Processor

```typescript
import { RNNoiseTrackProcessor } from "livekit-rnnoise-processor";

track.setProcessor(new RNNoiseTrackProcessor());
```

By default, this library uses the worklet hosted by this repo using jsdeliver. For security reasons, you can update the CDN location of the worklet the processor uses by passing an options struct with `workletCDNURL` referencing a url. The URL must end in a slash, and the cdn must contain both RNNoiseWorklet.js and rnnoise.wasm.

```typescript
import { RNNoiseTrackProcessor } from "livekit-rnnoise-processor";

track.setProcessor(new RNNoiseTrackProcessor({ workletCDNURL: "https://example.com/file/serve/location/" }));
```

### Node

```typescript
import { RNNoiseNode } from "livekit-rnnoise-processor";

// ctx is an audio context
// outputNode is a destination media stream node

// You must always call loadModule once before instantiating nodes.
RNNoiseNode.loadModule(ctx);

const noiseSuppressionNode = new RNNoiseNode(ctx);
noiseSuppressionNode.connect(outputNode);
```

Like the processor, you can update the CDN location of the worklet the node uses by passing a string to RNNoiseNode.loadModule referencing a url. The URL must end in a slash, and the cdn must contain both RNNoiseWorklet.js and rnnoise.wasm.

```typescript
import { RNNoiseNode } from "livekit-rnnoise-processor";

// ctx is an audio context
// outputNode is a destination media stream node

// You must always call loadModule once before instantiating nodes.
RNNoiseNode.loadModule(ctx, "https://example.com/file/serve/location/");

const noiseSuppressionNode = new RNNoiseNode(ctx);
noiseSuppressionNode.connect(outputNode);
```

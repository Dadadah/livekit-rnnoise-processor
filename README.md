# Livekit rnnoise Processor

- A WebAssembly module implementing the RNNoise noise suppression library for livekit typescript.

## Building WASM Module and Worklet

To build the WASM RNNoise module and Worklet, run

```
pnpm i

pnpm build:worklet
```

This will build the worklet into the dist directory which should then be hosted by a CDN.

## Usage

```
import { DenoiseTrackProcessor } from "livekit-rnnoise-processor";

track.setProcessor(new DenoiseTrackProcessor());
```

By default, this library uses the worklet hosted by this repo using jsdeliver. For security reasons, you can update the CDN location of the worklet the processor uses by passing an options struct with `workletCDNURL` referencing a url.

```
import { DenoiseTrackProcessor } from "livekit-rnnoise-processor";

track.setProcessor(new DenoiseTrackProcessor({ workletCDNURL: "https://example.com/file/serve/location/DenoiserWorklet.js" }));
```

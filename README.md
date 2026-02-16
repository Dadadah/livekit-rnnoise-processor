# Livekit rnnoise Processor

- A WebAssembly module implementing the RNNoise noise suppression library for livekit typescript.

## Usage

```
import { DenoiseTrackProcessor } from "livekit-rnnoise-processor";

track.setProcessor(new DenoiseTrackProcessor());
```
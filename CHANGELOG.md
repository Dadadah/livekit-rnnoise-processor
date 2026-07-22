## 3.0.2

### Fix

If CDN was an empty string, the RNNoiseNode would fail to initialize. It will now default to the build in CDN if the string is empty or doesn't end in a `/`.

## 3.0.1

Identical to 3.0.0, I made a mistake when publishing the package.

## 3.0.0

### New

Add RNNoiseNode, an audio node that will reduce noise. The track processor will now use this node.

Optimizations on RNNoise WASM, buildable with `-O3` now.

Significantly better worklet performance, on my machine processing a frame went from about 0.8ms to 0.16ms.

Improved worklet build process

### Breaking Changes

DenoiseTrackProcessor was renamed to RNNoiseTrackProcessor. Implementation remains the same.

DenoiserWorklet.js was renamed to RNNoiseWorklet.js.

DenoiseOptions was renamed to RNNoiseOptions, and bufferOverflowMs was removed.

## 2.0.1

### Fix

Track would become overconstrained on initialization

## 2.0.0

### New

Add mono resampling - Processor will now resample audio to 48000hz as required by RNNoise then resample back to original rate

### Breaking Changes

WorkletCDNURL has updated to require a path ending in `/` as there are now two files that must be on CDN

## 1.1.1

Removed webpack as a dependency

Updated Readme

Allowed passing a custom cdn url for worklet for security reasons

Change lint rules

Remove publint as dev dependency

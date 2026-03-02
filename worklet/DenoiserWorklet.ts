import createRNNWasmModuleSync from "./dist/rnnoise-sync.js";

const RNNOISE_SAMPLE_LENGTH = 480;
const SHIFT_16_BIT_NR = 32768;

interface IRnnoiseModule extends EmscriptenModule {
  _rnnoise_create: () => number;
  _rnnoise_destroy: (context: number) => void;
  _rnnoise_process_frame: (context: number, output: number, input: number) => number;
}

class DenoiserWorklet extends AudioWorkletProcessor {
  private _rnWasmInterface: IRnnoiseModule;

  private _rnContext: number;
  private _rnPtr: number;

  private _queueSize: number = 4;

  private _inputBuffer: number[] = [];
  private _outputBuffer: number[] = [];
  private _frameBuffer: number[] = [];
  private _destroyed: boolean = false;
  private _debugLogs: boolean = false;
  private _vadLogs: boolean = false;
  private _shouldDenoise: boolean = true;

  constructor(options: any) {
    super();

    this._debugLogs = options.processorOptions?.debugLogs ?? false;
    this._vadLogs = options.processorOptions?.vadLogs ?? false;

    try {
      this._rnWasmInterface = createRNNWasmModuleSync() as IRnnoiseModule;
      this._rnContext = this._rnWasmInterface._rnnoise_create();
      this._rnPtr = this._rnWasmInterface._malloc(RNNOISE_SAMPLE_LENGTH * this._queueSize);

      if (this._debugLogs) {
        console.log("DenoiserWorklet.constructor options:", options, ", Context:", this._rnContext);
      }
    } catch (error) {
      if (this._debugLogs) {
        console.error("DenoiserWorklet.constructor error", error);
      }
      // release can be called even if not all the components were initialized.
      this.destroy();
      throw error;
    }

    this._handleEvent();
  }

  removeNoise() {
    let ptr = this._rnPtr;
    let st = this._rnContext;
    for (let i = 0; i < RNNOISE_SAMPLE_LENGTH; i++) {
      this._rnWasmInterface.HEAPF32[(ptr >> 2) + i] = this._frameBuffer[i] * SHIFT_16_BIT_NR;
    }
    const vadResult = this._rnWasmInterface._rnnoise_process_frame(st, ptr, ptr);
    if (this._debugLogs && this._vadLogs) {
      console.log("DenoiserWorklet.process vad:", vadResult);
    }
    for (let i = 0; i < RNNOISE_SAMPLE_LENGTH; i++) {
      this._frameBuffer[i] = this._rnWasmInterface.HEAPF32[(ptr >> 2) + i] / SHIFT_16_BIT_NR;
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    if (this._destroyed) {
      return true;
    }

    const input = inputs[0];
    const output = outputs[0];

    if (!input[0]) {
      return true;
    }

    // Drain the first channel of the input into the buffer
    this._inputBuffer.push(...input[0]);

    if (this._inputBuffer.length >= RNNOISE_SAMPLE_LENGTH) {
      if (this._shouldDenoise) {
        // Pull the first 480 samples out of the input buffer and put it into the frame buffer
        for (let i = 0; i < RNNOISE_SAMPLE_LENGTH; i++) {
          this._frameBuffer[i] = this._inputBuffer[i];
        }

        this.removeNoise();

        // Push the frame buffer into the output buffer
        // Frame buffer can exist afterwards as it will be overwritten. Saves memory.
        this._outputBuffer.push(...this._frameBuffer);
      } else {
        // copy orginal data
        this._outputBuffer.push(...this._inputBuffer.slice(0, RNNOISE_SAMPLE_LENGTH));
      }
      // Slice the input buffer afterwards
      this._inputBuffer = this._inputBuffer.slice(RNNOISE_SAMPLE_LENGTH);
    }

    if (this._outputBuffer.length >= output[0].length) {
      output.forEach((channel) => {
        for (let i = 0; i < channel.length; i++) {
          channel[i] = this._outputBuffer[i];
        }
      });
      this._outputBuffer = this._outputBuffer.slice(output[0].length);
    }

    return true;
  }

  destroy() {
    // Attempting to release a non initialized processor, do nothing.
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;

    if (this._rnContext) {
      this._rnWasmInterface._rnnoise_destroy(this._rnContext);
      this._rnContext = 0;
    }
  }

  _handleEvent() {
    this.port.onmessage = (event) => {
      if (event.data.message === "SET_ENABLED") {
        this._shouldDenoise = event.data.enable ?? this._shouldDenoise;

        if (this._debugLogs) {
          console.log("DenoiserWorklet.SET_ENABLED: ", this._shouldDenoise);
        }
      } else if (event.data.message === "DESTORY") {
        if (this._debugLogs) {
          console.log("DenoiserWorklet.DESTORY");
        }
        this.destroy();
      }
    };
  }
}
registerProcessor("DenoiserWorklet", DenoiserWorklet);

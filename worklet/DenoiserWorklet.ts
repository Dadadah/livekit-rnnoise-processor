import createRNNWasmModule from "./dist/rnnoise.js";
import MonoResampler from "./MonoResampler";

const RNNOISE_SAMPLE_LENGTH = 480;
const SHIFT_16_BIT_NR = 32768;
const RNNOISE_REQUIRED_SAMPLE_RATE = 48000;

interface IRnnoiseModule extends EmscriptenModule {
  _rnnoise_create: () => number;
  _rnnoise_destroy: (context: number) => void;
  _rnnoise_process_frame: (context: number, output: number, input: number) => number;
}

class DenoiserWorklet extends AudioWorkletProcessor {
  private _rnWasmInterface: IRnnoiseModule | undefined;

  private _rnContext: number = 0;
  private _rnPtr: number = 0;

  private _queueSize: number = 4;

  private _inputBuffer: number[] = [];
  private _outputBuffer: number[] = [];
  private _frameBuffer: Float32Array = new Float32Array(RNNOISE_SAMPLE_LENGTH);
  private _destroyed: boolean = false;
  private _debugLogs: boolean = false;
  private _vadLogs: boolean = false;
  private _shouldDenoise: boolean = true;
  private _inputResampler: MonoResampler | undefined;
  private _outputResampler: MonoResampler | undefined;

  constructor(options: AudioWorkletNodeOptions) {
    super();

    this._debugLogs = options.processorOptions?.debugLogs ?? false;
    this._vadLogs = options.processorOptions?.vadLogs ?? false;

    if (this._debugLogs) {
      console.log(`Received a sample rate of ${sampleRate}`);
    }

    if (this._debugLogs) {
      console.log("DenoiserWorklet.constructor options:", options);
    }

    this._inputResampler = new MonoResampler(sampleRate, RNNOISE_REQUIRED_SAMPLE_RATE, RNNOISE_SAMPLE_LENGTH * 2);
    this._outputResampler = new MonoResampler(RNNOISE_REQUIRED_SAMPLE_RATE, sampleRate, RNNOISE_SAMPLE_LENGTH * 2);

    this._handleEvent();

    const rnnoiseBuffer: ArrayBuffer = options.processorOptions?.rnnoiseBuffer;
    if (!rnnoiseBuffer) {
      throw "DenoiserWorklet must be initialized with an rnnoise array buffer!";
    }
    const instantiateWasm = async (info: WebAssembly.Imports | undefined, successCallback: (instance: WebAssembly.Instance, module: WebAssembly.Module) => {}) => {
      let module = new WebAssembly.Module(rnnoiseBuffer);
      let instance = new WebAssembly.Instance(module, info);
      successCallback(instance, module);
    };

    createRNNWasmModule({ instantiateWasm }).then((module) => {
      this.initRNNoise(module as IRnnoiseModule);
    });
  }

  initRNNoise(module: IRnnoiseModule) {
    try {
      this._rnWasmInterface = module;
      this._rnContext = this._rnWasmInterface._rnnoise_create();
      this._rnPtr = this._rnWasmInterface._malloc(RNNOISE_SAMPLE_LENGTH * this._queueSize);

      if (this._debugLogs) {
        console.log("DenoiserWorklet context:", this._rnContext);
      }
    } catch (error) {
      if (this._debugLogs) {
        console.error("DenoiserWorklet.constructor error", error);
      }
      // release can be called even if not all the components were initialized.
      this.destroy();
      throw error;
    }
  }

  removeNoise() {
    if (this._rnWasmInterface) {
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
    } else {
      console.error("DenoiserWorklet tried to process noise without the rnnoise wasm module");
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    // If the worklet has been destroyed, or the resamplers are undefiend (also implying destruction) then tell the browser we're ready for cleanup.
    if (this._destroyed || !this._inputResampler || !this._outputResampler) {
      return false;
    }

    // Awaiting initialization of wasm module
    if (!this._rnWasmInterface) {
      return true;
    }

    const input = inputs[0];
    const output = outputs[0];

    if (!input[0]) {
      return true;
    }

    // Drain the first channel of the input into the buffer
    this._inputBuffer.push(...this._inputResampler.resample(input[0]));

    if (this._inputBuffer.length >= RNNOISE_SAMPLE_LENGTH) {
      if (this._shouldDenoise) {
        // Pull the first 480 samples out of the input buffer and put it into the frame buffer
        for (let i = 0; i < RNNOISE_SAMPLE_LENGTH; i++) {
          this._frameBuffer[i] = this._inputBuffer[i];
        }

        this.removeNoise();

        // Push the frame buffer into the output buffer
        // Frame buffer can exist afterwards as it will be overwritten. Saves memory.
        this._outputBuffer.push(...this._outputResampler.resample(this._frameBuffer));
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
      if (this._debugLogs) {
        console.log("Destroying an already destroyed DenoiserWorklet.");
      }
      return;
    }
    this._destroyed = true;
    if (this._rnContext) {
      if (this._debugLogs) {
        console.log("Destroying rnnoise module");
      }

      this._rnWasmInterface?._rnnoise_destroy(this._rnContext);
      this._rnWasmInterface?._free(this._rnPtr);
      this._rnWasmInterface = undefined;
      this._rnContext = 0;
      this._rnPtr = 0;
    }

    this.port.close();
    this._outputBuffer = [];
    this._inputBuffer = [];
    this._inputResampler = undefined;
    this._outputResampler = undefined;
  }

  _handleEvent() {
    this.port.onmessage = (event) => {
      if (event.data.message === "SET_ENABLED") {
        this._shouldDenoise = event.data.enable ?? this._shouldDenoise;

        if (this._debugLogs) {
          console.log("DenoiserWorklet.SET_ENABLED: ", this._shouldDenoise);
        }
      } else if (event.data.message === "DESTORY" || event.data.message === "DESTROY") {
        if (this._debugLogs) {
          console.log("DenoiserWorklet.DESTROY");
        }
        this.destroy();
      }
    };
  }
}
registerProcessor("DenoiserWorklet", DenoiserWorklet);

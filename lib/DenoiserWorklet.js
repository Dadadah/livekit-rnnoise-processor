import createRNNWasmModuleSync from "./dist/rnnoise-sync.js";
import { FreeQueue, OPERATION_NONE, OPERATION_MULTIPLY, OPERATION_DIVIDE } from "./free-queue";
import lcm from "compute-lcm";
const RNNOISE_SAMPLE_LENGTH = 480;
const SHIFT_16_BIT_NR = 32768;
const PER_NODE_SAMPLES = 128;
const CHANNEL_COUNT = 2;
const PROCESS_CHANNEL_COUNT = 1;
class DenoiserWorklet extends AudioWorkletProcessor {
    _rnWasmInterface;
    _rnContext;
    _queueSize;
    _inputQueue;
    _outputQueue;
    _destroyed = false;
    _debugLogs = false;
    _vadLogs = false;
    _shouldDenoise = true;
    _numberOfChannels = 0;
    constructor(options) {
        super();
        this._debugLogs = options.processorOptions?.debugLogs ?? false;
        this._vadLogs = options.processorOptions?.vadLogs ?? false;
        this._numberOfChannels = options.processorOptions?.numberOfChannels ?? CHANNEL_COUNT;
        try {
            this._rnWasmInterface = createRNNWasmModuleSync();
            this._queueSize = lcm(RNNOISE_SAMPLE_LENGTH, PER_NODE_SAMPLES) ?? 0;
            this._inputQueue = new FreeQueue(this._rnWasmInterface, this._queueSize, this._numberOfChannels, RNNOISE_SAMPLE_LENGTH, PROCESS_CHANNEL_COUNT);
            this._outputQueue = new FreeQueue(this._rnWasmInterface, this._queueSize, this._numberOfChannels, RNNOISE_SAMPLE_LENGTH, PROCESS_CHANNEL_COUNT);
            this._rnContext = this._rnWasmInterface._rnnoise_create();
            console.log("DenoiserWorklet.constructor options:", options, ", Context:", this._rnContext);
        }
        catch (error) {
            if (this._debugLogs) {
                console.error("DenoiserWorklet.constructor error", error);
            }
            // release can be called even if not all the components were initialized.
            this.destroy();
            throw error;
        }
        this._handleEvent();
    }
    process(inputs, outputs) {
        if (this._destroyed) {
            return true;
        }
        const input = inputs[0];
        const output = outputs[0];
        if (!input[0]) {
            return true;
        }
        // mutiple
        this._inputQueue.push(input, 1, false, OPERATION_NONE);
        if (this._inputQueue.framesAvailable >= RNNOISE_SAMPLE_LENGTH) {
            if (this._shouldDenoise) {
                // single
                this._inputQueue.pull(this._inputQueue.getChannelData(0), SHIFT_16_BIT_NR, true, OPERATION_MULTIPLY);
                // single
                const vadScore = this._rnWasmInterface._rnnoise_process_frame(this._rnContext, this._outputQueue.getHeapAddress(), this._inputQueue.getHeapAddress());
                if (this._debugLogs && this._vadLogs) {
                    console.log("DenoiserWorklet.process vad:", vadScore);
                }
                // single
                this._outputQueue.push(this._outputQueue.getChannelData(0), SHIFT_16_BIT_NR, true, OPERATION_DIVIDE);
            }
            else {
                // copy org data
                this._inputQueue.pull(this._inputQueue.getChannelData(0), 1, true, OPERATION_NONE);
                this._outputQueue.push(this._inputQueue.getChannelData(0), 1, true, OPERATION_NONE);
            }
        }
        if (this._outputQueue.framesAvailable >= output[0].length) {
            this._outputQueue.pull(output, 1, false, OPERATION_NONE);
        }
        return true;
    }
    destroy() {
        // Attempting to release a non initialized processor, do nothing.
        if (this._destroyed) {
            return;
        }
        this._destroyed = true;
        if (this._inputQueue) {
            this._inputQueue.free();
        }
        if (this._outputQueue) {
            this._outputQueue.free();
        }
        if (this._rnContext) {
            this._rnWasmInterface._rnnoise_destroy(this._rnContext);
            this._rnContext = 0;
        }
    }
    _handleEvent() {
        this.port.onmessage = (event) => {
            if (event.data.message === "SET_ENABLED") {
                this._shouldDenoise = event.data.enable ?? this._shouldDenoise;
                if (!this._shouldDenoise) {
                    this._inputQueue.clear();
                    this._outputQueue.clear();
                }
                if (this._debugLogs) {
                    console.log("DenoiserWorklet.SET_ENABLED: ", this._shouldDenoise);
                }
            }
            else if (event.data.message === "DESTORY") {
                if (this._debugLogs) {
                    console.log("DenoiserWorklet.DESTORY");
                }
                this.destroy();
            }
        };
    }
}
registerProcessor("DenoiserWorklet", DenoiserWorklet);

#!/bin/bash

set -e

export OPTIMIZE=""
export LDFLAGS=${OPTIMIZE}
export CFLAGS=${OPTIMIZE}
export CXXFLAGS=${OPTIMIZE}

USE_LITE=1

ENTRY_POINT="rnnoise"
MODULE_CREATE_NAME="createRNNWasmModule"
RNN_EXPORTED_FUNCTIONS="['_rnnoise_process_frame', '_rnnoise_init', '_rnnoise_destroy', '_rnnoise_create', '_malloc', '_free']"
EXPORTED_RUNTIME_METHODS="['HEAPF32']"

if [[ $(uname) == "Darwin" ]]; then
  SO_SUFFIX="dylib"
else
  SO_SUFFIX="so"
fi

echo "============================================="
echo "Compiling wasm bindings"
echo "============================================="

(
  cd rnnoise

  ./autogen.sh

  # use little
  if [[ $USE_LITE == 1 ]]; then
    echo "Using lite mode"
    mv src/rnnoise_data.h src/rnnoise_data_big.h
    mv src/rnnoise_data.c src/rnnoise_data_big.c
    mv src/rnnoise_data_little.h src/rnnoise_data.h
    mv src/rnnoise_data_little.c src/rnnoise_data.c
  fi

  emconfigure ./configure CFLAGS=${OPTIMIZE} --enable-static=no --disable-examples --disable-doc --host=x86_64-unknown-linux-gnu 
  emmake make clean
  emmake make V=1

  emcc \
    ${OPTIMIZE} \
    -g2 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MALLOC=emmalloc \
    -s MAXIMUM_MEMORY=100MB \
    -s MODULARIZE=1 \
    -s ENVIRONMENT="worklet" \
    -s EXPORT_ES6=1 \
    -s WASM_ASYNC_COMPILATION=1 \
    -s SINGLE_FILE=0 \
    -s EXPORT_NAME=${MODULE_CREATE_NAME} \
    -s EXPORTED_FUNCTIONS="${RNN_EXPORTED_FUNCTIONS}" \
    -s EXPORTED_RUNTIME_METHODS="${EXPORTED_RUNTIME_METHODS}" \
    .libs/librnnoise.${SO_SUFFIX} \
    -o ./$ENTRY_POINT.js

  mv $ENTRY_POINT.js ../worklet/dist/
  mv $ENTRY_POINT.wasm ../worklet/dist/
)
echo "============================================="
echo "Compiling wasm bindings done"
echo "============================================="
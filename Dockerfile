FROM emscripten/emsdk:5.0.7

RUN apt-get update && \
    apt-get install -y libtool autotools-dev autoconf automake

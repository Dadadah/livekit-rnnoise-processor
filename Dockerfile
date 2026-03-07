FROM emscripten/emsdk:4.0.23

RUN apt-get update && \
    apt-get install -y libtool autotools-dev autoconf automake

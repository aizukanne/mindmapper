declare module 'lib0/encoding' {
  export interface Encoder {
    cpos: number;
    cbuf: Uint8Array;
    bufs: Uint8Array[];
  }

  export function createEncoder(): Encoder;
  export function length(encoder: Encoder): number;
  export function toUint8Array(encoder: Encoder): Uint8Array;
  export function writeVarUint(encoder: Encoder, num: number): void;
  export function writeVarUint8Array(encoder: Encoder, uint8Array: Uint8Array): void;
  export function writeUint8(encoder: Encoder, num: number): void;
  export function writeUint8Array(encoder: Encoder, uint8Array: Uint8Array): void;
}

declare module 'lib0/decoding' {
  export interface Decoder {
    arr: Uint8Array;
    pos: number;
  }

  export function createDecoder(uint8Array: Uint8Array): Decoder;
  export function readVarUint(decoder: Decoder): number;
  export function readVarUint8Array(decoder: Decoder): Uint8Array;
  export function readUint8(decoder: Decoder): number;
  export function readUint8Array(decoder: Decoder, len: number): Uint8Array;
}

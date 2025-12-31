declare module 'y-protocols/sync' {
  import type * as Y from 'yjs';
  import type { Encoder, Decoder } from 'lib0/encoding';

  export const messageYjsSyncStep1: number;
  export const messageYjsSyncStep2: number;
  export const messageYjsUpdate: number;

  export function writeSyncStep1(encoder: Encoder, doc: Y.Doc): void;
  export function writeSyncStep2(encoder: Encoder, doc: Y.Doc, encodedStateVector?: Uint8Array): void;
  export function readSyncStep1(decoder: Decoder, encoder: Encoder, doc: Y.Doc): void;
  export function readSyncStep2(decoder: Decoder, doc: Y.Doc, transactionOrigin?: unknown): void;
  export function readSyncMessage(
    decoder: Decoder,
    encoder: Encoder,
    doc: Y.Doc,
    transactionOrigin: unknown
  ): number;
  export function writeUpdate(encoder: Encoder, update: Uint8Array): void;
}

declare module 'y-protocols/awareness' {
  import type * as Y from 'yjs';

  export class Awareness {
    doc: Y.Doc;
    clientID: number;
    states: Map<number, unknown>;
    meta: Map<number, { clock: number; lastUpdated: number }>;

    constructor(doc: Y.Doc);

    getLocalState(): unknown;
    setLocalState(state: unknown): void;
    setLocalStateField(field: string, value: unknown): void;
    getStates(): Map<number, unknown>;

    on(
      event: 'update' | 'change',
      listener: (
        changes: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown
      ) => void
    ): void;
    off(
      event: 'update' | 'change',
      listener: (
        changes: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown
      ) => void
    ): void;

    destroy(): void;
  }

  export function encodeAwarenessUpdate(
    awareness: Awareness,
    clients: number[],
    states?: Map<number, unknown>
  ): Uint8Array;

  export function applyAwarenessUpdate(
    awareness: Awareness,
    update: Uint8Array,
    origin: unknown
  ): void;

  export function removeAwarenessStates(
    awareness: Awareness,
    clients: number[],
    origin: unknown
  ): void;
}

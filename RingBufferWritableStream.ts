import { RingBufferBase } from "ringbud";
import { Writable } from "stream";
import { EventEmitter } from "eventual-js";

interface IRingBufferWritableStreamReadResult {
  (): Uint8Array;

  /**
   * Reverts the last read operation. Recovering
   * the ring buffer to the previous state.
   */
  revert: () => void;
}

export interface IRingBufferWritableStreamOptions {
  writable: Writable;
  textEncoder: { encode(value: string): Uint8Array };
}

export interface IRingBufferWritableStreamEventMap {
  error: unknown;
}

export default class RingBufferWritableStream extends RingBufferBase<Uint8Array> {
  /**
   * This function is called when the writable stream is drained.
   */
  readonly #onDrain = () => {
    this.#waitingDrainEvent = false;
    this.#write();
  };

  readonly #writable;
  readonly #textEncoder;

  /**
   * Stores whether the stream needs draining or not
   */
  #pending = Promise.resolve();

  /**
   * Stores whether the stream is waiting for a drain event.
   * When this is `true`, the `Writable` stream's `write` method will not be called
   * until this is set to false.
   *
   * Instead, it will be written to the ring buffer, and the ring buffer will be consumed
   * as soon as the `drain` is emitted by the `Writable` stream.
   */
  #waitingDrainEvent = false;

  public readonly events =
    new EventEmitter<IRingBufferWritableStreamEventMap>();

  public constructor({
    textEncoder,
    writable
  }: IRingBufferWritableStreamOptions) {
    super({
      frameSize: 1,
      TypedArrayConstructor: Uint8Array
    });
    this.#writable = writable;
    this.#textEncoder = textEncoder;
    this.#writable.on("drain", this.#onDrain);
  }

  public end() {
    const result = this.drain();

    if (result !== null) {
      this.write(result);
    }
    return this.wait();
  }

  /**
   * This function serves to wait for all the pending operations
   * regarding the writable stream to finish.
   *
   * This is useful for waiting for all the write operations to finish.
   * When this function is resolved, it means that all the pending write operations
   * to the `Writable` stream have finished.
   */
  public wait() {
    return this.#pending;
  }

  public override write(value: Uint8Array | string) {
    const buffer =
      typeof value === "string" ? this.#textEncoder.encode(value) : value;

    super.write(buffer);

    this.#pending = this.#pending.then(() => this.#write());
  }

  #read() {
    const chunk = this.drain();
    if (chunk === null) {
      return null;
    }
    const result: IRingBufferWritableStreamReadResult = () => chunk;
    result.revert = () => {
      const remaining = this.drain();
      super.write(chunk);
      if (remaining !== null) {
        super.write(remaining);
      }
    };
    return result;
  }

  async #write() {
    const result = this.#read();
    if (result === null) {
      return;
    }
    if (this.#waitingDrainEvent) {
      result.revert();
      return;
    }
    const chunk = result();
    const pending = new Promise<void>((resolve, reject) => {
      this.#waitingDrainEvent = this.#writable.write(chunk, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    try {
      await pending;
    } catch (err) {
      result.revert();
      this.events.emit("error", err);
    }
  }
}

export interface ITextStreamWritable {
  write: (buffer: string) => void;
}

export interface ITextStreamOptions {
  indentationSize: number | null;
  writable: ITextStreamWritable | null;
}

export class TextStreamException {
  public constructor(public readonly what: string) {
    Object.freeze(this);
  }
}

export { TextStream };

export default class TextStream {
  readonly #indentationSize: number;
  readonly #parent;
  readonly #writable;

  #depth = 0;
  #contents = "";

  /**
   * Construct a new TextStream instance.
   * @param {Partial<ITextStreamOptions>=} options
   * @param {TextStream|null} parent
   */
  public constructor(
    {
      indentationSize = null,
      writable = null
    }: Partial<ITextStreamOptions> = {},
    parent: TextStream | null = null
  ) {
    this.#parent = parent;
    this.#writable = writable;
    if (parent !== null) {
      this.#indentationSize = parent.#indentationSize;
    } else if (indentationSize !== null) {
      this.#indentationSize = indentationSize;
    } else {
      this.#indentationSize = 4;
    }
  }

  /**
   * Return the contents of the TextStream and reset the internal buffer.
   * @throws {TextStreamException} If the TextStream is pointing to a writable.
   * @returns {string} The contents of the TextStream.
   */
  public value(): string {
    const parent = this.#closest();
    if (parent.#writable) {
      throw new TextStreamException(
        "Cannot get value from a TextStream instance pointing to a writable"
      );
    }
    const out = parent.#contents;
    parent.#contents = "";
    return out;
  }

  public write(value: string): void;
  public write(start: string, fn: () => void, end: string): void;
  public write(start: string, fn?: () => void, end?: string): void {
    this.append(this.#indent(start));
    if (typeof fn === "undefined" || typeof end === "undefined") {
      return;
    }
    this.indentBlock(fn);
    this.append(this.#indent(end));
  }

  /**
   * Append a string to the TextStream. If the TextStream is pointing to a
   * writable, the string is written to the writable. Otherwise, the string is
   * concatenated to the internal buffer.
   * @param {string} value - The string to append.
   */
  public append(value: string) {
    const cs = this.#closest();
    if (cs.#writable) {
      cs.#writable.write(value);
      return;
    }
    cs.#contents += value;
  }

  /**
   * Increment the indentation level by one, execute a function, and decrement the
   * indentation level by one. This is useful for writing code blocks that are
   * indented, such as functions, loops, conditionals, etc.
   *
   * @param {() => void} fn - The function to execute. The function should write
   * to the TextStream using the `write` or `append` methods.
   * @example
   * const cs = new TextStream();
   * cs.write("function greet(name: string) {\n");
   * cs.indentBlock(() => {
   *   cs.write("console.log(`Hello, ${name}!`);\n");
   * });
   * cs.write("}\n");
   * console.log(cs.value());
   *
   * // Prints:
   * // function greet(name: string) {
   * //   console.log(`Hello, ${name}!`);
   * // }
   */
  public indentBlock(fn: () => void) {
    this.#incrementDepth(1);
    fn();
    this.#incrementDepth(-1);
  }

  /**
   * Get the closest TextStream instance
   * @returns {TextStream}
   */
  #closest(): TextStream {
    const parent = this.#parent;
    if (parent === null) {
      return this;
    }
    return parent.#closest();
  }

  #indent(value: string) {
    const depth = this.#closest().#depth;
    return `${" ".repeat(this.#indentationSize * depth)}${value}`;
  }

  #incrementDepth(value: -1 | 1) {
    this.#closest().#depth += value;
  }
}

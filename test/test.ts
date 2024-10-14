import test from "ava";
import fs from "node:fs";
import path from "node:path";
import RingBufferWritableStream from "../RingBufferWritableStream";
import TextStream, { TextStreamException } from "..";
import { spy } from "sinon";

const fixturesDir = path.resolve(__dirname, "./fixtures");

test("RingBufferWritableStream: should write to a stream", async t => {
  const writable = fs.createWriteStream(
    path.resolve(fixturesDir, "test-writable.ts")
  );
  const rb = new RingBufferWritableStream({
    writable,
    textEncoder: new TextEncoder()
  });

  const cs = new TextStream({
    writable: rb,
    indentationSize: 2
  });

  cs.write(
    "export interface ITest {\n",
    () => {
      cs.write("name: string;\n");
    },
    "}\n"
  );

  await rb.end();

  t.deepEqual(
    await fs.promises.readFile(
      path.resolve(fixturesDir, "expected_test-writable.ts")
    ),
    await fs.promises.readFile(path.resolve(fixturesDir, "test-writable.ts"))
  );
});

test("TextStream: should incrementally write to a writable stream", t => {
  const write = spy((_: string) => {});

  const cs = new TextStream({
    writable: {
      write
    },
    indentationSize: 2
  });

  cs.write(
    "export interface ITest {\n",
    () => {
      cs.write("name: string;\n");
    },
    "}\n"
  );

  t.assert(write.calledWithExactly("export interface ITest {\n"));
  t.assert(write.calledWithExactly("  name: string;\n"));
  t.assert(write.calledWithExactly("}\n"));
  t.deepEqual(write.callCount, 3);
});

test("TextStream#indentBlock to increase the depth by one", t => {
  const write = spy((_: string) => {});

  const cs = new TextStream({
    writable: {
      write
    },
    indentationSize: 2
  });

  cs.write(
    "export interface ITest {\n",
    () => {
      cs.indentBlock(() => {
        cs.write("name: string;\n");
      });
    },
    "}\n"
  );

  t.assert(write.calledWithExactly("export interface ITest {\n"));
  t.assert(write.calledWithExactly("    name: string;\n"));
  t.assert(write.calledWithExactly("}\n"));
  t.deepEqual(write.callCount, 3);
});

test("TextStream to inherit indentation size from parent", t => {
  const write = spy((_: string) => {});

  const parent = new TextStream({
    writable: {
      write
    },
    indentationSize: 2
  });

  const cs = new TextStream(
    {
      indentationSize: 4
    },
    parent
  );

  cs.indentBlock(() => {
    cs.write("test 1\n");
    cs.indentBlock(() => {
      cs.write("test 2\n");
    });
  });

  t.assert(write.calledWithExactly("  test 1\n"));
  t.assert(write.calledWithExactly("    test 2\n"));
  t.deepEqual(write.callCount, 2);
});

test("TextStream to respect indentation size", t => {
  const write = spy((_: string) => {});

  const cs = new TextStream({
    writable: {
      write
    },
    indentationSize: 4
  });

  cs.write(
    "export interface ITest {\n",
    () => {
      cs.indentBlock(() => {
        cs.write("name: string;\n");
      });
    },
    "}\n"
  );

  t.assert(write.calledWithExactly("export interface ITest {\n"));
  t.assert(write.calledWithExactly("        name: string;\n"));
  t.assert(write.calledWithExactly("}\n"));
  t.deepEqual(write.callCount, 3);
});

test("TextStream to default to indentation size equal 4", t => {
  const write = spy((_: string) => {});
  const cs = new TextStream({
    writable: {
      write
    }
  });

  cs.write(
    "export interface ITest {\n",
    () => {
      cs.indentBlock(() => {
        cs.write("name: string;\n");
      });
    },
    "}\n"
  );
  t.assert(write.calledWithExactly("export interface ITest {\n"));
  t.assert(write.calledWithExactly("        name: string;\n"));
  t.assert(write.calledWithExactly("}\n"));
  t.deepEqual(write.callCount, 3);
});

test("TextStream#value to throw if writable is set and this method is called", t => {
  const write = spy((_: string) => {});
  const cs = new TextStream({
    writable: {
      write
    }
  });

  cs.write("test\n");
  cs.write("test\n");
  cs.write("test\n");
  cs.write("test\n");

  t.throws(
    () => {
      cs.value();
    },
    {
      any: true,
      instanceOf: TextStreamException
    }
  );
});

test("TextStream#value to return the contents of the TextStream", t => {
  const cs = new TextStream();
  cs.write("test\n");
  cs.write("test\n");
  cs.write("test\n");
  cs.write("test\n");
  t.is(cs.value(), "test\ntest\ntest\ntest\n");
});

import { afterEach, expect, test, vi } from 'vitest';
import { StrokeCompiler } from '../../src/app/stroke-compiler';
import { defaultCircuit } from '../../src/content/circuits';
import { compileRoute } from '../../src/core/route';

class TestWorker {
  static latest: TestWorker;
  constructor() { TestWorker.latest = this; }
  postMessage = vi.fn();
  terminate = vi.fn();
  onerror = (_event: { preventDefault(): void }) => {};
  onmessage = (_event: { data: unknown }) => {};
}
const track = defaultCircuit.track;
afterEach(() => vi.unstubAllGlobals());

test('only the current stroke and drawing turn can publish a preview', () => {
  vi.stubGlobal('Worker', TestWorker);
  const compiler = new StrokeCompiler(), accept = vi.fn();
  compiler.prepare(track);
  const worker = TestWorker.latest, result = compileRoute([], track);
  const submit = () => {
    compiler.compile([], track, accept);
    return worker.postMessage.mock.lastCall![0].id;
  };
  const canceled = submit();
  compiler.cancel();
  worker.onmessage({ data: { id: canceled, result } });
  const superseded = submit(), current = submit();
  worker.onmessage({ data: { id: superseded, result } });
  expect(accept).not.toHaveBeenCalled();
  worker.onmessage({ data: { id: current, result } });
  expect(accept).toHaveBeenCalledExactlyOnceWith(result);
  const retired = submit();
  compiler.prepare(track);
  worker.onmessage({ data: { id: retired, result } });
  worker.onerror({ preventDefault() {} });
  expect(accept).toHaveBeenCalledTimes(1);
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(TestWorker.latest.terminate).not.toHaveBeenCalled();
});

test('a worker load failure uses the same compiler for an outstanding and subsequent stroke', () => {
  vi.stubGlobal('Worker', TestWorker);
  const compiler = new StrokeCompiler(), accept = vi.fn(), result = compileRoute([], track);
  compiler.prepare(track);
  compiler.compile([], track, accept);
  TestWorker.latest.onerror({ preventDefault() {} });
  compiler.compile([], track, accept);
  expect(accept.mock.calls).toEqual([[result], [result]]);
});

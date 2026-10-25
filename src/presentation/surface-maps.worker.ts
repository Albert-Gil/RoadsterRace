import { detailMap } from './surface-maps';
import type { SurfaceKind } from './themes';

// Off-main-thread generation of the procedural detail tiles (see surface-maps.ts).
self.onmessage = (event: MessageEvent<{ id: number; kind: SurfaceKind; size: number }>) => {
  const { id, kind, size } = event.data, pixels = detailMap(kind, size).slice();
  (self as unknown as Worker).postMessage({ id, pixels }, [pixels.buffer]);
};

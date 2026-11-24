import { compileRoute } from '../core/route';
import type { DrawSample, TrackDefinition } from '../core/types';

export type StrokeRequest = { track: TrackDefinition } | { id: number; stroke: DrawSample[] };
let track: TrackDefinition;
self.onmessage = ({ data }: MessageEvent<StrokeRequest>) => {
  if ('track' in data) track = data.track;
  else self.postMessage({ id: data.id, result: compileRoute(data.stroke, track) });
};

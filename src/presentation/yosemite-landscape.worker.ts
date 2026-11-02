import { yosemiteTrack } from '../core/tracks/yosemite';
import { transferables, yosemiteLandscapeData } from './yosemite-landscape-data';

// Off-main-thread generation of Capitan Yosemite's valley scenery (see yosemite-landscape-data.ts).
self.onmessage = (event: MessageEvent<{ trackVersion: number }>) => {
  const post = (self as unknown as Worker).postMessage.bind(self);
  try {
    if (event.data.trackVersion !== yosemiteTrack.version) throw new Error(`track v${event.data.trackVersion} requested, worker has v${yosemiteTrack.version}`);
    const data = yosemiteLandscapeData(yosemiteTrack); post({ data }, transferables(data));
  } catch (error) { post({ error: String(error) }); }
};

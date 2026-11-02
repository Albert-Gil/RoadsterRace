import { snowyTahoeTrack } from '../core/tracks/snowy-tahoe';
import { tahoeLandscapeData, tahoeTransferables } from './tahoe-landscape-data';

// Off-main-thread generation of Snowy Tahoe's forest and snow hills (see tahoe-landscape-data.ts).
self.onmessage = (event: MessageEvent<{ trackVersion: number }>) => {
  const post = (self as unknown as Worker).postMessage.bind(self);
  try {
    if (event.data.trackVersion !== snowyTahoeTrack.version) throw new Error(`track v${event.data.trackVersion} requested, worker has v${snowyTahoeTrack.version}`);
    const data = tahoeLandscapeData(snowyTahoeTrack); post({ data }, tahoeTransferables(data));
  } catch (error) { post({ error: String(error) }); }
};

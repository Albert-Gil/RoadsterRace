import { RULES } from './rules';
import type { TrackDefinition } from './types';

// Immutable rules make these safe to share: no new profile allocation on each physics query.
const asphalt=Object.freeze({road:'asphalt' as const,loose:'sand' as const,grip:RULES.asphaltGrip,looseGrip:RULES.sandGrip,drag:RULES.sandDrag});
const dirt=Object.freeze({...asphalt,road:'packed-dirt' as const,grip:RULES.dirtGrip});
const snow=Object.freeze({road:'packed-snow' as const,loose:'deep-snow' as const,grip:RULES.snowGrip,looseGrip:RULES.snowLooseGrip,drag:RULES.snowDrag});

/** Physical surface profiles; presentation chooses textures/sounds separately. */
export function trackSurface(track: TrackDefinition) {
  return track.surface==='packed-snow'?snow:track.surface==='packed-dirt'?dirt:asphalt;
}

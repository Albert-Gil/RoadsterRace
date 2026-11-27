/**
 * Room codes are one everyday English word and one digit from 2–9 (TIGER7), easy to say aloud or type on a
 * phone in any case: 256 × 8 = 2048 codes (0 and 1 are left out beside letters like O and I). Collisions are
 * retried; repeated wrong guesses are refused (server/join-limiter.ts), and invite links also carry the room's
 * creation stamp, so an old link never lands in a newer room that reuses the code.
 */
export const ROOM_WORDS: readonly string[] = [
  'APPLE','ARROW','BADGE','BAGEL','BAKER','BEACH','BEAN','BEAR','BELL','BERRY','BIKE','BIRD','BLAZE','BLOOM',
  'BOAT','BOLT','BOOK','BOOT','BRAVE','BREAD','BREEZE','BRICK','BRIDGE','BROOK','BRUSH','BUNNY','CABIN',
  'CACTUS','CAKE','CAMEL','CAMP','CANDY','CANOE','CANYON','CAPE','CARD','CARGO','CASTLE','CEDAR','CHALK',
  'CHERRY','CHESS','CHIP','CIRCUS','CLIFF','CLOCK','CLOUD','CLOVER','COAST','COCOA','COMET','CORAL','CORN',
  'COTTON','CRANE','CRAYON','CREEK','CROWN','CUBE','DAISY','DANCE','DELTA','DESERT','DIAMOND','DOLPHIN',
  'DONUT','DRAGON','DREAM','DRUM','DUNE','EAGLE','EARTH','ECHO','EMBER','FALCON','FARM','FEATHER','FERN',
  'FIELD','FIG','FINCH','FLAG','FLAME','FLASH','FLUTE','FOREST','FOX','FROG','FROST','GALAXY','GARDEN','GEAR',
  'GECKO','GIANT','GINGER','GLOBE','GOAT','GOLD','GRAPE','GUITAR','HARBOR','HAWK','HAZEL','HERO','HILL',
  'HONEY','HORSE','IGLOO','ISLAND','JACKET','JADE','JAZZ','JELLY','JUNGLE','KAYAK','KETTLE','KITE','KIWI',
  'KOALA','LADDER','LAKE','LANTERN','LASER','LEMON','LIGHT','LILY','LION','LLAMA','LOTUS','LUCKY','MAGIC',
  'MANGO','MAPLE','MARBLE','MEADOW','MELON','METEOR','MINT','MOON','MOOSE','MOTOR','MUFFIN','NEST','NOODLE',
  'NORTH','OAK','OCEAN','OLIVE','ORANGE','ORBIT','OTTER','OWL','PANDA','PAPER','PARROT','PEACH','PEAR',
  'PEBBLE','PENCIL','PEPPER','PIANO','PICNIC','PILOT','PINE','PIZZA','PLANET','PLUM','POLAR','PONY','POPCORN',
  'PUFFIN','PUMPKIN','PUZZLE','QUAIL','QUEST','RABBIT','RACER','RADAR','RAIN','RAVEN','REEF','RIVER','ROBIN',
  'ROBOT','ROCKET','ROSE','RUBY','SAFARI','SAIL','SALSA','SAND','SATURN','SCARF','SHELL','SHIP','SILVER',
  'SKATE','SKY','SLED','SMILE','SNOW','SOCK','SOLAR','SONIC','SPARK','SPRING','SQUID','STAR','STONE','STORM',
  'SUGAR','SUMMER','SUNNY','SWAN','TACO','TANGO','TIGER','TOAST','TOMATO','TOPAZ','TORCH','TOWER','TRAIN',
  'TRUCK','TULIP','TURBO','TURTLE','UNICORN','VALLEY','VELVET','VIOLIN','VOLCANO','WAFFLE','WALNUT','WATER',
  'WAVE','WHALE','WILLOW','WIND','WINTER','WIZARD','WOLF','YACHT','YOGURT','ZEBRA','ZIPPER','ZOOM','BANJO',
  'BISON','BUTTER','CAMERA','CLAM','COBRA','COOKIE','COYOTE','DINGO'
];
const WORD_SET = new Set(ROOM_WORDS);

export const ROOM_DIGITS = '23456789';
export function newRoomCode(random: (n: number) => Uint8Array): string {
  const [word, digit] = random(2);
  return ROOM_WORDS[word % ROOM_WORDS.length] + ROOM_DIGITS[digit % ROOM_DIGITS.length];
}

export type CodeCheck = { ok: true; code: string } | { ok: false; reason: 'old-invite' | 'invalid' };
/** Normalizes what a player typed or an invite carried. Codes from older releases get their own message. */
export function checkRoomCode(input: string): CodeCheck {
  const code = input.trim().toUpperCase().replace(/[\s-]/g, '');
  const match = /^([A-Z]{3,7})([0-9])$/.exec(code);
  if (match && WORD_SET.has(match[1]) && ROOM_DIGITS.includes(match[2])) return { ok: true, code };
  // Earlier releases used a plain word, 6 characters from A–Z/2–9, and before that 9–10 random characters.
  if (WORD_SET.has(code) || /^[A-HJKMNP-Z2-9]{6}$/.test(code) && /\d/.test(code) || /^[A-Za-z0-9_-]{9,10}$/.test(input.trim())) return { ok: false, reason: 'old-invite' };
  return { ok: false, reason: 'invalid' };
}

export interface ServerVersions { protocol: number; physics: number; compiler: number; tracks: Record<string, number> }
export type Compatibility = 'match' | 'client-outdated' | 'server-outdated';
/** Versions only increase, so whichever side reports a lower number is the stale one. */
export function compareVersions(server: ServerVersions, local: ServerVersions): Compatibility {
  const pairs: [number, number][] = [[server.protocol, local.protocol], [server.physics, local.physics], [server.compiler, local.compiler],
    ...Object.entries(server.tracks).filter(([id]) => id in local.tracks).map(([id, v]) => [v, local.tracks[id]] as [number, number])];
  if (pairs.some(([s, l]) => s > l)) return 'client-outdated';
  if (pairs.some(([s, l]) => s < l)) return 'server-outdated';
  return 'match';
}

/** Invite links carry the room's creation time in seconds, base 36 (`&since=`). */
export const encodeSince = (createdMs: number) => Math.floor(createdMs / 1000).toString(36);
export function decodeSince(value: string | null | undefined): number | undefined {
  if (!value || !/^[0-9a-z]{1,9}$/.test(value)) return undefined;
  const seconds = parseInt(value, 36);
  return Number.isSafeInteger(seconds) ? seconds : undefined;
}

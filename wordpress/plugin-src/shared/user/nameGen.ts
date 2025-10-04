// shared/user/nameGen.ts
// single allocation: this module is loaded once

// --- pools ---
export const FIRST_NAMES_MALE = [
  'Jack','John','James','Jacob','Joshua','Joseph','Jason','Justin','Jonathan','Jeremy',
  'Jeffrey','George','Gavin','Liam','Noah','Ethan','Logan','Lucas','Henry','William',
  'Michael','David','Daniel','Matthew','Andrew','Anthony','Alexander','Samuel','Benjamin','Christopher',
  'Ryan','Thomas','Nathan','Nicholas','Tyler','Adam','Aaron','Dylan','Brandon','Eric',
] as const;

export const FIRST_NAMES_FEMALE = [
  'Lisa','Emma','Olivia','Sophia','Ava','Mia','Amelia','Isabella','Charlotte','Emily',
  'Abigail','Harper','Evelyn','Ella','Chloe','Grace','Lily','Madison','Aria','Zoe',
  'Hannah','Natalie','Victoria','Nora','Aurora','Stella','Lucy','Samantha','Leah','Sarah',
  'Audrey','Claire','Savannah','Brooklyn','Paisley','Penelope','Layla','Mila','Scarlett','Ellie',
] as const;

export const FIRST_NAMES_UNISEX = [
  'Alex','Sam','Taylor','Jordan','Jamie','Casey','Riley','Morgan','Cameron','Quinn',
  'Avery','Charlie','Dakota','Finley','Hayden','Parker','Rowan','Skyler','Reese','Sidney',
] as const;

export const FUN_LAST_NAMES = [
  'The Brave','The Swift','The Bold','The Clever','The Noble','The Jolly','The Quiet','The Lucky','The Sly','The Sunny',
  'The Curious','The Fearless','The Merry','The Witty','The Kind','The Gentle','The Quick','The Eager','The Bright','The Calm',
  'From Underworld','Of the North','Of the Valley','Of the Coast','Of the Highlands','Of the Lowlands','Of the River','Of the Forest','Of the Desert','Of the Islands',
  'Storm Rider','Night Walker','Shadow Runner','Trail Blazer','Star Gazer','Moon Dancer','Sun Chaser','Wind Whisperer','Dream Weaver','Stone Breaker',
  'Fire Keeper','Mist Walker','Sky Painter','Code Wizard','Bug Slayer','Pixel Pusher','Data Diver','Logic Tamer','Syntax Samurai','Signal Seeker',
] as const;

// --- utils ---
const fyShuffle = <T,>(arr: readonly T[], rng = Math.random): T[] => {
  const a = arr.slice() as T[];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const makeCycler = <T,>(arr: readonly T[], rng = Math.random) => {
  let pool = fyShuffle(arr, rng);
  let i = 0;
  return () => {
    const v = pool[i++];
    if (i >= pool.length) {
      pool = fyShuffle(arr, rng);
      i = 0;
    }
    return v;
  };
};

// one cycler per pool (module-level, no re-allocation)
const nextMale    = makeCycler(FIRST_NAMES_MALE);
const nextFemale  = makeCycler(FIRST_NAMES_FEMALE);
const nextUnisex  = makeCycler(FIRST_NAMES_UNISEX);
const nextLast    = makeCycler(FUN_LAST_NAMES);

// weighted bucket with anti-streak (max 2 in a row)
type Bucket = 'male'|'female'|'unisex';
let lastBucket: Bucket | null = null;
let streak = 0;

const pickBucket = (rng = Math.random): Bucket => {
  let b: Bucket;
  for (let tries = 0; tries < 3; tries++) {
    const r = rng();
    b = r < 0.4 ? 'male' : r < 0.8 ? 'female' : 'unisex';
    if (!(streak >= 2 && b === lastBucket)) break;
  }
  if (b === lastBucket) streak++; else { lastBucket = b; streak = 1; }
  return b!;
};

export const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 150);

// --- public API ---
export function getRandomDisplayName() {
  const bucket = pickBucket();
  const first =
    bucket === 'male' ? nextMale()
  : bucket === 'female' ? nextFemale()
  : nextUnisex();

  const last = nextLast();
  return { first, last, bucket };
}

export function getRandomUsername(prefix = 'demo') {
  const { first, last } = getRandomDisplayName();
  return toSlug(`${prefix}-${first}-${last}`);
}

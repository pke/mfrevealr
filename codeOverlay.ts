// Where on the screen a scanned code is, so its figure can be drawn on it.

export type Rect = {x: number; y: number; width: number; height: number};
type Size = {width: number; height: number};

/**
 * Turns a code's frame from the camera's coordinates into the camera view's,
 * which shows the picture upright and scaled to fill (cropping the sides).
 * iOS reports codes in the sensor's own landscape space; Android reports
 * them upright already, in a frame whose size it gives unturned. Only
 * portrait views are handled; a landscape one gets undefined.
 */
export function codeToView(
  rect: Rect,
  frame: Size,
  view: Size,
  platform: string,
): Rect | undefined {
  if (view.width > view.height) {
    return undefined;
  }
  const landscape = frame.width > frame.height;
  const upright: Size = landscape
    ? {width: frame.height, height: frame.width}
    : frame;
  // A quarter turn clockwise: the sensor's left edge becomes the top.
  const turned =
    platform === 'ios' && landscape
      ? {
          x: frame.height - rect.y - rect.height,
          y: rect.x,
          width: rect.height,
          height: rect.width,
        }
      : rect;
  const scale = Math.max(
    view.width / upright.width,
    view.height / upright.height,
  );
  const left = (view.width - upright.width * scale) / 2;
  const top = (view.height - upright.height * scale) / 2;
  return {
    x: left + turned.x * scale,
    y: top + turned.y * scale,
    width: turned.width * scale,
    height: turned.height * scale,
  };
}

type Velocity = {x: number; y: number};
/**
 * A figure on its code; `velocity` (points a second) says where it heads.
 * Tracked markers have an `id` of their own, as two boxes can hold the
 * same figure.
 */
export type Marker = {
  code: string;
  rect: Rect;
  velocity?: Velocity;
  id?: string;
};

// Markers lock onto their codes. Held still, a box's code is read a few
// points off each time: the marker ignores that and stands still. Once the
// code really moves, the marker follows a tracker of its place and speed (an
// alpha-beta filter, which keeps up with a steadily moving box) and is drawn
// a little ahead, for the time a reading takes to reach the screen. Slowed
// down, it comes to rest with the box.
const ALPHA = 0.7;
const BETA = 0.25;
// How far a code may wander, as a share of its size, before the marker moves.
const LOCK = 0.12;
const MIN_LOCK = 3;
// Points a second: slower than this, a moving marker comes to rest.
const REST_SPEED = 25;
const LEAD_MS = 20;
// Size changes smaller than this share are left out at rest.
const RESIZE = 0.1;
// Moved further than this many code sizes at once, a box was moved: the
// marker goes straight there.
const JUMP = 1.5;
// How much of a reading's size goes into the tracked size.
const SIZING = 0.5;
// Readings are timed as the app gets to them: held up, several come in at
// once. The camera reads no faster than its frames, so readings closer than
// one are taken a frame apart.
const FRAME_S = 1 / 30;
// A code's way is foreseen this far at most, as after a pause it's unknown.
const FORESEE_S = 0.1;
// A code read again this long after it was lost keeps its marker.
const KEEP_MS = 2000;
// The camera reports every code in view in every frame, and once with none
// when the last one leaves. A code missing from its readings this long is
// gone; a frame that misses it now and then is bridged.
const LOST_MS = 100;

const STILL: Velocity = {x: 0, y: 0};

type Tracked = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  moving: boolean;
  shown: Marker;
  at: number;
  // When the camera first read on without this code.
  missedSince?: number;
};

const centerOf = (rect: Rect) => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});

const around = (x: number, y: number, width: number, height: number) => ({
  x: x - width / 2,
  y: y - height / 2,
  width,
  height,
});

function track(id: string, code: string, rect: Rect, at: number): Tracked {
  const {x, y} = centerOf(rect);
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    width: rect.width,
    height: rect.height,
    moving: false,
    shown: {id, code, rect, velocity: STILL},
    at,
  };
}

/** The time from one reading to the next, in seconds. */
const apart = (before: Tracked, at: number) =>
  Math.max(FRAME_S, (at - before.at) / 1000);

/** Where a tracked code is expected by `at`. */
function foreseen(before: Tracked, at: number) {
  const seconds = Math.min(FORESEE_S, apart(before, at));
  return {
    x: before.x + before.vx * seconds,
    y: before.y + before.vy * seconds,
  };
}

/** How far off a reading is from where its code was expected. */
function offset(before: Tracked, rect: Rect, at: number) {
  const reading = centerOf(rect);
  const expected = foreseen(before, at);
  return Math.hypot(reading.x - expected.x, reading.y - expected.y);
}

/** A reading this far off its tracked code is a box moved at once. */
const jumped = (before: Tracked, rect: Rect, at: number) =>
  offset(before, rect, at) > JUMP * Math.max(before.width, before.height);

function follow(before: Tracked, rect: Rect, at: number): Tracked {
  const seconds = apart(before, at);
  const {id} = before;
  const {code} = before.shown;
  if (jumped(before, rect, at)) {
    return track(id, code, rect, at);
  }
  const reading = centerOf(rect);
  const {x: px, y: py} = foreseen(before, at);
  const rx = reading.x - px;
  const ry = reading.y - py;
  const x = px + ALPHA * rx;
  const y = py + ALPHA * ry;
  const vx = before.vx + (BETA * rx) / seconds;
  const vy = before.vy + (BETA * ry) / seconds;
  const width = before.width + SIZING * (rect.width - before.width);
  const height = before.height + SIZING * (rect.height - before.height);
  const shownRect = before.shown.rect;
  const shownAt = centerOf(shownRect);
  const radius = Math.max(MIN_LOCK, LOCK * Math.max(width, height));
  const moving = before.moving
    ? Math.hypot(vx, vy) >= REST_SPEED
    : Math.hypot(x - shownAt.x, y - shownAt.y) > radius;
  const next = {id, x, y, vx, vy, width, height, moving, at};
  if (moving) {
    const lead = LEAD_MS / 1000;
    const shown = {
      id,
      code,
      rect: around(x + vx * lead, y + vy * lead, width, height),
      velocity: {x: vx, y: vy},
    };
    return {...next, shown};
  }
  if (before.moving) {
    // Coming to rest, right where the box is.
    return {
      ...next,
      shown: {id, code, rect: around(x, y, width, height), velocity: STILL},
    };
  }
  const resized =
    Math.abs(width - shownRect.width) > RESIZE * shownRect.width ||
    Math.abs(height - shownRect.height) > RESIZE * shownRect.height;
  return {
    ...next,
    shown: resized
      ? {
          id,
          code,
          rect: around(shownAt.x, shownAt.y, width, height),
          velocity: STILL,
        }
      : before.shown,
  };
}

/**
 * The figures to draw on their codes, locked onto them. A marker goes soon
 * after the camera reads on without its code. When no reading comes in at
 * all, as while they are held up, it stays `holdMs` after its last one.
 * Read again soon after, a code gets its marker back. Each box gets a marker of its own,
 * even boxes of the same figure. Listeners hear of
 * every reading. A marker unchanged keeps its object.
 */
export function createMarkers(holdMs = 1000) {
  // By marker id.
  const seen = new Map<string, Tracked>();
  const listeners = new Set<() => void>();
  let made = 0;
  return {
    see(markers: Marker[], now: number) {
      // Each code read goes to the nearest marker of its figure in reach,
      // nearest first, so boxes of the same figure keep their own.
      const pairs: {reading: number; tracked: Tracked; off: number}[] = [];
      markers.forEach(({code, rect}, reading) => {
        for (const tracked of seen.values()) {
          if (tracked.shown.code === code && !jumped(tracked, rect, now)) {
            pairs.push({reading, tracked, off: offset(tracked, rect, now)});
          }
        }
      });
      pairs.sort((a, b) => a.off - b.off);
      const matched = new Map<number, Tracked>();
      const taken = new Set<string>();
      for (const {reading, tracked} of pairs) {
        if (!matched.has(reading) && !taken.has(tracked.id)) {
          matched.set(reading, tracked);
          taken.add(tracked.id);
        }
      }
      markers.forEach(({code, rect}, reading) => {
        // A box moved far at once takes a marker of its figure left over;
        // any other is a box of its own.
        const before =
          matched.get(reading) ??
          [...seen.values()].find(
            tracked => tracked.shown.code === code && !taken.has(tracked.id),
          );
        const id = before?.id ?? `${code}#${++made}`;
        const after = before
          ? follow(before, rect, now)
          : track(id, code, rect, now);
        taken.add(id);
        seen.set(id, after);
      });
      for (const [id, tracked] of seen) {
        if (!taken.has(id) && tracked.missedSince === undefined) {
          seen.set(id, {...tracked, missedSince: now});
        }
      }
      listeners.forEach(listener => listener());
    },
    visible(now: number): Marker[] {
      const shown: Marker[] = [];
      for (const [id, tracked] of seen) {
        if (now - tracked.at > KEEP_MS) {
          seen.delete(id);
        } else if (
          now - tracked.at <= holdMs &&
          !(
            tracked.missedSince !== undefined &&
            now - tracked.missedSince >= LOST_MS
          )
        ) {
          shown.push(tracked.shown);
        }
      }
      return shown;
    },
    listen(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clear() {
      seen.clear();
      listeners.forEach(listener => listener());
    },
  };
}

export type Markers = ReturnType<typeof createMarkers>;

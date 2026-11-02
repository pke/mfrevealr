/**
 * Which codes are new in view. The camera reports a box many times a second
 * while it stays in front of it, and with two boxes in view it reports them
 * in turn; either way each box counts once. A box counts again only after it
 * has been out of view for `holdMs`.
 */
export function createSightings(holdMs = 1500, now: () => number = Date.now) {
  const lastSeen = new Map<string, number>();
  return {
    /** Records a sighting; true when the code wasn't in view just now. */
    see(code: string): boolean {
      const time = now();
      const before = lastSeen.get(code);
      lastSeen.set(code, time);
      for (const [other, seen] of lastSeen) {
        if (time - seen > holdMs) {
          lastSeen.delete(other);
        }
      }
      return before === undefined || time - before > holdMs;
    },
    /** Forgets every box, so the next sighting counts again. */
    clear() {
      lastSeen.clear();
    },
  };
}

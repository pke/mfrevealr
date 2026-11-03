import {codeToView, createMarkers} from './codeOverlay';

// A portrait phone screen and the camera's landscape 1080p frames.
const VIEW = {width: 390, height: 844};
const FRAME = {width: 1920, height: 1080};
// The upright 1080 × 1920 picture fills the screen's height and spills over
// its sides: 0.4396 points per pixel, 42.4 points cut off left and right.
const SCALE = 844 / 1920;
const CUT = (1080 * SCALE - 390) / 2;

const center = (rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});

describe('On iOS, codes come in the sensor’s landscape space', () => {
  test('the middle of the picture is the middle of the screen', () => {
    const rect = codeToView(
      {x: 910, y: 490, width: 100, height: 100},
      FRAME,
      VIEW,
      'ios',
    )!;
    expect(center(rect).x).toBeCloseTo(195, 5);
    expect(center(rect).y).toBeCloseTo(422, 5);
    expect(rect.width).toBeCloseTo(100 * SCALE, 5);
  });

  test('turned upright: the sensor’s top left is the screen’s top right', () => {
    const rect = codeToView(
      {x: 0, y: 0, width: 40, height: 20},
      FRAME,
      VIEW,
      'ios',
    )!;
    // 20 px tall on the sensor is 20 px wide upright, at the right edge.
    expect(rect.x + rect.width).toBeCloseTo(1080 * SCALE - CUT, 5);
    expect(rect.y).toBeCloseTo(0, 5);
    expect(rect.width).toBeCloseTo(20 * SCALE, 5);
    expect(rect.height).toBeCloseTo(40 * SCALE, 5);
  });
});

describe('On Android, codes come upright in a frame given unturned', () => {
  test('a code keeps its place, scaled onto the screen', () => {
    const rect = codeToView(
      {x: 0, y: 0, width: 100, height: 50},
      {width: 1280, height: 720},
      VIEW,
      'android',
    )!;
    const scale = Math.max(390 / 720, 844 / 1280);
    expect(rect.x).toBeCloseTo((390 - 720 * scale) / 2, 5);
    expect(rect.y).toBeCloseTo((844 - 1280 * scale) / 2, 5);
    expect(rect.width).toBeCloseTo(100 * scale, 5);
    expect(rect.height).toBeCloseTo(50 * scale, 5);
  });
});

test('A landscape screen gets no markers', () => {
  expect(
    codeToView(
      {x: 0, y: 0, width: 10, height: 10},
      FRAME,
      {width: 1024, height: 768},
      'ios',
    ),
  ).toBeUndefined();
});

describe('Markers', () => {
  const rect = {x: 10, y: 20, width: 40, height: 40};
  // 30 readings a second.
  const EVERY = 33;

  test('follow each figure’s code', () => {
    const markers = createMarkers(500);
    markers.see([{code: 'A', rect}], 0);
    for (let t = 1; t <= 20; t++) {
      markers.see([{code: 'A', rect: {...rect, x: 40}}], t * EVERY);
    }
    const [marker] = markers.visible(20 * EVERY);
    expect(marker.code).toBe('A');
    expect(Math.abs(marker.rect.x - 40)).toBeLessThan(1);
  });

  test('stand still while the box is held still', () => {
    const markers = createMarkers(500);
    markers.see([{code: 'A', rect}], 0);
    const [first] = markers.visible(0);
    // The same code read a few points off, every which way.
    const jitter = [3, -3, 2, -2, 3, 1, -3, 2, -1, 3, -3, 2];
    jitter.forEach((dx, i) => {
      const dy = jitter[(i + 5) % jitter.length];
      const at = (i + 1) * EVERY;
      markers.see(
        [
          {
            code: 'A',
            rect: {...rect, x: rect.x + dx, y: rect.y + dy, width: 40 + dx},
          },
        ],
        at,
      );
      const [marker] = markers.visible(at);
      expect(marker.rect).toBe(first.rect);
      expect(marker.velocity).toEqual({x: 0, y: 0});
    });
  });

  test('stay locked on a box that moves', () => {
    const markers = createMarkers(500);
    // 240 points a second.
    for (let t = 0; t <= 30; t++) {
      markers.see([{code: 'A', rect: {...rect, x: rect.x + t * 8}}], t * EVERY);
    }
    const [marker] = markers.visible(30 * EVERY);
    // Never behind the box, drawn ahead by less than the next reading, for
    // the time this one takes to reach the screen.
    const ahead = marker.rect.x - (rect.x + 30 * 8);
    expect(ahead).toBeGreaterThan(-1);
    expect(ahead).toBeLessThan(8);
    // The marker knows how fast its box goes, to glide on between readings.
    expect(marker.velocity!.x).toBeCloseTo(240, -1);
    expect(Math.abs(marker.velocity!.y)).toBeLessThan(5);
  });

  test('stay locked on a box that moves while the camera jitters', () => {
    const markers = createMarkers(500);
    const jitter = [2, -2, 1, -1, 2, -2];
    let behind = 0;
    let ahead = 0;
    for (let t = 0; t <= 30; t++) {
      const truth = rect.x + t * 6;
      markers.see(
        [{code: 'A', rect: {...rect, x: truth + jitter[t % jitter.length]}}],
        t * EVERY,
      );
      if (t > 10) {
        const off = markers.visible(t * EVERY)[0].rect.x - truth;
        behind = Math.max(behind, -off);
        ahead = Math.max(ahead, off);
      }
    }
    expect(behind).toBeLessThan(3);
    expect(ahead).toBeLessThan(8);
  });

  test('come to rest with the box, without swinging past it', () => {
    const markers = createMarkers(500);
    let t = 0;
    for (; t <= 15; t++) {
      markers.see([{code: 'A', rect: {...rect, x: rect.x + t * 8}}], t * EVERY);
    }
    const end = rect.x + 15 * 8;
    let furthest = 0;
    for (; t <= 45; t++) {
      markers.see([{code: 'A', rect: {...rect, x: end}}], t * EVERY);
      furthest = Math.max(furthest, markers.visible(t * EVERY)[0].rect.x - end);
    }
    expect(furthest).toBeLessThan(8);
    const [marker] = markers.visible(45 * EVERY);
    expect(Math.abs(marker.rect.x - end)).toBeLessThan(1);
    expect(marker.velocity).toEqual({x: 0, y: 0});
  });

  test('follow a box that drifts slowly', () => {
    const markers = createMarkers(500);
    let x = rect.x;
    let last = rect.x;
    // 30 points a second, for two seconds.
    for (let t = 0; t <= 60; t++) {
      markers.see([{code: 'A', rect: {...rect, x: rect.x + t}}], t * EVERY);
      x = markers.visible(t * EVERY)[0].rect.x;
      expect(x).toBeGreaterThanOrEqual(last - 0.01);
      last = x;
    }
    expect(Math.abs(rect.x + 60 - x)).toBeLessThan(6);
  });

  test('grow with a box brought closer', () => {
    const markers = createMarkers(500);
    for (let t = 0; t <= 20; t++) {
      const size = 40 + Math.min(t, 10) * 2;
      markers.see(
        [{code: 'A', rect: {...rect, width: size, height: size}}],
        t * EVERY,
      );
    }
    const [marker] = markers.visible(20 * EVERY);
    expect(Math.abs(marker.rect.width - 60)).toBeLessThan(3);
  });

  test('follow a box moved far at once', () => {
    const markers = createMarkers(500);
    markers.see([{code: 'A', rect}], 0);
    markers.see([{code: 'A', rect: {...rect, x: 300, y: 400}}], EVERY);
    const [marker] = markers.visible(EVERY);
    expect(marker.rect).toEqual({...rect, x: 300, y: 400});
    expect(marker.velocity).toEqual({x: 0, y: 0});
  });

  test('stand still when readings held up arrive all at once', () => {
    const markers = createMarkers(500);
    markers.see([{code: 'A', rect}], 0);
    const [first] = markers.visible(0);
    // The app was busy for a moment: the camera's readings of the still
    // box, a few points off each, come in a millisecond apart.
    const jitter = [3, -3, 2, -2, 3, -1];
    jitter.forEach((dx, i) => {
      const at = 300 + i;
      markers.see([{code: 'A', rect: {...rect, x: rect.x + dx}}], at);
      const [marker] = markers.visible(at);
      expect(marker.rect).toBe(first.rect);
      expect(marker.velocity).toEqual({x: 0, y: 0});
    });
  });

  test('never race off on a reading that comes in right after another', () => {
    const markers = createMarkers(500);
    for (let t = 0; t <= 10; t++) {
      markers.see([{code: 'A', rect: {...rect, x: rect.x + t * 4}}], t * EVERY);
    }
    // 120 points a second, then one reading 6 points on, a millisecond
    // later.
    markers.see([{code: 'A', rect: {...rect, x: rect.x + 46}}], 10 * EVERY + 1);
    const [marker] = markers.visible(10 * EVERY + 1);
    expect(Math.abs(marker.velocity!.x)).toBeLessThan(400);
    expect(marker.rect.x - (rect.x + 46)).toBeLessThan(10);
  });

  test('keep its marker for a code read again after a pause', () => {
    const markers = createMarkers(500);
    markers.see([{code: 'A', rect}], 0);
    const [first] = markers.visible(0);
    expect(markers.visible(800)).toEqual([]);
    markers.see([{code: 'A', rect: {...rect, x: rect.x + 2}}], 800);
    const [again] = markers.visible(800);
    expect(again.id).toBe(first.id);
    expect(again.rect).toEqual(first.rect);
  });

  test('give two boxes of the same figure a marker each', () => {
    const markers = createMarkers(500);
    const left = rect;
    const right = {...rect, x: 200};
    markers.see(
      [
        {code: 'A', rect: left},
        {code: 'A', rect: right},
      ],
      0,
    );
    const first = markers.visible(0);
    expect(first).toHaveLength(2);
    expect(first[0].id).not.toBe(first[1].id);
    const jitter = [2, -2, 1, -1, 2, -2];
    for (let t = 1; t <= 20; t++) {
      const dx = jitter[t % jitter.length];
      // Read in either order, and now and then only one of them.
      const readings = [
        {code: 'A', rect: {...left, x: left.x + dx}},
        {code: 'A', rect: {...right, x: right.x - dx}},
      ];
      markers.see(
        t % 5 === 0 ? [readings[t % 2]] : t % 2 ? readings.reverse() : readings,
        t * EVERY,
      );
      // Each stays locked on its own box.
      expect(markers.visible(t * EVERY).map(m => m.rect)).toEqual(
        first.map(m => m.rect),
      );
    }
  });

  test('give a box of a figure already seen its own marker', () => {
    const markers = createMarkers(500);
    markers.see([{code: 'A', rect}], 0);
    markers.see([{code: 'A', rect}], EVERY);
    markers.see(
      [
        {code: 'A', rect},
        {code: 'A', rect: {...rect, x: 300}},
      ],
      2 * EVERY,
    );
    expect(markers.visible(2 * EVERY).map(m => m.rect.x)).toEqual([10, 300]);
  });

  test('stay while the camera’s readings are held up, then go', () => {
    const markers = createMarkers(1000);
    markers.see(
      [
        {code: 'A', rect},
        {code: 'B', rect},
      ],
      0,
    );
    // No reading at all comes in for a while: the boxes may still be there.
    expect(markers.visible(700).map(m => m.code)).toEqual(['A', 'B']);
    expect(markers.visible(1100)).toEqual([]);
  });

  // The camera reports every code in view in every frame, and once with none
  // when the last one leaves it.
  test('go right after the camera stops reading their code', () => {
    const markers = createMarkers(1000);
    markers.see(
      [
        {code: 'A', rect},
        {code: 'B', rect: {...rect, x: 200}},
      ],
      0,
    );
    markers.see([{code: 'B', rect: {...rect, x: 200}}], EVERY);
    expect(markers.visible(EVERY + 50).map(m => m.code)).toEqual(['A', 'B']);
    expect(markers.visible(EVERY + 150).map(m => m.code)).toEqual(['B']);
  });

  test('go right after the camera sees no code at all', () => {
    const markers = createMarkers(1000);
    markers.see([{code: 'A', rect}], 0);
    markers.see([], EVERY);
    expect(markers.visible(EVERY + 150)).toEqual([]);
  });

  test('stay put through a frame that missed their code', () => {
    const markers = createMarkers(1000);
    markers.see([{code: 'A', rect}], 0);
    const [first] = markers.visible(0);
    markers.see([], EVERY);
    markers.see([{code: 'A', rect}], 2 * EVERY);
    const [again] = markers.visible(2 * EVERY + 150);
    expect(again.id).toBe(first.id);
    expect(again.rect).toBe(first.rect);
  });

  test('tell who listens when their codes are read', () => {
    const markers = createMarkers(500);
    const listener = jest.fn();
    const stop = markers.listen(listener);
    markers.see([{code: 'A', rect}], 0);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    markers.see([{code: 'A', rect}], EVERY);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('are all gone once cleared', () => {
    const markers = createMarkers(500);
    markers.see([{code: 'A', rect}], 0);
    markers.clear();
    expect(markers.visible(0)).toEqual([]);
  });
});

import {cornerFlights, splashArt} from './splash';

const screen = {width: 400, height: 800};

test('On iOS the art sits where the launch screen puts it', () => {
  const art = splashArt('ios', screen);
  // 200 pt wide, centered, 24 pt above the middle (LaunchScreen.storyboard).
  expect(art.frame).toEqual({x: 100, y: 276, width: 200, height: 200});
  expect(art.corners.x).toBeCloseTo(112.3, 1);
  expect(art.corners.width).toBeCloseTo(175.2, 1);
});

test('On Android the art is the icon, centered as the system draws it', () => {
  const art = splashArt('android', screen);
  expect(art.frame.x + art.frame.width / 2).toBe(200);
  expect(art.frame.y + art.frame.height / 2).toBe(400);
  expect(art.corners.width).toBeCloseTo(art.frame.width * (193 / 432), 5);
});

test('Each corner starts on the art and lands on the viewfinder', () => {
  const from = {x: 112, y: 288, width: 176, height: 176};
  const to = {x: 80, y: 300, width: 240, height: 180};
  const flights = cornerFlights(from, to, 32, 1.5);
  const land = (
    f: (typeof flights)[number],
    k: number,
    dx: number,
    dy: number,
  ) => {
    // Where the corner's outer point is, scaled about its center then moved.
    const off = {
      x: f.anchor.x === 'left' ? -16 : 16,
      y: f.anchor.y === 'top' ? -16 : 16,
    };
    return {
      x: f.left + 16 + dx + k * off.x,
      y: f.top + 16 + dy + k * off.y,
    };
  };
  for (const flight of flights) {
    const start = land(flight, flight.scale, flight.dx, flight.dy);
    const end = land(flight, 1, 0, 0);
    const right = flight.anchor.x === 'right';
    const bottom = flight.anchor.y === 'bottom';
    expect(start.x).toBeCloseTo(right ? from.x + from.width : from.x, 5);
    expect(start.y).toBeCloseTo(bottom ? from.y + from.height : from.y, 5);
    expect(end.x).toBeCloseTo(right ? to.x + to.width : to.x, 5);
    expect(end.y).toBeCloseTo(bottom ? to.y + to.height : to.y, 5);
  }
  expect(flights).toHaveLength(4);
});

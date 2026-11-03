import {createSightings} from './sightings';

function clock() {
  let time = 0;
  return {now: () => time, advance: (ms: number) => (time += ms)};
}

test('A box that stays in view counts once', () => {
  const {now, advance} = clock();
  const sightings = createSightings(1500, now);
  expect(sightings.see('A')).toBe(true);
  for (let i = 0; i < 20; i++) {
    advance(100);
    expect(sightings.see('A')).toBe(false);
  }
});

test('Two boxes in view do not take turns', () => {
  const {now, advance} = clock();
  const sightings = createSightings(1500, now);
  expect(sightings.see('A')).toBe(true);
  advance(100);
  expect(sightings.see('B')).toBe(true);
  for (let i = 0; i < 10; i++) {
    advance(100);
    expect(sightings.see('A')).toBe(false);
    advance(100);
    expect(sightings.see('B')).toBe(false);
  }
});

test('A box shown again after a while counts again', () => {
  const {now, advance} = clock();
  const sightings = createSightings(1500, now);
  sightings.see('A');
  advance(1600);
  expect(sightings.see('A')).toBe(true);
});

test('Clearing forgets every box', () => {
  const {now} = clock();
  const sightings = createSightings(1500, now);
  sightings.see('A');
  sightings.clear();
  expect(sightings.see('A')).toBe(true);
});

test('A forgotten box counts again while still in view', () => {
  const sightings = createSightings(1500, () => 0);
  expect(sightings.see('6472861')).toBe(true);
  expect(sightings.see('6472861')).toBe(false);
  sightings.forget('6472861');
  expect(sightings.see('6472861')).toBe(true);
});

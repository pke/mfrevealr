import {classifyScan} from './scanOutcome';
import {createSightings} from './sightings';

const FITNESS = '6472861 2401'; // Series 25
const SPRITE = '6472862 2401';
const UNKNOWN = '9999901 2401';
const NO_BOX = 'https://example.test/product';

// A clock that never moves: whatever is seen stays in view.
const setup = () => createSightings(1500, () => 0);

test('A known box is a figure to reveal', () => {
  const outcome = classifyScan([FITNESS], setup());
  expect(outcome).toMatchObject({
    kind: 'figures',
    entries: [{code: '6472861'}],
  });
});

test('Every new box in view counts, not just the first', () => {
  const sightings = setup();
  expect(classifyScan([FITNESS, SPRITE], sightings)).toMatchObject({
    kind: 'figures',
    entries: [{code: '6472861'}, {code: '6472862'}],
  });
  // Both stay in view: nothing new.
  expect(classifyScan([SPRITE, FITNESS], sightings)).toBeUndefined();
});

test('A box joining one already in view counts on its own', () => {
  const sightings = setup();
  classifyScan([FITNESS], sightings);
  expect(classifyScan([FITNESS, SPRITE], sightings)).toMatchObject({
    kind: 'figures',
    entries: [{code: '6472862'}],
  });
});

test('A box that stays in view is nothing new', () => {
  const sightings = setup();
  classifyScan([FITNESS], sightings);
  expect(classifyScan([FITNESS], sightings)).toBeUndefined();
});

test('A box held up on purpose counts every time', () => {
  const sightings = setup();
  classifyScan([FITNESS], sightings, true);
  expect(classifyScan([FITNESS], sightings, true)).toMatchObject({
    kind: 'figures',
  });
});

test('A box the catalog lacks is looked up, once while in view', () => {
  const sightings = setup();
  expect(classifyScan([UNKNOWN], sightings)).toEqual({
    kind: 'unknown',
    value: UNKNOWN,
  });
  expect(classifyScan([UNKNOWN], sightings)).toBeUndefined();
});

test('A code that is no box is ignored, once while in view', () => {
  const sightings = setup();
  expect(classifyScan([NO_BOX], sightings)).toEqual({kind: 'ignored'});
  expect(classifyScan([NO_BOX], sightings)).toBeUndefined();
  expect(classifyScan([NO_BOX], sightings, true)).toEqual({kind: 'ignored'});
});

test('A known box wins over others in the same frame', () => {
  expect(classifyScan([NO_BOX, UNKNOWN, SPRITE], setup())).toMatchObject({
    kind: 'figures',
    entries: [{code: '6472862'}],
  });
});

test('An unknown box wins over a code that is no box', () => {
  expect(classifyScan([NO_BOX, UNKNOWN], setup())).toEqual({
    kind: 'unknown',
    value: UNKNOWN,
  });
});

test('Empty reads are nothing at all', () => {
  expect(classifyScan([undefined, '  '], setup())).toBeUndefined();
});

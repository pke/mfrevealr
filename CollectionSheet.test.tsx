import React from 'react';
import renderer, {act, ReactTestInstance} from 'react-test-renderer';
import type {Collection} from './collection';
import {CollectionSheet} from './CollectionSheet';
import type {UpdateResult} from './catalogStore';
import {getSeriesIds, getSetIds} from './resolveCode';
import {
  type HeroRegistry,
  type InFlight,
  MISSING_OPACITY,
  NOTHING_IN_FLIGHT,
} from './shared';

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({getString: () => undefined, set: () => {}}),
}));
jest.mock('./figureImages', () => ({}));
// The sheet's last pull past the end of its list, to try.
let mockPullUp: (() => void) | undefined;
jest.mock('./Sheet', () => ({
  Sheet: ({
    children,
    onPullUp,
  }: {
    children: React.ReactNode;
    onPullUp?: () => void;
  }) => {
    mockPullUp = onPullUp;
    return children;
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: object) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    i18n: {language: 'en'},
  }),
}));

const collection = {
  found: () => new Set<string>(),
} as unknown as Collection;

function render(
  started: string[],
  {
    onCheckCatalog = async (): Promise<UpdateResult> => 'current',
    onOpen = () => {},
    heroes = {current: {}} as HeroRegistry,
    inFlight = NOTHING_IN_FLIGHT as InFlight,
  } = {},
) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <CollectionSheet
        visible
        insets={{top: 0, bottom: 0}}
        collection={collection}
        started={started}
        catalogRevision={202611020000}
        heroes={heroes}
        inFlight={inFlight}
        onCheckCatalog={onCheckCatalog}
        onOpen={onOpen}
        onClose={() => {}}
      />,
      // Every host view can be measured.
      {createNodeMock: () => ({measureInWindow: () => {}})},
    );
  });
  return tree;
}

/** The rows and the heading between them, in order. */
const rows = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll(
      node =>
        typeof node.type === 'string' &&
        /^collection-(\d+|not-started)$/.test(node.props.testID ?? ''),
    )
    .map(node => node.props.testID);

const texts = (node: ReactTestInstance) =>
  node
    .findAll(child => typeof child.props.children === 'string')
    .map(child => child.props.children);

test('Series started come first, then every other one the catalog knows', () => {
  const [first, second, ...rest] = getSeriesIds();
  const tree = render([second]);
  expect(rows(tree)).toEqual([
    `collection-${second}`,
    'collection-not-started',
    `collection-${first}`,
    ...rest.map(id => `collection-${id}`),
  ]);
});

test('With no series started, every series shows below the hint', () => {
  const tree = render([]);
  expect(texts(tree.root)).toContain('collection.empty');
  expect(rows(tree)).toEqual(getSeriesIds().map(id => `collection-${id}`));
});

test('The catalog can be checked for new series right there', async () => {
  const check = jest.fn(async (): Promise<UpdateResult> => 'current');
  const tree = render([], {onCheckCatalog: check});
  const button = tree.root.find(
    node =>
      node.props.testID === 'catalog-check' && typeof node.type !== 'string',
  );
  await act(async () => button.props.onPress());
  expect(check).toHaveBeenCalledTimes(1);
  expect(texts(tree.root)).toContain('catalog.current');
});

const press = (tree: renderer.ReactTestRenderer, id: string) =>
  act(() =>
    tree.root
      .find(node => node.props.testID === id && typeof node.type !== 'string')
      .props.onPress(),
  );

test('A series opens out of its row, its figures flying from there', () => {
  const [first, second] = getSeriesIds();
  const heroes: HeroRegistry = {current: {}};
  const onOpen = jest.fn();
  const tree = render([first], {heroes, onOpen});
  press(tree, `collection-${second}`);
  expect(onOpen).toHaveBeenCalledWith(second, undefined);
  expect(heroes.source).toBeTruthy();
  expect(Object.keys(heroes.current).sort()).toEqual(
    [...getSetIds(second)!].sort(),
  );
  // Not found yet, so drawn faded where they fly from.
  expect(heroes.current[getSetIds(second)![0]].imageOpacity).toBe(
    MISSING_OPACITY,
  );
});

test('A figure touched in a row is the one the series opens on', () => {
  const [first] = getSeriesIds();
  const figure = getSetIds(first)![3];
  const onOpen = jest.fn();
  const tree = render([first], {onOpen});
  press(tree, `collection-figure-${figure}`);
  expect(onOpen).toHaveBeenCalledWith(first, figure);
});

test('Figures flying to the series are hidden in their row', () => {
  const [first] = getSeriesIds();
  const [flying, staying] = getSetIds(first)!;
  const tree = render([first], {
    inFlight: {codes: new Set([flying])},
  });
  const opacity = (code: string) =>
    tree.root
      .find(node => node.props.testID === `collection-image-${code}`)
      .props.style.flat(Infinity)
      .reduce(
        (value: number, style: {opacity?: number} | false) =>
          style && style.opacity !== undefined ? style.opacity : value,
        1,
      );
  expect(opacity(flying)).toBe(0);
  expect(opacity(staying)).toBe(MISSING_OPACITY);
});

test('Pulling past the end of the list checks the catalog', async () => {
  let answer!: (result: UpdateResult) => void;
  const check = jest.fn(
    () => new Promise<UpdateResult>(resolve => (answer = resolve)),
  );
  const tree = render([], {onCheckCatalog: check});
  await act(async () => mockPullUp!());
  expect(texts(tree.root)).toContain('catalog.checking');
  // Pulled again while checking: one check is enough.
  await act(async () => mockPullUp!());
  expect(check).toHaveBeenCalledTimes(1);
  await act(async () => answer('updated'));
  expect(texts(tree.root)).toContain('catalog.updated');
});

test('A series that gets started keeps flying back into its row', () => {
  const [first, second] = getSeriesIds();
  const heroes: HeroRegistry = {current: {}};
  const createNodeMock = () => ({measureInWindow: () => {}});
  const sheet = (started: string[]) => (
    <CollectionSheet
      visible
      insets={{top: 0, bottom: 0}}
      collection={collection}
      started={started}
      catalogRevision={202611020000}
      heroes={heroes}
      inFlight={NOTHING_IN_FLIGHT}
      onCheckCatalog={async () => 'current'}
      onOpen={() => {}}
      onClose={() => {}}
    />
  );
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(sheet([first]), {createNodeMock});
  });
  press(tree, `collection-${second}`);
  const source = heroes.source;
  // Its first figure ticked off in the series: it moves up among those
  // started, and stays the row it opened from.
  act(() => tree.update(sheet([first, second])));
  // Compared as booleans: a view's mock prints far too large to diff.
  expect(heroes.source === source).toBe(true);
  const row = tree.root
    .findAll(node => node.props.testID === `collection-${second}`)
    .map(node => node.instance);
  expect(row.includes(heroes.source)).toBe(true);
});

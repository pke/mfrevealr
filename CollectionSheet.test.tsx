import React from 'react';
import renderer, {act, ReactTestInstance} from 'react-test-renderer';
import type {Collection} from './collection';
import {CollectionSheet} from './CollectionSheet';
import type {UpdateResult} from './catalogStore';
import {getSeriesIds} from './resolveCode';

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
        onCheckCatalog={onCheckCatalog}
        onOpen={() => {}}
        onClose={() => {}}
      />,
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

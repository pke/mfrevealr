import React from 'react';
import renderer, {act, ReactTestInstance} from 'react-test-renderer';
import type {CatalogProgress} from './catalogStore';
import {DEFAULT_SETTINGS} from './settings';
import {SettingsSheet} from './SettingsSheet';

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({getString: () => undefined, set: () => {}}),
}));
jest.mock('./Sheet', () => ({
  Sheet: ({children}: {children: React.ReactNode}) => children,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: object) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    i18n: {language: 'en'},
  }),
}));

function render(progress?: CatalogProgress) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <SettingsSheet
        visible
        insets={{top: 0, bottom: 0}}
        settings={{...DEFAULT_SETTINGS, language: 'de', layout: 'strip'}}
        canReset={false}
        catalogRevision={202611020000}
        catalogProgress={progress}
        onChange={() => {}}
        onCheckCatalog={async () => 'current'}
        onReset={() => {}}
        onClose={() => {}}
      />,
    );
  });
  return tree;
}

const byId = (tree: renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll(
    node => node.props.testID === id && typeof node.type !== 'string',
  )[0] as ReactTestInstance | undefined;

const text = (node: ReactTestInstance) =>
  node
    .findAll(child => typeof child.props.children === 'string')
    .map(child => child.props.children)
    .join(' ');

/** The bar as assistive technology reads it. */
const progressBar = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll(
    node =>
      node.props.testID === 'catalog-progress' &&
      node.props.accessibilityRole === 'progressbar',
  )[0];

const tap = (tree: renderer.ReactTestRenderer, id: string) =>
  act(() => byId(tree, id)!.props.onPress());

test('The catalog comes first, then appearance, language and layout', () => {
  const tree = render();
  const order = tree.root
    .findAll(node => /^section-/.test(node.props.testID ?? ''))
    .map(node => node.props.testID)
    .filter((id, index, all) => all.indexOf(id) === index);
  expect(order).toEqual([
    'section-catalog',
    'section-appearance',
    'section-language',
    'section-layout',
  ]);
});

test('The theme can always be picked; it does not collapse', () => {
  const tree = render();
  expect(byId(tree, 'theme-dark')).toBeDefined();
  expect(byId(tree, 'section-appearance')!.props.onPress).toBeUndefined();
});

test.each([
  ['language', 'language-es', 'Deutsch'],
  ['layout', 'layout-card', 'layouts.strip.label'],
])(
  'The %s section starts collapsed, naming the current choice',
  (section, option, current) => {
    const tree = render();
    const header = byId(tree, `section-${section}`)!;
    expect(byId(tree, option)).toBeUndefined();
    expect(header.props.accessibilityState).toEqual({expanded: false});
    expect(text(header)).toContain(current);

    tap(tree, `section-${section}`);
    expect(byId(tree, option)).toBeDefined();
    expect(byId(tree, `section-${section}`)!.props.accessibilityState).toEqual({
      expanded: true,
    });

    tap(tree, `section-${section}`);
    expect(byId(tree, option)).toBeUndefined();
  },
);

test('The catalog section collapses to its date', () => {
  const tree = render();
  expect(byId(tree, 'catalog-check')).toBeUndefined();
  expect(text(byId(tree, 'section-catalog')!)).toContain('catalog.version');
  tap(tree, 'section-catalog');
  expect(byId(tree, 'catalog-check')).toBeDefined();
});

test('A catalog download shows its progress', () => {
  const tree = render({phase: 'downloading', done: 3, total: 12});
  tap(tree, 'section-catalog');
  const bar = progressBar(tree);
  expect(bar.props.accessibilityValue).toEqual({min: 0, max: 12, now: 3});
});

test('While checking, the progress bar runs without a count', () => {
  const tree = render({phase: 'checking'});
  tap(tree, 'section-catalog');
  const bar = progressBar(tree);
  expect(bar.props.accessibilityValue).toBeUndefined();
  expect(bar.props.accessibilityState).toEqual({busy: true});
});

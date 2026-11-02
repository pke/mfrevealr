import React from 'react';
import {AccessibilityInfo} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import type {CatalogProgress} from './catalogStore';
import {Lookup, LookupMessage} from './LookupMessage';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: object) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
  }),
}));

function render(lookup: Lookup, progress?: CatalogProgress) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <LookupMessage lookup={lookup} progress={progress} />,
    );
  });
  return tree;
}

const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll(
      node =>
        typeof node.type === 'string' &&
        typeof node.props.children === 'string',
    )
    .map(node => node.props.children as string);

const progressBar = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll(node => node.props.accessibilityRole === 'progressbar')[0];

test('While looking, the card names the code and shows the progress', () => {
  const tree = render(
    {kind: 'looking', code: '9999901'},
    {phase: 'downloading', done: 4, total: 116},
  );
  expect(texts(tree)).toEqual([
    'lookup.looking',
    'lookup.searching {"code":"9999901"}',
  ]);
  expect(progressBar(tree).props.accessibilityValue).toEqual({
    min: 0,
    max: 116,
    now: 4,
  });
});

test('Before the download starts, the progress runs without a count', () => {
  const tree = render({kind: 'looking', code: '9999901'}, {phase: 'checking'});
  expect(progressBar(tree).props.accessibilityState).toEqual({busy: true});
});

test('A figure no catalog has is named unknown', () => {
  const tree = render({kind: 'unknown', code: '9999901'});
  expect(texts(tree)).toEqual([
    'lookup.unknown',
    'lookup.notInCatalog {"code":"9999901"}',
  ]);
  expect(progressBar(tree)).toBeUndefined();
});

test('A search that failed says to try again', () => {
  const tree = render({kind: 'failed', code: '9999901'});
  expect(texts(tree)).toEqual(['lookup.unknown', 'lookup.failed']);
});

test('A code that is no box shows where the right one is', () => {
  const tree = render({kind: 'notABox'});
  expect(texts(tree)).toEqual(['lookup.notABox', 'hint.text']);
  expect(
    tree.root.findAll(node => node.props.accessibilityLabel === 'hint.image'),
  ).not.toHaveLength(0);
});

test('Each message is announced to screen readers', () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  render({kind: 'unknown', code: '9999901'});
  expect(announce).toHaveBeenCalledWith(
    'lookup.unknown. lookup.notInCatalog {"code":"9999901"}',
  );
});

test('The message is one element with the whole text as its label', () => {
  const tree = render({kind: 'failed', code: '9999901'});
  const [element] = tree.root.findAll(
    node =>
      node.props.testID === 'lookup-message' && typeof node.type === 'string',
  );
  expect(element.props.accessible).toBe(true);
  expect(element.props.accessibilityLabel).toBe(
    'lookup.unknown. lookup.failed',
  );
});

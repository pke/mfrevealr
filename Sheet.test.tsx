import React from 'react';
import {ScrollView, Text} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import {Sheet} from './Sheet';

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({getString: () => undefined, set: () => {}}),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

function render(
  onPullUp?: () => void,
  pullHint?: {more: string; release: string},
) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <Sheet
        visible
        insets={{top: 0, bottom: 0}}
        title="Title"
        onClose={() => {}}
        onPullUp={onPullUp}
        pullHint={pullHint}>
        <Text>Content</Text>
      </Sheet>,
    );
  });
  return tree;
}

const scrollView = (tree: renderer.ReactTestRenderer) =>
  tree.root.findByType(ScrollView);

// A list 1000 points long in a sheet 400 tall: its end is at 600.
const scrolled = (y: number) => ({
  nativeEvent: {
    contentOffset: {x: 0, y},
    contentSize: {width: 400, height: 1000},
    layoutMeasurement: {width: 400, height: 400},
  },
});

test('A pull well past the end of the list is reported', () => {
  const onPullUp = jest.fn();
  const tree = render(onPullUp);
  act(() => scrollView(tree).props.onScrollEndDrag(scrolled(600)));
  act(() => scrollView(tree).props.onScrollEndDrag(scrolled(640)));
  expect(onPullUp).not.toHaveBeenCalled();
  act(() => scrollView(tree).props.onScrollEndDrag(scrolled(680)));
  expect(onPullUp).toHaveBeenCalledTimes(1);
});

test('Only a sheet listening for pulls bounces, and never at its top', () => {
  // At the top a pull down closes the sheet instead.
  const tree = render(() => {});
  expect(scrollView(tree).props.bounces).toBe(false);
  act(() => scrollView(tree).props.onScroll(scrolled(120)));
  expect(scrollView(tree).props.bounces).toBe(true);
  act(() => scrollView(tree).props.onScroll(scrolled(0)));
  expect(scrollView(tree).props.bounces).toBe(false);

  const still = render();
  act(() => scrollView(still).props.onScroll(scrolled(120)));
  expect(scrollView(still).props.bounces).toBe(false);
});

test('Pulled past the end, the list tells how far to pull', () => {
  const hint = {more: 'Pull up more', release: 'Release to check'};
  const tree = render(() => {}, hint);
  const shown = () =>
    tree.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .filter(text => text === hint.more || text === hint.release);
  // Below the end of the list, where a pull reveals it.
  expect(shown()).toEqual([hint.more]);
  act(() => scrollView(tree).props.onScroll(scrolled(640)));
  expect(shown()).toEqual([hint.more]);
  act(() => scrollView(tree).props.onScroll(scrolled(680)));
  expect(shown()).toEqual([hint.release]);
  act(() => scrollView(tree).props.onScroll(scrolled(600)));
  expect(shown()).toEqual([hint.more]);
});

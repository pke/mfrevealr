import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Animated} from 'react-native';
import {CodeMarkers, LiveCodeMarkers, markerFrame} from './CodeMarkers';
import {createMarkers} from './codeOverlay';

jest.mock('./figureImages', () => ({'6472861': {uri: 'fitness.webp'}}));

test('A marker is centered on its code, a bit bigger than it', () => {
  const frame = markerFrame({x: 100, y: 200, width: 40, height: 40});
  expect(frame.left + frame.size / 2).toBe(120);
  expect(frame.top + frame.size / 2).toBe(220);
  expect(frame.size).toBeGreaterThan(40);
});

test('Markers keep a size that can be seen and fits on screen', () => {
  expect(markerFrame({x: 0, y: 0, width: 4, height: 4}).size).toBe(56);
  expect(markerFrame({x: 0, y: 0, width: 400, height: 400}).size).toBe(140);
});

test('Each marker shows its figure, ticked when found', () => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <CodeMarkers
        markers={[
          {code: '6472861', rect: {x: 0, y: 0, width: 40, height: 40}},
          {code: '6472862', rect: {x: 50, y: 0, width: 40, height: 40}},
        ]}
        found={new Set(['6472861'])}
      />,
    );
  });
  const markers = tree.root.findAll(
    node =>
      /^marker-/.test(node.props.testID ?? '') && typeof node.type === 'string',
  );
  expect(markers.map(node => node.props.testID)).toEqual([
    'marker-6472861',
    'marker-6472862',
  ]);
  const [found] = markers;
  expect(found.props.accessibilityState).toEqual({checked: true});
  expect(
    tree.root.findAll(
      node =>
        node.props.source?.uri === 'fitness.webp' &&
        typeof node.type === 'string',
    ),
  ).not.toHaveLength(0);
});

const markerIds = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll(
      node =>
        /^marker-/.test(node.props.testID ?? '') &&
        typeof node.type === 'string',
    )
    .map(node => node.props.testID);

test('A moving marker glides on the way its box goes', () => {
  const timing = jest.spyOn(Animated, 'timing');
  const rect = {x: 100, y: 100, width: 40, height: 40};
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <CodeMarkers markers={[{code: '6472861', rect}]} found={new Set()} />,
    );
  });
  timing.mockClear();
  act(() => {
    tree.update(
      <CodeMarkers
        markers={[
          {
            code: '6472861',
            rect: {...rect, x: 110},
            velocity: {x: 300, y: 0},
          },
        ]}
        found={new Set()}
      />,
    );
  });
  // Translations x and y, then the scale.
  const [[, glideX], [, glideY]] = timing.mock.calls as unknown as [
    unknown,
    {toValue: number; duration: number},
  ][];
  const still = markerFrame({...rect, x: 110});
  expect(glideX.toValue).toBeCloseTo(
    still.left + (300 * glideX.duration) / 1000,
    5,
  );
  expect(glideY.toValue).toBeCloseTo(still.top, 5);
  timing.mockRestore();
});

test('Two boxes of the same figure show it twice', () => {
  const markers = createMarkers(500);
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <LiveCodeMarkers markers={markers} found={new Set()} />,
    );
  });
  act(() => {
    markers.see(
      [
        {code: '6472861', rect: {x: 0, y: 0, width: 40, height: 40}},
        {code: '6472861', rect: {x: 200, y: 0, width: 40, height: 40}},
      ],
      Date.now(),
    );
  });
  expect(markerIds(tree)).toEqual(['marker-6472861', 'marker-6472861']);
  act(() => tree.unmount());
});

test('Live markers show what their tracker sees', () => {
  const markers = createMarkers(500);
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <LiveCodeMarkers markers={markers} found={new Set()} />,
    );
  });
  expect(markerIds(tree)).toEqual([]);
  act(() => {
    markers.see(
      [{code: '6472861', rect: {x: 0, y: 0, width: 40, height: 40}}],
      Date.now(),
    );
  });
  expect(markerIds(tree)).toEqual(['marker-6472861']);
  act(() => {
    markers.clear();
  });
  expect(markerIds(tree)).toEqual([]);
  act(() => tree.unmount());
});

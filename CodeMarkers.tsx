import React from 'react';
import {Animated, Easing, Image, StyleSheet, View} from 'react-native';
import type {Marker, Markers, Rect} from './codeOverlay';
import IMAGES from './figureImages';
import {getFigureTitle} from './resolveCode';
import {CheckBadge} from './shared';

const MIN_SIZE = 56;
const MAX_SIZE = 140;

/** A marker's square, centered on its code and a bit bigger than it. */
export function markerFrame(rect: Rect) {
  const size = Math.round(
    Math.min(
      MAX_SIZE,
      Math.max(MIN_SIZE, Math.max(rect.width, rect.height) * 1.8),
    ),
  );
  return {
    left: rect.x + rect.width / 2 - size / 2,
    top: rect.y + rect.height / 2 - size / 2,
    size,
  };
}

// Between two readings of its code a marker glides on over about the time
// they were apart, at its box's speed, to where the next reading will find
// it. So it moves continuously and keeps up instead of trailing behind.
const MIN_GLIDE_MS = 16;
const MAX_GLIDE_MS = 120;

const STILL = {x: 0, y: 0};

function CodeMarker({
  code,
  rect,
  velocity = STILL,
  isFound,
}: {
  code: string;
  rect: Rect;
  velocity?: Marker['velocity'];
  isFound: boolean;
}) {
  const target = markerFrame(rect);
  // Drawn at its first size and scaled from there; moved by transforms
  // alone, on the native driver.
  const [base] = React.useState(target.size);
  const place = (frame: typeof target) => ({
    x: frame.left + (frame.size - base) / 2,
    y: frame.top + (frame.size - base) / 2,
    scale: frame.size / base,
  });
  const start = place(target);
  const x = React.useRef(new Animated.Value(start.x)).current;
  const y = React.useRef(new Animated.Value(start.y)).current;
  const scale = React.useRef(new Animated.Value(start.scale)).current;
  const last = React.useRef(Date.now());
  const {left, top, size} = target;
  const {x: vx, y: vy} = velocity;
  React.useEffect(() => {
    const now = Date.now();
    const duration = Math.min(
      MAX_GLIDE_MS,
      Math.max(MIN_GLIDE_MS, now - last.current),
    );
    last.current = now;
    const ahead = duration / 1000;
    const to = place({left: left + vx * ahead, top: top + vy * ahead, size});
    const glide = (value: Animated.Value, toValue: number) =>
      Animated.timing(value, {
        toValue,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
    const animation = Animated.parallel([
      glide(x, to.x),
      glide(y, to.y),
      glide(scale, to.scale),
    ]);
    animation.start();
    return () => animation.stop();
    // place only depends on base, which never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, top, size, vx, vy, x, y, scale]);
  return (
    <Animated.View
      testID={`marker-${code}`}
      accessible
      accessibilityLabel={getFigureTitle(code)}
      accessibilityState={{checked: isFound}}
      style={[
        styles.marker,
        {
          width: base,
          height: base,
          transform: [{translateX: x}, {translateY: y}, {scale}],
        },
      ]}>
      <Image
        source={IMAGES[code]}
        resizeMode="contain"
        fadeDuration={0}
        style={styles.image}
      />
      {isFound && <CheckBadge size={Math.max(18, base / 4)} />}
    </Animated.View>
  );
}

/** Each figure's picture on its box code in the camera, ticked if found. */
export function CodeMarkers({
  markers,
  found,
}: {
  markers: Marker[];
  found: ReadonlySet<string>;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {markers.map(({id, code, rect, velocity}) => (
        <CodeMarker
          key={id ?? code}
          code={code}
          rect={rect}
          velocity={velocity}
          isFound={found.has(code)}
        />
      ))}
    </View>
  );
}

// Codes the camera lost are let go of this often.
const PRUNE_MS = 200;

/**
 * The markers a tracker sees, drawn as its codes are read: only these
 * re-render, not the screen around them.
 */
export function LiveCodeMarkers({
  markers,
  found,
}: {
  markers: Markers;
  found: ReadonlySet<string>;
}) {
  const [shown, setShown] = React.useState<Marker[]>([]);
  React.useEffect(() => {
    const refresh = () => {
      const next = markers.visible(Date.now());
      // Unchanged markers keep their objects, so nothing re-renders.
      setShown(old =>
        old.length === next.length && old.every((m, i) => m === next[i])
          ? old
          : next,
      );
    };
    refresh();
    const stop = markers.listen(refresh);
    const timer = setInterval(refresh, PRUNE_MS);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [markers]);
  return <CodeMarkers markers={shown} found={found} />;
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  image: {
    flex: 1,
    width: '100%',
  },
});

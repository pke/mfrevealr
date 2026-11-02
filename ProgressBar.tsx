import React from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {usePalette} from './theme';

const HEIGHT = 6;

/**
 * A slim bar that fills as `done` of `total` arrive; without them it runs
 * back and forth, for a wait of unknown length. Both move on the native
 * driver, so a busy JS thread never makes them stutter.
 */
export function ProgressBar({
  done,
  total,
  testID,
}: {
  done?: number;
  total?: number;
  testID?: string;
}) {
  const palette = usePalette();
  const [width, setWidth] = React.useState(0);
  const counted = done !== undefined && total !== undefined && total > 0;
  const fraction = counted ? Math.min(1, done / total) : 0;
  const fill = React.useRef(new Animated.Value(fraction)).current;
  const sweep = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!counted) {
      return;
    }
    const animation = Animated.timing(fill, {
      toValue: fraction,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [counted, fraction, fill]);

  React.useEffect(() => {
    if (counted) {
      return;
    }
    sweep.setValue(0);
    const animation = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [counted, sweep]);

  // The fill is a full-width bar slid in from the left; the sweep a third of
  // the width crossing from edge to edge.
  const translateX = counted
    ? fill.interpolate({inputRange: [0, 1], outputRange: [-width, 0]})
    : sweep.interpolate({
        inputRange: [0, 1],
        outputRange: [-width / 3, width],
      });
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={counted ? {min: 0, max: total, now: done} : undefined}
      accessibilityState={counted ? undefined : {busy: true}}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, {backgroundColor: palette.track}]}>
      {width > 0 && (
        <Animated.View
          style={[
            styles.fill,
            {
              width: counted ? width : width / 3,
              backgroundColor: palette.accent,
              transform: [{translateX}],
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
  },
});

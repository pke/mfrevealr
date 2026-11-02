import React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {CORNER, CornerAt, ViewfinderCorner} from './shared';
import {
  cornerFlights,
  getSplashTargets,
  onSplashTargets,
  reportSplashDone,
  splashArt,
} from './splash';

// The native splash's art: on iOS the launch screen's image from the asset
// catalog, on Android the icon's foreground the system splash draws.
const ART =
  Platform.OS === 'ios'
    ? {uri: 'SplashArt'}
    : require('./images/splash-art.webp');
// Their corners' arms are this share of the corners' span.
const ARM = 148 / 785;
// Shown at least this long, past the system's zoom into it; the camera gets
// up to WAIT_MS to show a picture before it goes anyway.
const HOLD_MS = 700;
const WAIT_MS = 1500;

/**
 * The first frame repeats the native splash exactly, so it takes over
 * unseen; once the camera is up, the art fades, its corners fly into the
 * viewfinder and the yellow gives way to the camera.
 */
export function SplashOverlay() {
  const screen = useWindowDimensions();
  const art = React.useMemo(() => splashArt(Platform.OS, screen), [screen]);
  const targets = React.useSyncExternalStore(onSplashTargets, getSplashTargets);
  const [held, setHeld] = React.useState(false);
  const [waited, setWaited] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const fade = React.useRef(new Animated.Value(0)).current;
  const fly = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const timers = [
      setTimeout(() => setHeld(true), HOLD_MS),
      setTimeout(() => setWaited(true), WAIT_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const go = held && (targets.cameraReady || waited);
  // Taken when it starts, so a later layout can't move them mid-flight.
  const [flights, setFlights] = React.useState<ReturnType<
    typeof cornerFlights
  > | null>(null);

  React.useEffect(() => {
    if (!go || flights) {
      return;
    }
    const {viewfinder} = targets;
    const next = viewfinder
      ? cornerFlights(
          art.corners,
          viewfinder,
          CORNER,
          (art.corners.width * ARM) / CORNER,
        )
      : [];
    setFlights(next);
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fly, {
          toValue: 1,
          delay: reduce ? 0 : 120,
          duration: reduce ? 250 : 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        reportSplashDone();
        setDone(true);
      });
    });
  }, [go, flights, targets, art, fade, fly]);

  if (done) {
    return null;
  }
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.yellow,
          {opacity: fly.interpolate({inputRange: [0, 1], outputRange: [1, 0]})},
        ]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: fade.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}>
        <Image
          source={ART}
          fadeDuration={0}
          style={[styles.art, {left: art.frame.x, top: art.frame.y}]}
        />
        {Platform.OS === 'ios' && (
          <Text
            style={[styles.name, {top: art.frame.y + art.frame.height + 12}]}>
            Mini Figure Revealr
          </Text>
        )}
      </Animated.View>
      {flights?.map(flight => (
        <Animated.View
          key={`${flight.anchor.y}-${flight.anchor.x}`}
          style={[
            styles.corner,
            {
              left: flight.left,
              top: flight.top,
              opacity: fade,
              transform: [
                {
                  translateX: fly.interpolate({
                    inputRange: [0, 1],
                    outputRange: [flight.dx, 0],
                  }),
                },
                {
                  translateY: fly.interpolate({
                    inputRange: [0, 1],
                    outputRange: [flight.dy, 0],
                  }),
                },
                {
                  scale: fly.interpolate({
                    inputRange: [0, 1],
                    outputRange: [flight.scale, 1],
                  }),
                },
              ],
            },
          ]}>
          <ViewfinderCorner
            at={
              `${flight.anchor.y}${
                flight.anchor.x === 'left' ? 'Left' : 'Right'
              }` as CornerAt
            }
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // The art's own yellow (LaunchScreen.storyboard, values/splash.xml).
  yellow: {
    backgroundColor: '#FEDE00',
  },
  art: {
    position: 'absolute',
    width: Platform.OS === 'ios' ? 200 : 288,
    height: Platform.OS === 'ios' ? 200 : 288,
  },
  name: {
    position: 'absolute',
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  corner: {
    position: 'absolute',
  },
});

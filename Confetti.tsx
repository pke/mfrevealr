import React from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

// A confetti explosion for a completed series: a few glints twinkle, and
// confetti and two paper snakes shoot up and out like from a cannon. Air
// drag brakes them, gravity takes over and they flutter down at their own
// terminal speed, turning in 3D and swaying as paper does.
//
// Every path is worked out once in JS, as samples along one shared
// Animated.Value; the native driver then animates only transform and
// opacity on the UI thread, with nothing left for JS to do per frame.

const PALETTE = [
  '#ffd23f', // yellow
  '#ff4f6d', // red
  '#06d6a0', // mint
  '#3a86ff', // blue
  '#9b5de5', // purple
  '#ff8a00', // orange
  '#f15bb5', // pink
  '#ffffff', // white
];
const GOLD = '#ffe9a8';

// Long enough for everything, the snakes' tails last, to fall out at the
// bottom; whatever is still in view fades out over the final moments.
const DURATION = 5600;
const FADE = 0.6; // seconds
const COUNT = 120;
const GLINTS = 10;
const GRAVITY = 600; // points/s², on an 874 pt tall screen

// Denser early, where the launch is fast. Plus one early step: everything
// stays hidden for the ~30 ms in which the burst is handed to the native
// driver, so it never shows standing still.
const HIDDEN_UNTIL = 0.008;
const SAMPLES = 44;
const STEPS = [
  0,
  HIDDEN_UNTIL,
  ...Array.from({length: SAMPLES}, (_, i) => ((i + 1) / SAMPLES) ** 1.6),
].sort((a, b) => a - b);
const seconds = (step: number) => (step * DURATION) / 1000;
const fadingOut = (step: number) =>
  Math.min(1, (DURATION / 1000 - seconds(step)) / FADE);

const between = (min: number, max: number) =>
  min + Math.random() * (max - min);
const pick = <T,>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)];

type Track = {
  opacity: number[];
  x: number[];
  y: number[];
  spin: string[];
  flip: string[];
  scale: number[];
};

type Piece = {style: ViewStyle; track: Track};

function pieceStyle(depth: number): ViewStyle {
  const color = pick(PALETTE);
  const kind = Math.random();
  if (kind < 0.6) {
    // Paper: the bulk of it.
    return {
      width: 10 * depth,
      height: 6 * depth,
      borderRadius: 1,
      backgroundColor: color,
    };
  }
  if (kind < 0.82) {
    // Ribbon.
    return {
      width: 4 * depth,
      height: 20 * depth,
      borderRadius: 2,
      backgroundColor: color,
    };
  }
  // Sequin.
  const size = 8 * depth;
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  };
}

/** A confetti piece's flight: launch, drag, fall and flutter. */
function makePiece(scale: number): Piece {
  // Near pieces are bigger and faster; far ones smaller and a bit faint.
  const depth = between(0.65, 1.3);
  // Mostly up and out like a cannon, the odd one in any direction.
  const angle =
    Math.random() < 0.85
      ? -Math.PI / 2 + between(-1, 1) * Math.PI * 0.36
      : Math.random() * Math.PI * 2;
  // Fast enough to reach the top of the screen and spill over the sides.
  const speed = between(350, 1300) * scale * (0.8 + depth * 0.2);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  // Paper meets more air than a sequin; drag sets its terminal speed.
  const drag = between(1.9, 2.8);
  const sway = between(14, 34);
  const swayRate = between(0.7, 1.5) * Math.PI * 2;
  const phase = Math.random() * Math.PI * 2;
  const spinRate = between(90, 420) * (Math.random() < 0.5 ? -1 : 1);
  const flipRate = between(1.2, 3.5) * 360;
  const flipPhase = between(0, 360);
  const delay = between(0, 0.06);
  const alpha = depth < 0.85 ? 0.8 : 1;

  const track: Track = {
    opacity: [],
    x: [],
    y: [],
    spin: [],
    flip: [],
    scale: [],
  };
  for (const step of STEPS) {
    const t = Math.max(0, seconds(step) - delay);
    // Linear drag has a closed form: rise, brake, then fall at g/drag.
    const slow = (1 - Math.exp(-drag * t)) / drag;
    const settled = Math.min(1, t / 0.9);
    track.x.push(vx * slow + Math.sin(t * swayRate + phase) * sway * settled);
    track.y.push(vy * slow + ((GRAVITY * scale) / drag) * (t - slow));
    track.spin.push(`${spinRate * t}deg`);
    track.flip.push(`${flipPhase + flipRate * t}deg`);
    track.scale.push(Math.min(1, 0.2 + (t / 0.09) * 0.8));
    track.opacity.push(
      step < HIDDEN_UNTIL
        ? 0
        : alpha * fadingOut(step),
    );
  }
  return {style: pieceStyle(depth), track};
}

// Paper snakes are chains of short segments, each following the head's path
// a little later, so together they draw the curl the head flew. They curl
// fast, so they get a denser timeline of their own.
const SNAKES = 2;
const SNAKE_SEGMENTS = 30;
const SNAKE_LAG = 0.04; // seconds between neighbouring segments
const SEGMENT = 10; // points
const SNAKE_STEPS = Array.from({length: 141}, (_, i) => i / 140);

type SnakeTrack = {
  opacity: number[];
  x: number[];
  y: number[];
  angle: string[];
  stretch: number[];
  twist: number[];
};

/** One paper snake, shot out to one side, curling as it unrolls. */
function makeSnake(scale: number, side: number, width: number) {
  const speed = between(950, 1150) * scale;
  // Less drag than paper bits: heavier, so the whole ribbon is down in time.
  const drag = between(2.2, 2.6);
  // Aimed by where it drifts to, so it stays in view: drag stops the
  // sideways flight at vx / drag.
  const vx = side * between(0.12, 0.3) * width * drag;
  const vy = -Math.sqrt(Math.max(0, speed ** 2 - vx ** 2));
  const curl = between(20, 30);
  const curlRate = between(1.2, 1.7) * Math.PI * 2 * side;
  const curlPhase = Math.random() * Math.PI * 2;
  const twistRate = between(1.2, 2) * Math.PI * 2;
  const head = (t: number) => {
    if (t <= 0) {
      return {x: 0, y: 0};
    }
    const slow = (1 - Math.exp(-drag * t)) / drag;
    // Straight out of the cannon, curling more as it slows down.
    const radius = curl * Math.min(1, t / 0.45);
    const turn = t * curlRate + curlPhase;
    return {
      x: vx * slow + Math.cos(turn) * radius,
      y:
        vy * slow +
        ((GRAVITY * scale) / drag) * (t - slow) +
        Math.sin(turn) * radius,
    };
  };
  return Array.from({length: SNAKE_SEGMENTS}, (_, segment) => {
    const track: SnakeTrack = {
      opacity: [],
      x: [],
      y: [],
      angle: [],
      stretch: [],
      twist: [],
    };
    let last: number | undefined;
    for (const step of SNAKE_STEPS) {
      // Each segment leaves the cannon a little after the one before.
      const t = seconds(step) - segment * SNAKE_LAG;
      const here = head(t);
      const ahead = head(t + 0.004);
      const behind = head(t - SNAKE_LAG);
      let degrees = (Math.atan2(ahead.y - here.y, ahead.x - here.x) * 180) / Math.PI;
      // Keep turning the short way round, never back through 360°.
      if (last !== undefined) {
        degrees += Math.round((last - degrees) / 360) * 360;
      }
      last = degrees;
      track.x.push(here.x);
      track.y.push(here.y);
      track.angle.push(`${degrees}deg`);
      // Stretch to close the gap to the next segment when flying fast.
      const gap = Math.hypot(here.x - behind.x, here.y - behind.y);
      track.stretch.push(Math.max(1, (gap * 1.25) / SEGMENT));
      // The ribbon twists along its length.
      track.twist.push(
        0.3 + 0.7 * Math.abs(Math.cos(t * twistRate + segment * 0.35)),
      );
      track.opacity.push(
        t <= 0 ? 0 : fadingOut(step),
      );
    }
    return track;
  });
}

/** A short-lived sparkle near the centre: grows, turns and vanishes. */
function makeGlint(reach: number) {
  const angle = Math.random() * Math.PI * 2;
  const distance = reach * between(0.15, 0.55);
  const start = between(0.03, 0.3);
  const life = between(0.25, 0.45);
  const size = between(14, 26);
  const opacity: number[] = [];
  const scale: number[] = [];
  const turn: string[] = [];
  for (const step of STEPS) {
    const t = (seconds(step) - start) / life;
    const up = t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI);
    opacity.push(step < HIDDEN_UNTIL ? 0 : up);
    scale.push(up);
    turn.push(`${Math.max(0, t) * 90}deg`);
  }
  return {
    size,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    opacity,
    scale,
    turn,
  };
}

export function Confetti() {
  const {width, height} = useWindowDimensions();
  const progress = React.useRef(new Animated.Value(0)).current;
  const [done, setDone] = React.useState(false);
  const [scene] = React.useState(() => {
    const reach = Math.min(width, height) * 0.5;
    const along = <T extends number | string>(values: T[]) =>
      progress.interpolate<T>({inputRange: STEPS, outputRange: values});
    return {
      glints: Array.from({length: GLINTS}, () => {
        const glint = makeGlint(reach);
        return {
          size: glint.size,
          animated: {
            opacity: along(glint.opacity),
            transform: [
              {translateX: glint.x},
              {translateY: glint.y},
              {rotate: along(glint.turn)},
              {scale: along(glint.scale)},
            ],
          },
        };
      }),
      snakes: Array.from({length: SNAKES}, (_, index) => {
        const colors = PALETTE.filter(color => color !== '#ffffff');
        const color = colors[(index * 3 + Math.floor(Math.random() * 3)) % colors.length];
        return makeSnake(height / 874, index % 2 ? 1 : -1, width).map(
          track => {
            const snakeAlong = <T extends number | string>(values: T[]) =>
              progress.interpolate<T>({
                inputRange: SNAKE_STEPS,
                outputRange: values,
              });
            return {
              color,
              animated: {
                opacity: snakeAlong(track.opacity),
                transform: [
                  {translateX: snakeAlong(track.x)},
                  {translateY: snakeAlong(track.y)},
                  {rotate: snakeAlong(track.angle)},
                  {scaleX: snakeAlong(track.stretch)},
                  {scaleY: snakeAlong(track.twist)},
                ],
              },
            };
          },
        );
      }),
      pieces: Array.from({length: COUNT}, () => {
        const {style, track} = makePiece(height / 874);
        return {
          style,
          animated: {
            opacity: along(track.opacity),
            transform: [
              {perspective: 500},
              {translateX: along(track.x)},
              {translateY: along(track.y)},
              {rotate: along(track.spin)},
              {rotateX: along(track.flip)},
              {scale: along(track.scale)},
            ],
          },
        };
      }),
    };
  });

  React.useEffect(() => {
    // Building the native graph for ~1000 values takes a few frames. A no-op
    // run builds it while everything is still hidden at 0, and the bang goes
    // off a moment after, so it never stutters.
    const warmUp = Animated.timing(progress, {
      toValue: 0,
      duration: 0,
      useNativeDriver: true,
    });
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    Animated.sequence([warmUp, Animated.delay(250), animation]).start(
      ({finished}) => finished && setDone(true),
    );
    return () => progress.stopAnimation();
  }, [progress]);

  if (done) {
    return null;
  }
  return (
    <View pointerEvents="none" style={styles.stage}>
      {scene.pieces.map((piece, index) => (
        <Animated.View
          key={index}
          style={[styles.absolute, piece.style, piece.animated]}
        />
      ))}
      {scene.snakes.map((segments, snake) =>
        segments.map((segment, index) => (
          <Animated.View
            key={`${snake}-${index}`}
            style={[
              styles.absolute,
              styles.segment,
              {backgroundColor: segment.color},
              segment.animated,
            ]}
          />
        )),
      )}
      {scene.glints.map((glint, index) => (
        <Animated.View
          key={index}
          style={[
            styles.absolute,
            {width: glint.size, height: glint.size},
            glint.animated,
          ]}>
          <View style={[styles.glintBar, {width: glint.size}]} />
          <View
            style={[styles.glintBar, styles.glintCross, {height: glint.size}]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absolute: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    width: SEGMENT,
    height: 7,
    borderRadius: 1,
  },
  glintBar: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: GOLD,
  },
  glintCross: {
    width: 3,
  },
});

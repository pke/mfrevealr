// Where the native splash draws its art, so the app can draw the same on its
// first frame and hand over from there (SplashOverlay.tsx).

export type Rect = {x: number; y: number; width: number; height: number};

// The art is the app icon's: on iOS cut from AppIcon.png (pixels 64 to 960
// of 1024, Images.xcassets/SplashArt), on Android its adaptive foreground
// (432 px). The white viewfinder corners span these pixels of each.
const IOS = {size: 200, offsetY: -24, image: 896, corners: [55, 840]};
const ANDROID = {size: 288, offsetY: 0, image: 432, corners: [119, 312]};

/**
 * The art's frame, and its corners' outer frame, on a screen this size:
 * iOS as LaunchScreen.storyboard lays it out, Android as the system splash
 * draws an icon without a background (288 dp, centered).
 */
export function splashArt(
  platform: string,
  screen: {width: number; height: number},
) {
  const spec = platform === 'android' ? ANDROID : IOS;
  const frame = {
    x: (screen.width - spec.size) / 2,
    y: (screen.height - spec.size) / 2 + spec.offsetY,
    width: spec.size,
    height: spec.size,
  };
  const scale = spec.size / spec.image;
  const [from, to] = spec.corners;
  const corners = {
    x: frame.x + from * scale,
    y: frame.y + from * scale,
    width: (to - from) * scale,
    height: (to - from) * scale,
  };
  return {frame, corners};
}

export type CornerFlight = {
  anchor: {x: 'left' | 'right'; y: 'top' | 'bottom'};
  // Where the corner (size × size) sits in the end, on the viewfinder.
  left: number;
  top: number;
  // How it starts: scaled about its center, then moved.
  scale: number;
  dx: number;
  dy: number;
};

/**
 * The four corners' flights from the art's corners (`from`) to the
 * viewfinder's (`to`). Each ends untransformed in its place on the
 * viewfinder and starts scaled by `scale` with its outer point on the art.
 */
export function cornerFlights(
  from: Rect,
  to: Rect,
  size: number,
  scale: number,
): CornerFlight[] {
  const half = size / 2;
  return (['top', 'bottom'] as const).flatMap(y =>
    (['left', 'right'] as const).map(x => {
      const sx = x === 'left' ? -1 : 1;
      const sy = y === 'top' ? -1 : 1;
      const left = x === 'left' ? to.x : to.x + to.width - size;
      const top = y === 'top' ? to.y : to.y + to.height - size;
      const startX = x === 'left' ? from.x : from.x + from.width;
      const startY = y === 'top' ? from.y : from.y + from.height;
      return {
        anchor: {x, y},
        left,
        top,
        scale,
        dx: startX - (left + half) - scale * sx * half,
        dy: startY - (top + half) - scale * sy * half,
      };
    }),
  );
}

// The viewfinder reports where it is, the camera when it shows a picture;
// the splash when it is gone, so the viewfinder shows its own corners again.
let targets: {viewfinder?: Rect; cameraReady: boolean; done: boolean} = {
  cameraReady: false,
  done: false,
};
const listeners = new Set<() => void>();
const update = (change: Partial<typeof targets>) => {
  targets = {...targets, ...change};
  listeners.forEach(listener => listener());
};

export function reportViewfinder(rect: Rect) {
  update({viewfinder: rect});
}

export function reportCameraReady() {
  if (!targets.cameraReady) {
    update({cameraReady: true});
  }
}

export function reportSplashDone() {
  update({done: true});
}

export function getSplashTargets() {
  return targets;
}

export function onSplashTargets(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

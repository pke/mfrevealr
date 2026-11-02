import React from 'react';

import {
  AccessibilityInfo,
  Alert,
  Animated,
  AppState,
  BackHandler,
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  Linking,
  PanResponder,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type {ScrollViewInstance} from 'react-native';
import {useTranslation} from 'react-i18next';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Camera,
  Code,
  CodeScannerFrame,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import IMAGES from './figureImages';
import {
  CatalogProgress,
  getCatalogProgress,
  getCatalogRevision,
  loadStoredCatalog,
  onCatalogProgress,
  updateCatalog,
  useCatalogProgress,
  useCatalogRevision,
} from './catalogStore';
import {CatalogNotice, createCatalogUpdates} from './catalogUpdates';
import {LiveCodeMarkers} from './CodeMarkers';
import {codeToView, createMarkers, Marker} from './codeOverlay';
import {foundNew, refuse} from './haptics';
import i18n from './i18n';
import {resolveLanguage} from './languages';
import {phoneLocale} from './languageSync';
import {
  getFigureTitle,
  getSetIds,
  getSetName,
  resolveScan,
  scannedCode,
} from './resolveCode';
import {Layout, Settings, useSettings} from './settings';
import {classifyScan} from './scanOutcome';
import {createSightings} from './sightings';
import {STORE_SCENE} from './storeScene';
import {FakeCamera} from './fakeCamera';
import {Lookup, LookupMessage} from './LookupMessage';
import {ProgressBar} from './ProgressBar';
import {SettingsSheet} from './SettingsSheet';
import {
  CheckBadge,
  CornerAt,
  heroImageRef,
  HeroRegistry,
  heroTitleRef,
  Measurable,
  Scan,
  ScanHint,
  scanStatus,
  ViewfinderCorner,
} from './shared';
import {
  getSplashTargets,
  onSplashTargets,
  reportCameraReady,
  reportSplashDone,
  reportViewfinder,
} from './splash';
import {SplashOverlay} from './SplashOverlay';
import {Insets, sheetStyles} from './Sheet';
import {SlimStrip} from './SlimStrip';
import {SPLIT_OVERLAP, SplitChecklist} from './SplitChecklist';
import {DARK, ThemeProvider, usePalette} from './theme';
import {Confetti} from './Confetti';

function useAppIsActive() {
  const [active, setActive] = React.useState(
    AppState.currentState === 'active',
  );
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return active;
}

function PermissionDenied({onRequest}: {onRequest: () => void}) {
  const palette = usePalette();
  const {t} = useTranslation();
  return (
    <View style={[styles.permission, {backgroundColor: palette.surface}]}>
      <StatusBar
        barStyle={palette === DARK ? 'light-content' : 'dark-content'}
      />
      <Text style={[styles.permissionText, {color: palette.text}]}>
        {t('permission.message')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRequest}
        style={[styles.button, {backgroundColor: palette.accent}]}>
        <Text style={[styles.buttonText, {color: palette.onAccent}]}>
          {t('permission.allow')}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => Linking.openSettings()}>
        <Text style={[styles.link, {color: palette.text}]}>
          {t('permission.openSettings')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Scanner corner brackets, matching the app icon. Fits the space the reveal
 * card leaves, so the corners never slide underneath it.
 */
function Viewfinder() {
  const [area, setArea] = React.useState({width: 0, height: 0});
  const width = Math.min(area.width * 0.62, 280, (area.height * 0.85) / 0.75);
  const frame = {width, height: width * 0.75};
  const frameRef = React.useRef<Measurable>(null);
  // Its corners show once the splash's have flown into them.
  const {done: splashDone} = React.useSyncExternalStore(
    onSplashTargets,
    getSplashTargets,
  );
  // The splash flies its corners into these.
  const report = () =>
    frameRef.current?.measureInWindow((x, y, w, h) =>
      reportViewfinder({x, y, width: w, height: h}),
    );
  return (
    <View
      pointerEvents="none"
      style={styles.center}
      onLayout={event => setArea(event.nativeEvent.layout)}>
      {width > 0 && (
        <View
          ref={(node: Measurable | null) => {
            frameRef.current = node;
          }}
          style={frame}
          onLayout={report}>
          {CORNERS.map(at => (
            <View
              key={at}
              style={[styles.corner, styles[at], !splashDone && styles.hidden]}>
              <ViewfinderCorner at={at} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Store screenshots show no splash.
if (STORE_SCENE) {
  reportSplashDone();
}

const CORNERS: CornerAt[] = [
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
];

function RevealCard({
  scan,
  lookup,
  catalogProgress,
  found,
  total,
  setName,
  heroes,
  hiddenCode,
  onOpenSeries,
}: {
  scan?: Scan;
  // A scan that revealed no figure; shown instead of the last one.
  lookup?: Lookup;
  catalogProgress?: CatalogProgress;
  found: number;
  total: number;
  setName?: string;
  heroes: HeroRegistry;
  hiddenCode?: string;
  onOpenSeries: (code?: string) => void;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  const appear = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (!scan) {
      return;
    }
    appear.setValue(0);
    Animated.spring(appear, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
    }).start();
  }, [scan, appear]);

  if (lookup) {
    return (
      <View style={[styles.card, {backgroundColor: palette.surface}]}>
        <LookupMessage lookup={lookup} progress={catalogProgress} />
      </View>
    );
  }
  if (!scan) {
    return (
      <View style={[styles.card, {backgroundColor: palette.surface}]}>
        <ScanHint />
      </View>
    );
  }

  const status = scanStatus(t, scan, found, total);
  const hidden = hiddenCode === scan.code;
  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          opacity: appear,
          transform: [
            {
              translateY: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0],
              }),
            },
          ],
        },
      ]}>
      <Pressable
        testID="reveal-card"
        onPress={() => onOpenSeries(scan.code)}
        accessibilityRole="button"
        accessibilityHint={t('card.showSeries')}>
        <Image
          ref={heroImageRef(heroes, scan.code)}
          source={IMAGES[scan.code]}
          resizeMode="contain"
          style={[styles.reveal, hidden && styles.hidden]}
        />
        <Text
          ref={heroTitleRef(heroes, scan.code, CARD_TITLE_SIZE)}
          style={[
            styles.title,
            styles.cardTitle,
            {color: palette.text},
            hidden && styles.hidden,
          ]}>
          {getFigureTitle(scan.code)}
        </Text>
        <Text style={[styles.subtitle, {color: palette.secondary}]}>
          {setName ? `${setName} · ` : ''}
          {status}
        </Text>
        <View style={styles.progressRow}>
          <View style={[styles.track, {backgroundColor: palette.track}]}>
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: palette.accent,
                  width: `${(found / total) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, {color: palette.secondary}]}>
            {t('progress', {found, total})} ›
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

type Rect = {x: number; y: number; width: number; height: number};

function measure(view: Measurable | null): Promise<Rect | undefined> {
  return new Promise(resolve => {
    if (!view) {
      return resolve(undefined);
    }
    view.measureInWindow((x, y, width, height) =>
      resolve(width > 0 && height > 0 ? {x, y, width, height} : undefined),
    );
  });
}

/** Where a `resizeMode="contain"` image actually draws inside its box. */
function containedRect(box: Rect, code: string): Rect {
  const {width, height} = Image.resolveAssetSource(IMAGES[code]) ?? {};
  if (!width || !height) {
    return box;
  }
  const scale = Math.min(box.width / width, box.height / height);
  const w = width * scale;
  const h = height * scale;
  return {
    x: box.x + (box.width - w) / 2,
    y: box.y + (box.height - h) / 2,
    width: w,
    height: h,
  };
}

const CARD_TITLE_SIZE = 22;
const TILE_TITLE_SIZE = 13;

type TitleFlight = {
  text: string;
  to: Rect;
  color: string;
  // The name shown at the source; without one, the tile's name grows out of
  // the figure instead.
  from?: Rect;
  fromSize?: number;
};

type Flight = {
  code: string;
  from: Rect;
  to: Rect;
  // How the figure is drawn at each end: missing figures are faded.
  fromOpacity: number;
  opacity: number;
  title?: TitleFlight;
};

const lerp = (value: Animated.Value, from: number, to: number) =>
  value.interpolate({inputRange: [0, 1], outputRange: [from, to]});

/**
 * The figure's name flying with it: the source's name shrinks and fades out
 * on its way to the tile while the tile's own name fades in, so the two
 * different fonts meet in the middle.
 */
function FlyingTitle({
  title,
  figure,
  progress,
  sheetY,
}: {
  title: TitleFlight;
  figure: Rect;
  progress: Animated.Value;
  sheetY: Animated.Value;
}) {
  const palette = usePalette();
  const {to} = title;
  const from = title.from ?? {
    x: figure.x + figure.width / 2 - to.width / 2,
    y: figure.y + figure.height - to.height / 2,
    width: to.width,
    height: to.height,
  };
  const ratio =
    title.from && title.fromSize ? title.fromSize / TILE_TITLE_SIZE : 0.4;
  const dx = from.x + from.width / 2 - (to.x + to.width / 2);
  const dy = from.y + from.height / 2 - (to.y + to.height / 2);
  const follow = Animated.multiply(sheetY, progress);
  return (
    <>
      {title.from && title.fromSize && (
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.flying,
            styles.bold,
            {
              left: from.x,
              top: from.y,
              width: from.width + 2,
              fontSize: title.fromSize,
              color: palette.text,
              opacity: progress.interpolate({
                inputRange: [0, 0.6],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
              transform: [
                {translateX: lerp(progress, 0, -dx)},
                {translateY: Animated.add(lerp(progress, 0, -dy), follow)},
                {scale: lerp(progress, 1, 1 / ratio)},
              ],
            },
          ]}>
          {title.text}
        </Animated.Text>
      )}
      <Animated.Text
        numberOfLines={2}
        style={[
          styles.flying,
          styles.tileTitle,
          {
            left: to.x,
            top: to.y,
            width: to.width,
            height: to.height,
            color: title.color,
            opacity: progress.interpolate({
              inputRange: title.from ? [0, 0.4, 1] : [0, 1],
              outputRange: title.from ? [0, 0, 1] : [0, 1],
            }),
            transform: [
              {translateX: lerp(progress, dx, 0)},
              {translateY: Animated.add(lerp(progress, dy, 0), follow)},
              {scale: lerp(progress, ratio, 1)},
            ],
          },
        ]}>
        {title.text}
      </Animated.Text>
    </>
  );
}

/**
 * The figure flying between the reveal card and its tile in the collection.
 * It is laid out at the tile and transformed back onto the card, so progress 1
 * is the resting tile position. While the sheet is offset by `sheetY`, sliding
 * in or dragged down, the figure rides along by the share it has flown.
 */
function FlyingFigure({
  flight,
  progress,
  sheetY,
  onReady,
}: {
  flight: Flight;
  progress: Animated.Value;
  sheetY: Animated.Value;
  onReady: (flight: Flight) => void;
}) {
  const {from, to} = flight;
  const dx = from.x + from.width / 2 - (to.x + to.width / 2);
  const dy = from.y + from.height / 2 - (to.y + to.height / 2);
  return (
    <Animated.Image
      source={IMAGES[flight.code]}
      resizeMode="contain"
      onLoad={() => onReady(flight)}
      style={[
        styles.flying,
        {
          left: to.x,
          top: to.y,
          width: to.width,
          height: to.height,
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [flight.fromOpacity, flight.opacity],
          }),
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [dx, 0],
              }),
            },
            {
              translateY: Animated.add(
                progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [dy, 0],
                }),
                Animated.multiply(sheetY, progress),
              ),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [from.width / to.width, 1],
              }),
            },
          ],
        },
      ]}
    />
  );
}

const GRID_GAP = 8;
const ROW_GAP = 12;
const SHEET_PADDING = 16;
const MIN_TILE = 72;
const TILE_ASPECT = 1.15;
// Two lines of name under every figure, growing with the text size setting.
const NAME_HEIGHT = 32;

/**
 * The largest tiles that fit the series into `space` without scrolling,
 * trying three and four columns. Below MIN_TILE the sheet scrolls instead.
 */
function fitTiles(count: number, width: number, space: number) {
  const nameHeight = 4 + NAME_HEIGHT * PixelRatio.getFontScale();
  let best = {columns: 3, tileWidth: 0};
  for (const columns of [3, 4]) {
    const rows = Math.ceil(count / columns);
    const byWidth =
      (width - SHEET_PADDING * 2 - GRID_GAP * (columns - 1)) / columns;
    const byHeight =
      ((space - ROW_GAP * (rows - 1)) / rows - nameHeight) / TILE_ASPECT;
    const tileWidth = Math.min(byWidth, byHeight);
    if (tileWidth > best.tileWidth) {
      best = {columns, tileWidth};
    }
  }
  return {...best, tileWidth: Math.max(MIN_TILE, Math.floor(best.tileWidth))};
}

/**
 * The series grid as a sheet over the camera, in the same screen so the
 * revealed figure can fly from the card into its tile and back again.
 */
function Collection({
  visible,
  setName,
  setIds,
  found,
  heroCode,
  heroes,
  insets,
  onFlying,
  onToggle,
  onReset,
  onClose,
}: {
  visible: boolean;
  setName?: string;
  setIds: string[];
  found: Set<string>;
  heroCode?: string;
  heroes: HeroRegistry;
  insets: Insets;
  onFlying: (flying: boolean) => void;
  onToggle: (code: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  const {width, height} = useWindowDimensions();
  // The sheet stops just short of the status bar, leaving the camera peeking
  // out above it.
  const sheetTop = insets.top + 10;
  const sheetHeight = height - sheetTop;
  // Heights of the sheet and of the parts around the grid; the grid gets the
  // rest. Measured once, they don't depend on the tiles.
  const [chrome, setChrome] = React.useState({
    viewport: 0,
    header: 0,
    footer: 0,
  });
  const measureChrome =
    (part: keyof typeof chrome) => (event: LayoutChangeEvent) => {
      const value = Math.round(event.nativeEvent.layout.height);
      setChrome(old => (old[part] === value ? old : {...old, [part]: value}));
    };
  const fit =
    chrome.viewport && chrome.header && chrome.footer
      ? fitTiles(
          setIds.length,
          width,
          chrome.viewport - chrome.header - chrome.footer - insets.bottom,
        )
      : undefined;
  const [mounted, setMounted] = React.useState(false);
  const [flight, setFlight] = React.useState<Flight>();
  const progress = React.useRef(new Animated.Value(0)).current;
  const scrollRef = React.useRef<ScrollViewInstance>(null);
  const tileRefs = React.useRef<
    Record<string, {image?: Measurable | null; title?: Measurable | null}>
  >({});
  // How far the sheet sits below its open position: 0 open, sheetHeight hidden.
  const sheetY = React.useRef(new Animated.Value(height)).current;
  // The sheet fades away well before it has slid off, so the figure lands on a
  // card you can see instead of disappearing behind the sheet.
  const fade = React.useRef(new Animated.Value(1)).current;
  const scrollY = React.useRef(0);

  // Measures both ends of the flight; without a figure on the card the sheet
  // just slides. `sheetOffset` is where the sheet sits while measuring, since
  // the flight ends at the tile of the open sheet.
  const prepareFlight = React.useCallback(
    async (
      scrollIntoView: boolean,
      sheetOffset: number,
    ): Promise<Flight | undefined> => {
      if (!heroCode || !IMAGES[heroCode]) {
        return undefined;
      }
      const parts = heroes.current[heroCode] ?? {};
      const tileParts = tileRefs.current[heroCode] ?? {};
      const [source, sourceTitle, image, name] = await Promise.all([
        measure(parts.image ?? null),
        measure(parts.title ?? null),
        measure(tileParts.image ?? null),
        measure(tileParts.title ?? null),
      ]);
      if (!source || !image) {
        return undefined;
      }
      // Measured while the sheet is still off screen when opening.
      let shift = -sheetOffset;
      // Bring a tile below the fold into view before flying to it.
      const overflow =
        image.y + shift + image.height - (height - insets.bottom - 16);
      if (scrollIntoView && overflow > 0) {
        scrollRef.current?.scrollTo({y: overflow, animated: false});
        shift -= overflow;
      }
      const lift = (rect: Rect) => ({...rect, y: rect.y + shift});
      const has = found.has(heroCode);
      const from = containedRect(source, heroCode);
      const text = getFigureTitle(heroCode) ?? '';
      return {
        code: heroCode,
        from,
        to: containedRect(lift(image), heroCode),
        fromOpacity: parts.imageOpacity ?? 1,
        opacity: has ? 1 : 0.25,
        title: name && {
          text,
          to: lift(name),
          color: has ? palette.text : palette.secondary,
          from: sourceTitle,
          fromSize: parts.titleSize,
        },
      };
    },
    [heroCode, heroes, height, insets.bottom, found, palette],
  );

  // The flying copy takes over from the card or tile only once it is on
  // screen: a new image paints when it has loaded, and a native-driven
  // animation that is already running never reaches views that attach to its
  // value later. Until then the original stays visible and nothing moves.
  const [readyFlight, setReadyFlight] = React.useState<Flight>();
  const flightReady = flight !== undefined && readyFlight === flight;
  React.useEffect(() => {
    onFlying(flightReady);
  }, [flightReady, onFlying]);
  React.useEffect(() => {
    if (!flight || readyFlight === flight) {
      return;
    }
    // An image that never reports in must not hold the sheet back.
    const timer = setTimeout(() => setReadyFlight(flight), 250);
    return () => clearTimeout(timer);
  }, [flight, readyFlight]);

  const [pendingRun, setPendingRun] = React.useState<{
    toValue: number;
    flight?: Flight;
    done: () => void;
    started?: boolean;
  }>();
  const run = React.useCallback(
    (toValue: number, prepared: Flight | undefined, done: () => void) => {
      setFlight(prepared);
      setPendingRun({toValue, flight: prepared, done});
    },
    [],
  );

  React.useEffect(() => {
    if (
      !pendingRun ||
      pendingRun.started ||
      (pendingRun.flight && readyFlight !== pendingRun.flight)
    ) {
      return;
    }
    pendingRun.started = true;
    const {toValue, done} = pendingRun;
    const spring = {
      useNativeDriver: true,
      damping: 22,
      stiffness: 200,
      mass: 1,
      overshootClamping: true,
    };
    Animated.spring(sheetY, {
      ...spring,
      toValue: toValue === 1 ? 0 : sheetHeight,
    }).start();
    Animated.timing(fade, {
      toValue,
      duration: toValue === 1 ? 150 : 200,
      useNativeDriver: true,
    }).start();
    Animated.spring(progress, {...spring, toValue}).start(({finished}) => {
      if (finished) {
        setFlight(undefined);
        done();
      }
    });
    // Each run starts once; the rest is read as it was when it was asked for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRun, readyFlight]);

  // Swipe down to dismiss, from anywhere while the sheet is scrolled to the
  // top. The sheet follows the finger and the figure heads back to the card.
  const swipeFlight = React.useRef<Promise<Flight | undefined> | undefined>(
    undefined,
  );
  const swipe = React.useMemo(() => {
    // How far to pull for the figure to travel all the way back to the card.
    const distance = sheetHeight * 0.5;
    const snapBack = () => {
      const pending = swipeFlight.current ?? Promise.resolve(undefined);
      swipeFlight.current = undefined;
      pending.then(prepared => run(1, prepared, () => {}));
    };
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, {dx, dy}) =>
        scrollY.current <= 0 && dy > 8 && dy > Math.abs(dx) * 1.5,
      onPanResponderGrant: () => {
        // Measured before the first move, while the tile is still in place.
        swipeFlight.current = prepareFlight(false, 0);
        swipeFlight.current.then(setFlight);
      },
      onPanResponderMove: (_, {dy}) => {
        const flown = Math.min(1, Math.max(0, dy) / distance);
        sheetY.setValue(Math.max(0, dy));
        progress.setValue(1 - flown);
        // Gone by the time the figure is 60% of the way to the card.
        fade.setValue(Math.max(0, 1 - flown / 0.6));
      },
      onPanResponderRelease: (_, {dy, vy}) =>
        dy > sheetHeight * 0.2 || vy > 0.8 ? onClose() : snapBack(),
      onPanResponderTerminate: snapBack,
      onPanResponderTerminationRequest: () => false,
    });
  }, [sheetY, progress, fade, sheetHeight, prepareFlight, run, onClose]);

  React.useEffect(() => {
    if (visible && !mounted) {
      progress.setValue(0);
      sheetY.setValue(sheetHeight);
      fade.setValue(1);
      setMounted(true);
    }
  }, [visible, mounted, progress, sheetY, fade, sheetHeight]);

  // Opening waits for the grid's first layout at its fitted size, so the target
  // tile is measurable.
  const opened = React.useRef(false);
  const visibleRef = React.useRef(visible);
  visibleRef.current = visible;
  // Set from the moment the sheet starts closing until it is gone.
  const closing = React.useRef(false);
  const flightRef = React.useRef(flight);
  flightRef.current = flight;
  const onGridLayout = React.useCallback(() => {
    if (!visible || opened.current) {
      return;
    }
    opened.current = true;
    prepareFlight(true, sheetHeight).then(prepared => {
      // Closed while measuring: the closing flight has taken over.
      if (visibleRef.current) {
        run(1, prepared, () => {});
      }
    });
  }, [visible, sheetHeight, prepareFlight, run]);

  React.useEffect(() => {
    if (visible && closing.current) {
      // Reopened while still closing: turn around from where everything is,
      // the figure heading back into its tile.
      closing.current = false;
      opened.current = true;
      run(1, flightRef.current, () => {});
      return;
    }
    if (visible || !mounted) {
      return;
    }
    if (!opened.current) {
      // Closed before the grid was laid out: nothing showed yet, so start
      // from scratch next time instead of waiting for a layout that has
      // already happened.
      setMounted(false);
      return;
    }
    opened.current = false;
    closing.current = true;
    // A swipe already has the figure on its way; keep flying from where the
    // finger let go instead of measuring the dragged tile again.
    const pending = swipeFlight.current ?? prepareFlight(false, 0);
    swipeFlight.current = undefined;
    pending.then(prepared => {
      // Reopened while measuring: the sheet never started to close.
      if (!visibleRef.current) {
        run(0, prepared, () => {
          closing.current = false;
          setMounted(false);
        });
      }
    });
    // Closing should only react to `visible`; the flight reads the latest
    // values through prepareFlight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  React.useEffect(() => {
    if (!visible) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [visible, onClose]);

  if (!mounted) {
    return null;
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('series.close')}
        style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            sheetStyles.backdrop,
            {
              opacity: Animated.multiply(
                sheetY.interpolate({
                  inputRange: [0, sheetHeight],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
                fade,
              ),
            },
          ]}
        />
      </Pressable>
      <Animated.View
        {...swipe.panHandlers}
        style={[
          sheetStyles.sheet,
          {
            top: sheetTop,
            backgroundColor: palette.surface,
            opacity: fade,
            transform: [{translateY: sheetY}],
          },
        ]}>
        <ScrollView
          ref={scrollRef}
          onLayout={measureChrome('viewport')}
          contentContainerStyle={{paddingBottom: insets.bottom}}
          bounces={false}
          scrollEventThrottle={16}
          onScroll={event => {
            scrollY.current = event.nativeEvent.contentOffset.y;
          }}>
          <View onLayout={measureChrome('header')}>
            <View
              style={[
                sheetStyles.grabber,
                {backgroundColor: palette.secondary},
              ]}
            />
            <View style={sheetStyles.header}>
              <View style={styles.flex}>
                <Text style={[styles.title, {color: palette.text}]}>
                  {setName ?? t('series.fallback')}
                </Text>
                <Text style={[styles.subtitle, {color: palette.secondary}]}>
                  {t('series.summary', {
                    found: found.size,
                    total: setIds.length,
                  })}
                </Text>
              </View>
              <Pressable
                testID="series-close"
                onPress={onClose}
                accessibilityRole="button"
                hitSlop={12}>
                <Text style={[sheetStyles.close, {color: palette.text}]}>
                  {t('sheet.close')}
                </Text>
              </Pressable>
            </View>
          </View>
          {fit && (
            <View
              style={[
                styles.grid,
                {
                  width:
                    fit.columns * fit.tileWidth + (fit.columns - 1) * GRID_GAP,
                },
              ]}
              onLayout={onGridLayout}>
              {setIds.map(item => {
                const has = found.has(item);
                const title = getFigureTitle(item);
                const inFlight = flightReady && flight?.code === item;
                return (
                  <Pressable
                    key={item}
                    testID={`tile-${item}`}
                    onPress={() => onToggle(item)}
                    accessibilityRole="checkbox"
                    accessibilityState={{checked: has}}
                    accessibilityLabel={title}
                    style={{width: fit.tileWidth}}>
                    <Image
                      ref={view => {
                        tileRefs.current[item] = {
                          ...tileRefs.current[item],
                          image: view,
                        };
                      }}
                      source={IMAGES[item]}
                      resizeMode="contain"
                      style={[
                        {
                          width: fit.tileWidth,
                          height: fit.tileWidth * TILE_ASPECT,
                        },
                        !has && styles.missing,
                        inFlight && styles.hidden,
                      ]}
                    />
                    {has && <CheckBadge />}
                    <Text
                      ref={view => {
                        tileRefs.current[item] = {
                          ...tileRefs.current[item],
                          title: view,
                        };
                      }}
                      numberOfLines={2}
                      style={[
                        styles.tileTitle,
                        {
                          height: NAME_HEIGHT * PixelRatio.getFontScale(),
                          color: has ? palette.text : palette.secondary,
                        },
                        inFlight && flight?.title && styles.hidden,
                      ]}>
                      {title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Pressable
            testID="series-start-over"
            onPress={onReset}
            onLayout={measureChrome('footer')}
            accessibilityRole="button"
            style={styles.reset}>
            <Text style={[styles.link, {color: palette.secondary}]}>
              {t('reset.button')}
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
      {flight && (
        <FlyingFigure
          flight={flight}
          progress={progress}
          sheetY={sheetY}
          onReady={setReadyFlight}
        />
      )}
      {flightReady && flight?.title && (
        <FlyingTitle
          title={flight.title}
          figure={flight.from}
          progress={progress}
          sheetY={sheetY}
        />
      )}
    </View>
  );
}

/** Opens the settings sheet; sits on the camera, so always light on dark. */
function SettingsButton({onPress}: {onPress: () => void}) {
  const {t} = useTranslation();
  return (
    <Pressable
      testID="settings-button"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('settings.title')}
      hitSlop={8}
      style={styles.roundButton}>
      <Text style={styles.settingsIcon}>{'\u2699\uFE0E'}</Text>
    </Pressable>
  );
}

function TorchButton({on, onPress}: {on: boolean; onPress: () => void}) {
  const {t} = useTranslation();
  return (
    <Pressable
      testID="torch-button"
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{checked: on}}
      accessibilityLabel={t('camera.torch')}
      hitSlop={8}
      style={[styles.roundButton, on && styles.torchOn]}>
      <Text style={[styles.torchIcon, on && styles.torchIconOn]}>
        {'\u26A1\uFE0E'}
      </Text>
    </Pressable>
  );
}

const NOTICE_TEXT = {
  looking: 'catalog.looking',
  updating: 'catalog.updating',
  updated: 'catalog.arrived',
  failed: 'catalog.lookupFailed',
} as const;

/** Tells over the camera about a catalog update the user should know of. */
function CatalogBanner({
  notice,
  progress,
  top,
}: {
  notice: CatalogNotice | undefined;
  progress: CatalogProgress | undefined;
  top: number;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  const text = notice && t(NOTICE_TEXT[notice.kind]);
  React.useEffect(() => {
    if (text) {
      AccessibilityInfo.announceForAccessibility(text);
    }
  }, [text]);
  if (!notice) {
    return null;
  }
  const busy = notice.kind === 'looking' || notice.kind === 'updating';
  const counted = progress?.phase === 'downloading';
  return (
    <View pointerEvents="none" style={[styles.bannerArea, {top: top + 12}]}>
      <View
        testID="catalog-notice"
        style={[styles.banner, {backgroundColor: palette.surface}]}>
        <Text style={[styles.bannerText, {color: palette.text}]}>{text}</Text>
        {busy && (
          <ProgressBar
            testID="catalog-notice-progress"
            done={counted ? progress.done : undefined}
            total={counted ? progress.total : undefined}
          />
        )}
      </View>
    </View>
  );
}

function Scanner({
  settings,
  onChangeSettings,
}: {
  settings: Settings;
  onChangeSettings: (change: Partial<Settings>) => void;
}): React.JSX.Element {
  const permission = useCameraPermission();
  // A simulated camera needs no permission, and asking for one would only
  // put a system prompt over the screen under test.
  const hasPermission = permission.hasPermission || Boolean(FakeCamera);
  const requestPermission = permission.requestPermission;
  const appIsActive = useAppIsActive();
  const device = useCameraDevice('back', {
    physicalDevices: ['ultra-wide-angle-camera'],
  });
  const cameraRef = React.useRef<Camera>(null);
  const screenSize = useWindowDimensions();
  const {t} = useTranslation();
  const catalogRevision = useCatalogRevision();
  const catalogProgress = useCatalogProgress();
  const [catalogNotice, setCatalogNotice] = React.useState<CatalogNotice>();
  const [lookup, setLookup] = React.useState<Lookup>();
  const lookupRef = React.useRef(lookup);
  lookupRef.current = lookup;
  const [catalogUpdates] = React.useState(() =>
    createCatalogUpdates({
      update: updateCatalog,
      revision: getCatalogRevision,
      progress: {get: getCatalogProgress, subscribe: onCatalogProgress},
      onNotice: setCatalogNotice,
    }),
  );
  React.useEffect(() => {
    // Start with the catalog downloaded before, then look for a newer one.
    loadStoredCatalog().then(() => catalogUpdates.atStart());
    return () => catalogUpdates.dispose();
  }, [catalogUpdates]);
  // Store screenshots start mid-collection; the app itself starts empty.
  const scene = STORE_SCENE;
  const [figuresInSet, setFiguresInSet] = React.useState(
    () => new Set<string>(scene?.found),
  );
  const [currentSetId, setCurrentSetId] = React.useState(scene?.setId ?? '');
  const [lastScan, setLastScan] = React.useState<Scan | undefined>(
    scene && {code: scene.scan, isNew: true},
  );
  const [seriesOpen, setSeriesOpen] = React.useState(false);
  const [heroFlying, setHeroFlying] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [torch, setTorch] = React.useState(false);
  // Where each figure sits in the current layout, and the one the series
  // sheet flies to and from: the card's figure or the tapped thumbnail.
  const heroes = React.useRef<HeroRegistry['current']>({});
  const [heroCode, setHeroCode] = React.useState<string>();
  React.useEffect(() => {
    if (!scene?.open) {
      return;
    }
    // Once the layout has settled, so the sheet opens with its transition.
    const timer = setTimeout(() => {
      setHeroCode(scene.scan);
      (scene.open === 'series' ? setSeriesOpen : setSettingsOpen)(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [scene]);
  // Without a real camera there's no picture to wait for (splash.ts).
  React.useEffect(() => {
    if (FakeCamera || !device) {
      reportCameraReady();
    }
  }, [device]);
  // Both platforms draw edge to edge, under the status and navigation bars.
  const {top, bottom} = useSafeAreaInsets();
  const insets: Insets = {top, bottom};

  // The scanner fires many times per second; refs let it compare against the
  // latest state without waiting for a re-render.
  const figuresRef = React.useRef(figuresInSet);
  figuresRef.current = figuresInSet;
  const currentSetIdRef = React.useRef(currentSetId);
  currentSetIdRef.current = currentSetId;
  const sightings = React.useRef(createSightings()).current;
  // The camera keeps running behind the sheets, which leave it visible at the
  // top, but scans wait until they close so nothing changes underneath.
  const sheetOpenRef = React.useRef(false);
  sheetOpenRef.current = seriesOpen || settingsOpen;

  const setIds = React.useMemo(
    () => getSetIds(currentSetId) || [],
    // A downloaded catalog can change which figures a series has.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSetId, catalogRevision],
  );
  const foundFullSet =
    setIds.length > 0 && setIds.every(id => figuresInSet.has(id));

  const toggleFigure = React.useCallback((id: string) => {
    setFiguresInSet(old => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // `deliberate` scans (the test camera) are boxes held up on purpose, so
  // they count even when the same box was seen just before.
  const onScan = (values: (string | undefined)[], deliberate = false) => {
    // Recorded also behind a sheet, so a box that stays in view never counts
    // again once it closes.
    const outcome = classifyScan(values, sightings, deliberate);
    if (sheetOpenRef.current || !outcome) {
      return;
    }
    if (outcome.kind === 'ignored') {
      refuse();
      setLookup({kind: 'notABox'});
      return;
    }
    if (outcome.kind === 'unknown') {
      lookUp(outcome.value);
      return;
    }
    setLookup(undefined);
    // Every new box in view counts. A box from another series starts a new
    // collection, but not while one of the current series is in view too.
    const current = outcome.entries.filter(
      entry => entry.setId === currentSetIdRef.current,
    );
    const entries = current.length
      ? current
      : outcome.entries.filter(
          entry => entry.setId === outcome.entries[0].setId,
        );
    let shown: Scan | undefined;
    let newlyFound = 0;
    for (const {code, setId} of entries) {
      let isNew = true;
      if (setId !== currentSetIdRef.current) {
        currentSetIdRef.current = setId;
        figuresRef.current = new Set([code]);
        setCurrentSetId(setId);
      } else if (!figuresRef.current.has(code)) {
        figuresRef.current = new Set(figuresRef.current).add(code);
      } else {
        isNew = false;
      }
      newlyFound += isNew ? 1 : 0;
      // The card shows a new figure if there is one.
      if (!shown || (isNew && !shown.isNew)) {
        shown = {code, isNew};
      }
    }
    if (newlyFound) {
      setFiguresInSet(figuresRef.current);
      foundNew(newlyFound);
    }
    setLastScan(shown);
  };

  const onScanRef = React.useRef(onScan);
  onScanRef.current = onScan;
  // A newer catalog may know the box; then it shows like any other.
  // The reveal card shows the search and its outcome; the other layouts
  // have no card for it and get the banner.
  const lookUp = (value: string) => {
    const code = scannedCode(value)!;
    setLookup({kind: 'looking', code});
    const notify = settings.layout !== 'card';
    catalogUpdates.lookUp(code, {notify}).then(result => {
      const current = lookupRef.current;
      // Another scan took over meanwhile.
      if (current?.kind !== 'looking' || current.code !== code) {
        return;
      }
      if (result === 'updated' && resolveScan(value)) {
        setLookup(undefined);
        onScanRef.current([value], true);
        return;
      }
      refuse();
      setLookup({kind: result === 'failed' ? 'failed' : 'unknown', code});
    });
  };

  // Figures drawn on their box codes (settings.codeOverlay). The markers
  // follow the tracker by themselves, so readings don't re-render the app.
  const markers = React.useRef(createMarkers()).current;
  const cameraSize = React.useRef({width: 0, height: 0});
  const codeOverlayRef = React.useRef(settings.codeOverlay);
  codeOverlayRef.current = settings.codeOverlay;
  const placeMarkers = (codes: Code[], frame: CodeScannerFrame) => {
    if (!codeOverlayRef.current) {
      return;
    }
    const seen: Marker[] = [];
    for (const code of codes) {
      const entry = resolveScan(code.value);
      const rect =
        entry &&
        code.frame &&
        codeToView(code.frame, frame, cameraSize.current, Platform.OS);
      if (entry && rect) {
        seen.push({code: entry.code, rect});
      }
    }
    markers.see(seen, Date.now());
  };
  React.useEffect(() => {
    if (!settings.codeOverlay) {
      markers.clear();
    }
  }, [settings.codeOverlay, markers]);

  const codeScanner = useCodeScanner({
    codeTypes: ['data-matrix'],
    onCodeScanned: (codes: Code[], frame: CodeScannerFrame) => {
      placeMarkers(codes, frame);
      onScan(codes.map(code => code.value));
    },
  });

  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // The camera fills the screen, so touch coordinates map straight onto it.
  const focus = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!device?.supportsFocus) {
        return;
      }
      const {pageX: x, pageY: y} = event.nativeEvent;
      cameraRef.current?.focus({x, y}).catch(() => {
        // Focus can fail while a previous focus is in progress.
      });
    },
    [device],
  );

  const confirmReset = React.useCallback(() => {
    Alert.alert(t('reset.title'), t('reset.message'), [
      {text: t('reset.cancel'), style: 'cancel'},
      {
        text: t('reset.button'),
        style: 'destructive',
        onPress: () => {
          setFiguresInSet(new Set());
          setLastScan(undefined);
          setLookup(undefined);
          sightings.clear();
          setSeriesOpen(false);
          setSettingsOpen(false);
        },
      },
    ]);
  }, [t, sightings]);

  const closeSeries = React.useCallback(() => setSeriesOpen(false), []);
  const closeSettings = React.useCallback(() => setSettingsOpen(false), []);

  if (!hasPermission && !scene) {
    return <PermissionDenied onRequest={requestPermission} />;
  }

  const setName = getSetName(currentSetId);
  const openSeries = (code?: string) => {
    // Right away, not with the next render: a box scanned meanwhile would
    // swap the figure on the card that is about to fly into the sheet.
    sheetOpenRef.current = true;
    setHeroCode(code ?? lastScan?.code);
    setSeriesOpen(true);
  };
  const hiddenCode = heroFlying ? heroCode : undefined;
  const layout: Layout = scene?.layout ?? settings.layout;

  // Switching layouts moves the camera, which restarts its session; that only
  // happens from the settings sheet.
  const camera = (
    <View
      style={StyleSheet.absoluteFill}
      onTouchEnd={focus}
      onLayout={event => {
        cameraSize.current = event.nativeEvent.layout;
      }}>
      {scene ? (
        <Image
          source={scene.photo}
          style={{width: screenSize.width, height: screenSize.height}}
          resizeMode="cover"
        />
      ) : FakeCamera ? (
        <FakeCamera onScan={values => onScan(values, true)} />
      ) : device ? (
        <Camera
          device={device}
          ref={cameraRef}
          isActive={appIsActive}
          style={StyleSheet.absoluteFill}
          codeScanner={codeScanner}
          outputOrientation="preview"
          preview
          enableZoomGesture={false}
          audio={false}
          torch={torch ? 'on' : 'off'}
          onPreviewStarted={reportCameraReady}
        />
      ) : (
        <Text style={styles.noCamera}>{t('camera.unavailable')}</Text>
      )}
      {settings.codeOverlay && !seriesOpen && !settingsOpen && (
        <LiveCodeMarkers markers={markers} found={figuresInSet} />
      )}
      {/* The status bar is always light; this keeps it legible over a
          bright camera image, like a white wall or a lit shelf. */}
      <View
        pointerEvents="none"
        style={[styles.statusScrim, {height: insets.top + 40}]}
      />
    </View>
  );
  // Right above the card, strip or checklist, within reach of the thumb.
  const controls = (
    <View
      style={[
        styles.controls,
        layout === 'split' && {paddingBottom: CONTROLS_GAP + SPLIT_OVERLAP},
      ]}
      pointerEvents="box-none">
      <SettingsButton
        onPress={() => {
          sheetOpenRef.current = true;
          setSettingsOpen(true);
        }}
      />
      {(device?.hasTorch || FakeCamera) && (
        <TorchButton on={torch} onPress={() => setTorch(on => !on)} />
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      {layout === 'split' ? (
        <>
          <View style={styles.flex}>
            {camera}
            <View
              style={[styles.overlay, {paddingTop: insets.top}]}
              pointerEvents="box-none">
              <Viewfinder />
              {controls}
            </View>
          </View>
          <SplitChecklist
            scan={lastScan}
            setName={setName}
            setIds={setIds}
            found={figuresInSet}
            insets={insets}
            onToggle={toggleFigure}
          />
        </>
      ) : (
        <>
          {camera}
          <View
            style={[
              styles.overlay,
              {paddingTop: insets.top, paddingBottom: insets.bottom},
            ]}
            pointerEvents="box-none">
            <Viewfinder />
            {controls}
            {layout === 'card' ? (
              <RevealCard
                scan={lastScan}
                lookup={lookup}
                catalogProgress={catalogProgress}
                found={figuresInSet.size}
                total={setIds.length}
                setName={setName}
                heroes={heroes}
                hiddenCode={hiddenCode}
                onOpenSeries={openSeries}
              />
            ) : (
              <SlimStrip
                scan={lastScan}
                setIds={setIds}
                found={figuresInSet}
                heroes={heroes}
                hiddenCode={hiddenCode}
                onOpenSeries={openSeries}
              />
            )}
          </View>
        </>
      )}
      <CatalogBanner
        notice={catalogNotice}
        progress={catalogProgress}
        top={insets.top}
      />
      <Collection
        visible={seriesOpen}
        setName={setName}
        setIds={setIds}
        found={figuresInSet}
        heroCode={heroCode}
        heroes={heroes}
        insets={insets}
        onFlying={setHeroFlying}
        onToggle={toggleFigure}
        onReset={confirmReset}
        onClose={closeSeries}
      />
      <SettingsSheet
        visible={settingsOpen}
        insets={insets}
        settings={settings}
        canReset={figuresInSet.size > 0}
        catalogRevision={catalogRevision}
        catalogProgress={catalogProgress}
        onCheckCatalog={updateCatalog}
        onChange={onChangeSettings}
        onReset={confirmReset}
        onClose={closeSettings}
      />
      {foundFullSet && <Confetti />}
    </View>
  );
}

const CONTROLS_GAP = 10;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  bannerArea: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    maxWidth: 420,
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  bannerText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    experimental_backgroundImage:
      'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0))',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: CONTROLS_GAP,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
  },
  torchOn: {
    backgroundColor: '#ffd23f',
  },
  torchIcon: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
  },
  torchIconOn: {
    color: '#1a1a1a',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
  },
  topLeft: {
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
  card: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 24,
    padding: 20,
  },
  // Hugs the text, so the name can fly from where it is drawn.
  cardTitle: {
    alignSelf: 'flex-start',
  },
  reveal: {
    width: '100%',
    height: 180,
    marginBottom: 12,
  },
  title: {
    fontSize: CARD_TITLE_SIZE,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 15,
    marginLeft: 12,
  },
  grid: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GRID_GAP,
    rowGap: ROW_GAP,
  },
  hidden: {
    opacity: 0,
  },
  flying: {
    position: 'absolute',
  },
  bold: {
    fontWeight: '700',
  },
  missing: {
    opacity: 0.25,
  },
  // Fixed two-line height, so fitTiles knows the size of every tile.
  tileTitle: {
    fontSize: TILE_TITLE_SIZE,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  reset: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noCamera: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 200,
  },
  permission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

function App(): React.JSX.Element {
  const [settings, updateSettings] = useSettings();
  // i18n starts in the stored language. Switching it in the same event as the
  // setting re-renders both together, so the picker and the text never
  // disagree for a frame.
  const changeSettings = React.useCallback(
    (change: Partial<Settings>) => {
      if (change.language) {
        i18n.changeLanguage(resolveLanguage(change.language, phoneLocale()));
      }
      updateSettings(change);
    },
    [updateSettings],
  );
  return (
    <SafeAreaProvider>
      <ThemeProvider value={settings.theme}>
        <Scanner settings={settings} onChangeSettings={changeSettings} />
        {!STORE_SCENE && <SplashOverlay />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;

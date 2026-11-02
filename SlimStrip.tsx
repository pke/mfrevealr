import React from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {ScrollViewInstance} from 'react-native';
import IMAGES from './figureImages';
import {getFigureTitle} from './resolveCode';
import {
  heroImageRef,
  HeroRegistry,
  heroTitleRef,
  Scan,
  scanStatus,
} from './shared';
import {useTranslation} from 'react-i18next';
import {usePalette} from './theme';

const THUMB = 52;
const LATEST = 72;
const GAP = 8;
const PILL_TITLE_SIZE = 17;
const MISSING_OPACITY = 0.25;

/**
 * Layout C: the camera keeps the screen; a name pill and a row of the series
 * along the bottom, with the latest figure larger. Tapping opens the series.
 */
export function SlimStrip({
  scan,
  setIds,
  found,
  heroes,
  hiddenCode,
  onOpenSeries,
}: {
  scan?: Scan;
  setIds: string[];
  found: Set<string>;
  heroes: HeroRegistry;
  hiddenCode?: string;
  onOpenSeries: (code: string) => void;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  const scrollRef = React.useRef<ScrollViewInstance>(null);
  const [viewport, setViewport] = React.useState(0);
  const latestIndex = scan ? setIds.indexOf(scan.code) : -1;

  // Keep the latest figure centred in the strip.
  React.useEffect(() => {
    if (latestIndex < 0 || viewport === 0) {
      return;
    }
    const x = latestIndex * (THUMB + GAP) - (viewport - LATEST) / 2;
    scrollRef.current?.scrollTo({x: Math.max(0, x), animated: true});
  }, [latestIndex, viewport]);

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

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: palette.surface,
            opacity: appear,
            transform: [
              {
                scale: appear.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}>
        <Text
          ref={scan ? heroTitleRef(heroes, scan.code, PILL_TITLE_SIZE) : null}
          numberOfLines={1}
          style={[
            styles.pillTitle,
            {color: palette.text},
            scan && hiddenCode === scan.code && styles.hidden,
          ]}>
          {scan ? getFigureTitle(scan.code) : t('hint.title')}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.pillText, {color: palette.secondary}]}>
          {scan
            ? `${scanStatus(t, scan, found.size, setIds.length)} · ${t(
                'progress',
                {found: found.size, total: setIds.length},
              )}`
            : t('hint.short')}
        </Text>
      </Animated.View>
      {setIds.length > 0 && (
        <View
          style={[styles.strip, {backgroundColor: palette.surface}]}
          onLayout={event => setViewport(event.nativeEvent.layout.width)}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}>
            {setIds.map(code => {
              const latest = code === scan?.code;
              const has = found.has(code);
              const size = latest ? LATEST : THUMB;
              return (
                <Pressable
                  key={code}
                  testID={`strip-${code}`}
                  onPress={() => onOpenSeries(code)}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    has ? 'series.thumbFound' : 'series.thumbMissing',
                    {name: getFigureTitle(code)},
                  )}
                  style={[
                    styles.thumb,
                    {width: size, height: size},
                    latest && {borderColor: palette.accent},
                  ]}>
                  <Image
                    ref={heroImageRef(heroes, code, has ? 1 : MISSING_OPACITY)}
                    source={IMAGES[code]}
                    resizeMode="contain"
                    style={[
                      styles.image,
                      !has && styles.missing,
                      hiddenCode === code && styles.hidden,
                    ]}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  pill: {
    maxWidth: '100%',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 8,
  },
  pillTitle: {
    fontSize: PILL_TITLE_SIZE,
    fontWeight: '700',
  },
  pillText: {
    fontSize: 14,
    marginTop: 2,
  },
  strip: {
    alignSelf: 'stretch',
    borderRadius: 20,
    paddingVertical: 8,
  },
  row: {
    alignItems: 'center',
    gap: GAP,
    paddingHorizontal: 8,
  },
  thumb: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
    padding: 2,
  },
  image: {
    flex: 1,
    width: '100%',
  },
  missing: {
    opacity: MISSING_OPACITY,
  },
  hidden: {
    opacity: 0,
  },
});

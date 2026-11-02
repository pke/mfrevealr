import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import type {HostInstance} from 'react-native';
import type {TFunction} from 'i18next';
import {useTranslation} from 'react-i18next';
import {usePalette} from './theme';

export type Scan = {code: string; isNew: boolean};

export type Measurable = Pick<HostInstance, 'measureInWindow'>;

/**
 * Where a figure, and its name if shown, sit in the current layout, so the
 * series sheet can fly them into their tile. Layouts register through refs.
 */
export type HeroParts = {
  image?: Measurable | null;
  // How the figure is drawn there; missing figures are faded.
  imageOpacity?: number;
  title?: Measurable | null;
  titleSize?: number;
};
export type HeroRegistry = {current: Record<string, HeroParts>};

export function heroImageRef(
  registry: HeroRegistry,
  code: string,
  imageOpacity = 1,
) {
  return (node: Measurable | null) => {
    registry.current[code] = {
      ...registry.current[code],
      image: node,
      imageOpacity,
    };
  };
}

export function heroTitleRef(
  registry: HeroRegistry,
  code: string,
  titleSize: number,
) {
  return (node: Measurable | null) => {
    registry.current[code] = {
      ...registry.current[code],
      title: node,
      titleSize,
    };
  };
}

export function scanStatus(
  t: TFunction,
  scan: Scan,
  found: number,
  total: number,
) {
  return found === total
    ? t('status.complete')
    : scan.isNew
    ? t('status.new')
    : t('status.known');
}

/** Shown before the first scan: what to point the camera at. */
export function ScanHint() {
  const palette = usePalette();
  const {t} = useTranslation();
  return (
    <View testID="scan-hint">
      <Text style={[styles.title, {color: palette.text}]}>
        {t('hint.title')}
      </Text>
      <Text style={[styles.subtitle, {color: palette.secondary}]}>
        {t('hint.text')}
      </Text>
      <Image
        source={require('./images/help_blurred.jpg')}
        resizeMode="contain"
        style={styles.helpImage}
        accessibilityLabel={t('hint.image')}
      />
    </View>
  );
}

// The viewfinder's corners, also drawn by the splash that flies into them.
export const CORNER = 32;
const STROKE = 5;

export type CornerAt = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export function ViewfinderCorner({at}: {at: CornerAt}) {
  return <View style={[styles.corner, styles[at]]} />;
}

export function CheckBadge({size = 26}: {size?: number}) {
  const palette = usePalette();
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.accent,
        },
      ]}>
      <Text
        style={[
          styles.badgeText,
          {color: palette.onAccent, fontSize: size * 0.58},
        ]}>
        ✓
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    width: CORNER,
    height: CORNER,
    borderColor: '#fff',
  },
  topLeft: {
    borderTopWidth: STROKE,
    borderLeftWidth: STROKE,
    borderTopLeftRadius: 10,
  },
  topRight: {
    borderTopWidth: STROKE,
    borderRightWidth: STROKE,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    borderBottomWidth: STROKE,
    borderRightWidth: STROKE,
    borderBottomRightRadius: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  helpImage: {
    width: '100%',
    height: 120,
    marginTop: 12,
    borderRadius: 12,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '700',
  },
});

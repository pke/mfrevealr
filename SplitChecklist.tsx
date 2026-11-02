import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import IMAGES from './figureImages';
import {getFigureTitle} from './resolveCode';
import {CheckBadge, Scan, ScanHint, scanStatus} from './shared';
import type {Insets} from './Sheet';
import {useTranslation} from 'react-i18next';
import {usePalette} from './theme';

const COLUMNS = 4;
const GAP = 8;

/**
 * Layout B: the whole series always visible below a shorter camera. Found
 * figures are in colour, missing ones faded, and the last scan is outlined.
 */
export function SplitChecklist({
  scan,
  setName,
  setIds,
  found,
  insets,
  onToggle,
}: {
  scan?: Scan;
  setName?: string;
  setIds: string[];
  found: Set<string>;
  insets: Insets;
  onToggle: (code: string) => void;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  const {width, height} = useWindowDimensions();
  const tileWidth = (width - 16 * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const tileSize = {width: tileWidth, height: tileWidth * 1.15};
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: palette.surface,
          paddingBottom: insets.bottom + 12,
          maxHeight: height * 0.6,
        },
      ]}>
      {setIds.length === 0 ? (
        <ScanHint />
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text style={[styles.title, {color: palette.text}]}>
                {setName ?? t('series.fallback')}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.subtitle, {color: palette.secondary}]}>
                {scan
                  ? `${getFigureTitle(scan.code)} · ${scanStatus(
                      t,
                      scan,
                      found.size,
                      setIds.length,
                    )}`
                  : t('series.tapToTick')}
              </Text>
            </View>
            <Text style={[styles.count, {color: palette.text}]}>
              {found.size}/{setIds.length}
            </Text>
          </View>
          <ScrollView bounces={false}>
            <View style={styles.grid}>
              {setIds.map(code => {
                const has = found.has(code);
                const latest = scan?.code === code;
                const title = getFigureTitle(code);
                return (
                  <Pressable
                    key={code}
                    testID={`split-${code}`}
                    onPress={() => onToggle(code)}
                    accessibilityRole="checkbox"
                    accessibilityState={{checked: has}}
                    accessibilityLabel={
                      latest ? t('series.lastScanned', {name: title}) : title
                    }
                    style={[
                      styles.tile,
                      tileSize,
                      latest && {borderColor: palette.accent},
                    ]}>
                    <Image
                      source={IMAGES[code]}
                      resizeMode="contain"
                      style={[styles.image, !has && styles.missing]}
                    />
                    {has && <CheckBadge size={20} />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

/** How far the checklist's rounded top reaches up over the camera. */
export const SPLIT_OVERLAP = 24;

const styles = StyleSheet.create({
  panel: {
    marginTop: -SPLIT_OVERLAP,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  count: {
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 12,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
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
    opacity: 0.25,
  },
});

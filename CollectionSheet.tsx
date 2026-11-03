import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {Collection} from './collection';
import IMAGES from './figureImages';
import {ProgressBar} from './ProgressBar';
import {getSetIds, getSetName} from './resolveCode';
import {Insets, Sheet} from './Sheet';
import {usePalette} from './theme';

const THUMB = 26;

/**
 * Every series with a figure found, with how far along it is. A series opens
 * when tapped.
 */
export function CollectionSheet({
  visible,
  insets,
  collection,
  started,
  onOpen,
  onClose,
}: {
  visible: boolean;
  insets: Insets;
  collection: Collection;
  started: readonly string[];
  onOpen: (setId: string) => void;
  onClose: () => void;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  return (
    <Sheet
      visible={visible}
      insets={insets}
      title={t('collection.title')}
      onClose={onClose}>
      {started.length === 0 && (
        <Text style={[styles.empty, {color: palette.secondary}]}>
          {t('collection.empty')}
        </Text>
      )}
      {started.map(setId => {
        const ids = getSetIds(setId) ?? [];
        const found = collection.found(setId);
        const name = getSetName(setId) ?? t('series.fallback');
        const progress = t('progress', {
          found: ids.filter(id => found.has(id)).length,
          total: ids.length,
        });
        return (
          <Pressable
            key={setId}
            testID={`collection-${setId}`}
            onPress={() => onOpen(setId)}
            accessibilityRole="button"
            accessibilityLabel={`${name}, ${progress}`}
            style={[styles.row, {borderColor: palette.track}]}>
            <View style={styles.heading}>
              <Text style={[styles.name, {color: palette.text}]}>{name}</Text>
              <Text style={[styles.count, {color: palette.secondary}]}>
                {progress} ›
              </Text>
            </View>
            <ProgressBar
              done={ids.filter(id => found.has(id)).length}
              total={ids.length}
            />
            <View style={styles.figures}>
              {ids.map(id => (
                <Image
                  key={id}
                  source={IMAGES[id]}
                  resizeMode="contain"
                  style={[styles.thumb, !found.has(id) && styles.missing]}
                />
              ))}
            </View>
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 17,
    paddingVertical: 8,
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    gap: 10,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  count: {
    fontSize: 15,
  },
  figures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  thumb: {
    width: THUMB,
    height: THUMB * 1.15,
  },
  missing: {
    opacity: 0.25,
  },
});

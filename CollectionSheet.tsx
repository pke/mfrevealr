import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {CatalogCheck, type CatalogCheckHandle} from './CatalogCheck';
import type {CatalogProgress, UpdateResult} from './catalogStore';
import type {Collection} from './collection';
import IMAGES from './figureImages';
import {ProgressBar} from './ProgressBar';
import {getSeriesIds, getSetIds, getSetName} from './resolveCode';
import {Insets, Sheet} from './Sheet';
import {usePalette} from './theme';

const THUMB = 26;

/**
 * Every series the catalog knows: those with a figure found first, with how
 * far along they are, then the others. A series opens when tapped. At the
 * end, the catalog can be checked for new series, also by pulling the list
 * on past its end.
 */
export function CollectionSheet({
  visible,
  insets,
  collection,
  started,
  catalogRevision,
  catalogProgress,
  onCheckCatalog,
  onOpen,
  onClose,
}: {
  visible: boolean;
  insets: Insets;
  collection: Collection;
  started: readonly string[];
  catalogRevision: number;
  /** A catalog update running anywhere in the app. */
  catalogProgress?: CatalogProgress;
  onCheckCatalog: () => Promise<UpdateResult>;
  onOpen: (setId: string) => void;
  onClose: () => void;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  // Rendered again when the catalog changes, with the series it knows now.
  const others = getSeriesIds().filter(setId => !started.includes(setId));
  const catalogCheck = React.useRef<CatalogCheckHandle>(null);
  const row = (setId: string) => (
    <SeriesRow
      key={setId}
      setId={setId}
      found={collection.found(setId)}
      onOpen={onOpen}
    />
  );
  return (
    <Sheet
      visible={visible}
      insets={insets}
      title={t('collection.title')}
      onClose={onClose}
      onPullUp={() => catalogCheck.current?.check()}
      pullHint={{
        more: t('catalog.pullMore'),
        release: t('catalog.pullRelease'),
      }}>
      {started.length === 0 && (
        <Text style={[styles.empty, {color: palette.secondary}]}>
          {t('collection.empty')}
        </Text>
      )}
      {started.map(row)}
      {started.length > 0 && others.length > 0 && (
        <Text
          testID="collection-not-started"
          accessibilityRole="header"
          style={[styles.section, {color: palette.secondary}]}>
          {t('collection.notStarted')}
        </Text>
      )}
      {others.map(row)}
      <View style={[styles.catalog, {borderColor: palette.track}]}>
        <CatalogCheck
          ref={catalogCheck}
          revision={catalogRevision}
          progress={catalogProgress}
          onCheck={onCheckCatalog}
        />
      </View>
    </Sheet>
  );
}

/** A series with its figures, those not found yet faded. */
function SeriesRow({
  setId,
  found,
  onOpen,
}: {
  setId: string;
  found: ReadonlySet<string>;
  onOpen: (setId: string) => void;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  const ids = getSetIds(setId) ?? [];
  const done = ids.filter(id => found.has(id)).length;
  const name = getSetName(setId) ?? t('series.fallback');
  const progress = t('progress', {found: done, total: ids.length});
  return (
    <Pressable
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
      <ProgressBar done={done} total={ids.length} />
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
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 17,
    paddingVertical: 8,
  },
  section: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: 20,
    paddingBottom: 8,
  },
  catalog: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
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

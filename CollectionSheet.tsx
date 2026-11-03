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
import {
  type HeroParts,
  type HeroRegistry,
  type InFlight,
  type Measurable,
} from './shared';
import {usePalette} from './theme';

const THUMB = 26;
const MISSING_OPACITY = 0.25;

/**
 * Every series the catalog knows: those with a figure found first, with how
 * far along they are, then the others. A series opens out of its row, on the
 * figure touched if any, and its figures fly between the row and the series
 * through `heroes`. At the end, the catalog can be checked for new series,
 * also by pulling the list on past its end.
 */
export function CollectionSheet({
  visible,
  insets,
  collection,
  started,
  catalogRevision,
  catalogProgress,
  heroes,
  inFlight,
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
  /** Filled with the row a series opens out of, and its figures. */
  heroes: HeroRegistry;
  inFlight: InFlight;
  onCheckCatalog: () => Promise<UpdateResult>;
  onOpen: (setId: string, code?: string) => void;
  onClose: () => void;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  // Rendered again when the catalog changes, with the series it knows now.
  const others = getSeriesIds().filter(setId => !started.includes(setId));
  const catalogCheck = React.useRef<CatalogCheckHandle>(null);
  // Every row's container and figures, handed to `heroes` when it opens.
  const rows = React.useRef<Record<string, RowParts>>({}).current;
  const open = (setId: string, code?: string) => {
    const parts = rows[setId];
    heroes.source = parts?.source;
    heroes.current = parts?.figures ?? {};
    onOpen(setId, code);
  };
  const row = (setId: string) => {
    rows[setId] ??= {figures: {}};
    return (
      <SeriesRow
        key={setId}
        setId={setId}
        found={collection.found(setId)}
        parts={rows[setId]}
        inFlight={inFlight}
        onOpen={open}
      />
    );
  };
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
      {/* One list, so a series that gets started moves up as the row it is,
          and a series open from it keeps flying back into that row. */}
      {[
        ...started.map(row),
        started.length > 0 && others.length > 0 && (
          <Text
            key="not-started"
            testID="collection-not-started"
            accessibilityRole="header"
            style={[styles.section, {color: palette.secondary}]}>
            {t('collection.notStarted')}
          </Text>
        ),
        ...others.map(row),
      ]}
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

type RowParts = {
  source?: Measurable | null;
  figures: Record<string, HeroParts>;
};

/** A series with its figures, those not found yet faded. */
function SeriesRow({
  setId,
  found,
  parts,
  inFlight,
  onOpen,
}: {
  setId: string;
  found: ReadonlySet<string>;
  parts: RowParts;
  inFlight: InFlight;
  onOpen: (setId: string, code?: string) => void;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  const ids = getSetIds(setId) ?? [];
  const done = ids.filter(id => found.has(id)).length;
  const name = getSetName(setId) ?? t('series.fallback');
  const progress = t('progress', {found: done, total: ids.length});
  return (
    <Pressable
      ref={node => {
        parts.source = node;
      }}
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
          <Pressable
            key={id}
            testID={`collection-figure-${id}`}
            onPress={() => onOpen(setId, id)}
            accessible={false}>
            <Image
              ref={node => {
                parts.figures[id] = {
                  image: node,
                  imageOpacity: found.has(id) ? 1 : MISSING_OPACITY,
                };
              }}
              testID={`collection-image-${id}`}
              source={IMAGES[id]}
              resizeMode="contain"
              style={[
                styles.thumb,
                !found.has(id) && styles.missing,
                inFlight.codes.has(id) && styles.hidden,
              ]}
            />
          </Pressable>
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
    opacity: MISSING_OPACITY,
  },
  hidden: {
    opacity: 0,
  },
});

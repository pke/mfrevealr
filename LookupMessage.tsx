import React from 'react';
import {AccessibilityInfo, Image, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {CatalogProgress} from './catalogStore';
import {ProgressBar} from './ProgressBar';
import {usePalette} from './theme';

/** A scan that revealed no figure, as the reveal card tells it. */
export type Lookup =
  // A box the catalog lacks, while a newer catalog is looked for.
  | {kind: 'looking'; code: string}
  // No catalog knows it.
  | {kind: 'unknown'; code: string}
  // The search for a newer catalog failed.
  | {kind: 'failed'; code: string}
  // A code that is no minifigure box.
  | {kind: 'notABox'};

/** What the reveal card shows in place of a figure; see `Lookup`. */
export function LookupMessage({
  lookup,
  progress,
}: {
  lookup: Lookup;
  progress?: CatalogProgress;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  const [title, text] =
    lookup.kind === 'looking'
      ? [t('lookup.looking'), t('lookup.searching', {code: lookup.code})]
      : lookup.kind === 'unknown'
      ? [t('lookup.unknown'), t('lookup.notInCatalog', {code: lookup.code})]
      : lookup.kind === 'failed'
      ? [t('lookup.unknown'), t('lookup.failed')]
      : [t('lookup.notABox'), t('hint.text')];
  const message = `${title}. ${text}`;
  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  const counted = progress?.phase === 'downloading';
  return (
    <View>
      {/* One element, so it reads, and is found, as the whole message;
          Android only joins up the texts with the label spelled out. */}
      <View testID="lookup-message" accessible accessibilityLabel={message}>
        <Text style={[styles.title, {color: palette.text}]}>{title}</Text>
        <Text style={[styles.text, {color: palette.secondary}]}>{text}</Text>
      </View>
      {lookup.kind === 'looking' && (
        <View style={styles.progress}>
          <ProgressBar
            testID="lookup-progress"
            done={counted ? progress.done : undefined}
            total={counted ? progress.total : undefined}
          />
        </View>
      )}
      {lookup.kind === 'notABox' && (
        <Image
          source={require('./images/help_blurred.jpg')}
          resizeMode="contain"
          style={styles.helpImage}
          accessibilityLabel={t('hint.image')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  text: {
    fontSize: 15,
    marginTop: 4,
  },
  progress: {
    marginTop: 16,
    marginBottom: 4,
  },
  helpImage: {
    width: '100%',
    height: 120,
    marginTop: 12,
    borderRadius: 12,
  },
});

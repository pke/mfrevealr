import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {CatalogProgress, UpdateResult} from './catalogStore';
import {ProgressBar} from './ProgressBar';
import {usePalette} from './theme';

/** The catalog revision, yyyyMMddHHmm in UTC, as a date in `language`. */
export function revisionDate(revision: number, language: string) {
  const digits = String(revision);
  const date = new Date(
    Date.UTC(
      Number(digits.slice(0, 4)),
      Number(digits.slice(4, 6)) - 1,
      Number(digits.slice(6, 8)),
    ),
  );
  try {
    return date.toLocaleDateString(language, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Starts a check as if the button were pressed. */
export type CatalogCheckHandle = {check: () => void};

/**
 * How recent the catalog is, with a button to look for a newer one, its
 * download progress and how the check went.
 */
export function CatalogCheck({
  ref,
  revision,
  progress,
  onCheck,
}: {
  ref?: React.Ref<CatalogCheckHandle>;
  revision: number;
  /** A catalog update running anywhere in the app. */
  progress?: CatalogProgress;
  onCheck: () => Promise<UpdateResult>;
}) {
  const palette = usePalette();
  const {t, i18n} = useTranslation();
  const [status, setStatus] = React.useState<'checking' | UpdateResult>();
  const checking = React.useRef(false);
  const check = () => {
    if (checking.current) {
      return;
    }
    checking.current = true;
    setStatus('checking');
    onCheck().then(result => {
      checking.current = false;
      setStatus(result);
    });
  };
  React.useImperativeHandle(ref, () => ({check}));
  const downloading = progress?.phase === 'downloading';
  return (
    <View>
      <View style={styles.catalog}>
        <Text style={[styles.text, {color: palette.text}]}>
          {t('catalog.version', {date: revisionDate(revision, i18n.language)})}
        </Text>
        <Pressable
          testID="catalog-check"
          onPress={check}
          disabled={status === 'checking'}
          accessibilityRole="button"
          accessibilityState={{busy: status === 'checking'}}
          hitSlop={8}>
          <Text style={[styles.button, {color: palette.accent}]}>
            {t('catalog.check')}
          </Text>
        </Pressable>
      </View>
      {progress && (
        <View style={styles.progress}>
          <ProgressBar
            testID="catalog-progress"
            done={downloading ? progress.done : undefined}
            total={downloading ? progress.total : undefined}
          />
        </View>
      )}
      {status && (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.status, {color: palette.secondary}]}>
          {t(`catalog.${status}`)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  catalog: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: {
    flexShrink: 1,
    fontSize: 15,
  },
  button: {
    fontSize: 15,
    fontWeight: '600',
  },
  progress: {
    marginTop: 10,
  },
  status: {
    fontSize: 14,
    marginTop: 4,
  },
});

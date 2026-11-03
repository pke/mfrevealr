import React from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {appVersion} from './appVersion';
import {CatalogCheck, revisionDate} from './CatalogCheck';
import type {CatalogProgress, UpdateResult} from './catalogStore';
import {LANGUAGE_NAMES, LANGUAGES, LanguagePreference} from './languages';
import type {Layout, Settings} from './settings';
import {Insets, Sheet} from './Sheet';
import {ThemePreference, usePalette} from './theme';

const THEMES = [
  {value: 'system', label: 'settings.themeSystem'},
  {value: 'light', label: 'settings.light'},
  {value: 'dark', label: 'settings.dark'},
] as const satisfies readonly {value: ThemePreference; label: string}[];

const LAYOUTS: readonly Layout[] = ['card', 'split', 'strip'];

/** A tiny sketch of each layout: camera in grey, panels in white. */
function LayoutPreview({layout}: {layout: Layout}) {
  return (
    <View style={styles.preview}>
      <View style={styles.previewFrame} />
      {layout === 'card' && <View style={styles.previewCard} />}
      {layout === 'split' && (
        <View style={styles.previewSplit}>
          {Array.from({length: 8}, (_, index) => (
            <View key={index} style={styles.previewTile} />
          ))}
        </View>
      )}
      {layout === 'strip' && (
        <View style={styles.previewStrip}>
          {Array.from({length: 4}, (_, index) => (
            <View key={index} style={styles.previewThumb} />
          ))}
        </View>
      )}
    </View>
  );
}

const TOGGLE_MS = 250;

type SectionId = 'catalog' | 'appearance' | 'language' | 'layout';

/**
 * A titled group of settings. With `onToggle` it collapses to its title and
 * `summary`, the current choice, so it can be read without opening it.
 */
function Section({
  id,
  title,
  summary,
  open = true,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  summary?: string;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  const palette = usePalette();
  const collapsible = onToggle !== undefined;
  const turn = React.useRef(new Animated.Value(open ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.timing(turn, {
      toValue: open ? 1 : 0,
      duration: TOGGLE_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [open, turn]);
  return (
    <View style={styles.block}>
      <Pressable
        testID={`section-${id}`}
        onPress={onToggle}
        accessibilityRole={collapsible ? 'button' : 'header'}
        accessibilityState={collapsible ? {expanded: open} : undefined}
        hitSlop={4}
        style={styles.header}>
        <Text style={[styles.section, {color: palette.secondary}]}>
          {title}
        </Text>
        {collapsible && !open && summary !== undefined && (
          <Text
            numberOfLines={1}
            style={[styles.summary, {color: palette.text}]}>
            {summary}
          </Text>
        )}
        {collapsible && (
          <Animated.Text
            importantForAccessibility="no"
            accessibilityElementsHidden
            style={[
              styles.chevron,
              {
                color: palette.secondary,
                transform: [
                  {
                    rotate: turn.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['90deg', '-90deg'],
                    }),
                  },
                ],
              },
            ]}>
            ›
          </Animated.Text>
        )}
      </Pressable>
      {open && children}
    </View>
  );
}

export function SettingsSheet({
  visible,
  insets,
  settings,
  canReset,
  catalogRevision,
  catalogProgress,
  onChange,
  onCheckCatalog,
  onReset,
  onClose,
}: {
  visible: boolean;
  insets: Insets;
  settings: Settings;
  canReset: boolean;
  catalogRevision: number;
  /** A catalog update running anywhere in the app. */
  catalogProgress?: CatalogProgress;
  onChange: (change: Partial<Settings>) => void;
  onCheckCatalog: () => Promise<UpdateResult>;
  onReset: () => void;
  onClose: () => void;
}) {
  const palette = usePalette();
  const {t, i18n} = useTranslation();
  // Collapsed until opened; stays as left while the app runs.
  const [open, setOpen] = React.useState<ReadonlySet<SectionId>>(new Set());
  const toggle = (id: SectionId) => () => {
    // The section unfolds, and the sheet, sized to its content, grows with it.
    LayoutAnimation.configureNext(
      LayoutAnimation.create(TOGGLE_MS, 'easeInEaseOut', 'opacity'),
    );
    setOpen(old => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const catalogDate = t('catalog.version', {
    date: revisionDate(catalogRevision, i18n.language),
  });
  const languages: {value: LanguagePreference; label: string}[] = [
    {value: 'system', label: t('settings.languageSystem')},
    ...LANGUAGES.map(language => ({
      value: language,
      label: LANGUAGE_NAMES[language],
    })),
  ];
  return (
    <Sheet
      visible={visible}
      insets={insets}
      title={t('settings.title')}
      onClose={onClose}>
      <Section
        id="catalog"
        title={t('catalog.title')}
        summary={catalogDate}
        open={open.has('catalog')}
        onToggle={toggle('catalog')}>
        <View style={styles.catalogBody}>
          <CatalogCheck
            revision={catalogRevision}
            progress={catalogProgress}
            onCheck={onCheckCatalog}
          />
        </View>
      </Section>
      <Section id="appearance" title={t('settings.appearance')}>
        <View
          accessibilityRole="radiogroup"
          style={[styles.segments, {backgroundColor: palette.track}]}>
          {THEMES.map(({value, label}) => {
            const selected = settings.theme === value;
            return (
              <Pressable
                key={value}
                testID={`theme-${value}`}
                onPress={() => onChange({theme: value})}
                accessibilityRole="radio"
                accessibilityState={{checked: selected}}
                style={[
                  styles.segment,
                  selected && {
                    backgroundColor: palette.surface,
                    borderColor: palette.accent,
                  },
                ]}>
                <Text
                  style={[
                    styles.segmentText,
                    {color: palette.text},
                    selected && styles.bold,
                  ]}>
                  {t(label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>
      <Section
        id="language"
        title={t('settings.language')}
        summary={
          languages.find(({value}) => value === settings.language)?.label
        }
        open={open.has('language')}
        onToggle={toggle('language')}>
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {languages.map(({value, label}) => {
            const selected = settings.language === value;
            return (
              <Pressable
                key={value}
                testID={`language-${value}`}
                onPress={() => onChange({language: value})}
                accessibilityRole="radio"
                accessibilityState={{checked: selected}}
                accessibilityLanguage={value === 'system' ? undefined : value}
                style={[
                  styles.chip,
                  {borderColor: selected ? palette.accent : palette.track},
                ]}>
                <Text
                  style={[
                    styles.segmentText,
                    {color: palette.text},
                    selected && styles.bold,
                  ]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>
      <Section
        id="layout"
        title={t('settings.layout')}
        summary={t(`layouts.${settings.layout}.label`)}
        open={open.has('layout')}
        onToggle={toggle('layout')}>
        <View accessibilityRole="radiogroup">
          {LAYOUTS.map(value => {
            const label = t(`layouts.${value}.label`);
            const description = t(`layouts.${value}.description`);
            const selected = settings.layout === value;
            return (
              <Pressable
                key={value}
                testID={`layout-${value}`}
                onPress={() => onChange({layout: value})}
                accessibilityRole="radio"
                accessibilityState={{checked: selected}}
                accessibilityLabel={`${label}. ${description}`}
                style={[
                  styles.option,
                  {borderColor: selected ? palette.accent : palette.track},
                ]}>
                <LayoutPreview layout={value} />
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, {color: palette.text}]}>
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      {color: palette.secondary},
                    ]}>
                    {description}
                  </Text>
                </View>
                {selected && (
                  <Text style={[styles.check, {color: palette.accent}]}>✓</Text>
                )}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.switchRow}>
          <View style={styles.optionText}>
            <Text style={[styles.optionLabel, {color: palette.text}]}>
              {t('settings.codeOverlay')}
            </Text>
            <Text
              style={[styles.optionDescription, {color: palette.secondary}]}>
              {t('settings.codeOverlayDescription')}
            </Text>
          </View>
          <Switch
            testID="setting-code-overlay"
            value={settings.codeOverlay}
            onValueChange={codeOverlay => onChange({codeOverlay})}
            trackColor={{true: palette.accent}}
            accessibilityLabel={t('settings.codeOverlay')}
            accessibilityHint={t('settings.codeOverlayDescription')}
          />
        </View>
      </Section>
      {canReset && (
        <Pressable
          testID="settings-start-over"
          onPress={onReset}
          accessibilityRole="button"
          style={styles.reset}>
          <Text style={[styles.link, {color: palette.secondary}]}>
            {t('reset.button')}
          </Text>
        </Pressable>
      )}
      {/* Selectable, so it can be copied into a bug report. */}
      <Text
        testID="app-version"
        selectable
        style={[styles.version, {color: palette.secondary}]}>
        {t('settings.version', {version: appVersion()})}
      </Text>
    </Sheet>
  );
}

const PREVIEW_CAMERA = '#48484A';

const styles = StyleSheet.create({
  block: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  section: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summary: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
  },
  chevron: {
    marginLeft: 'auto',
    fontSize: 22,
    lineHeight: 24,
  },
  segments: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  segmentText: {
    fontSize: 15,
  },
  bold: {
    fontWeight: '700',
  },
  catalogBody: {
    paddingBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 2,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    paddingRight: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  check: {
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 6,
  },
  preview: {
    width: 40,
    height: 64,
    borderRadius: 8,
    backgroundColor: PREVIEW_CAMERA,
    overflow: 'hidden',
    alignItems: 'center',
  },
  previewFrame: {
    marginTop: 12,
    width: 16,
    height: 12,
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 2,
  },
  previewCard: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  previewSplit: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    padding: 4,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: '#fff',
  },
  previewTile: {
    width: 5,
    height: 8,
    borderRadius: 1.5,
    backgroundColor: PREVIEW_CAMERA,
  },
  previewStrip: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 2,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  previewThumb: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
    backgroundColor: PREVIEW_CAMERA,
  },
  reset: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  link: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  version: {
    alignSelf: 'flex-start',
    fontSize: 13,
    paddingTop: 8,
    paddingBottom: 4,
  },
});

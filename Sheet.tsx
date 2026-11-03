import React from 'react';
import {
  Animated,
  BackHandler,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {usePalette} from './theme';

export type Insets = {top: number; bottom: number};

/**
 * A bottom sheet sized to its content, sliding up over the camera; when the
 * content is taller than the screen, the whole sheet scrolls. Closes
 * with its button, a tap on the dimmed backdrop, a swipe down or Android back.
 */
export function Sheet({
  visible,
  insets,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  insets: Insets;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const palette = usePalette();
  const {t} = useTranslation();
  const {height} = useWindowDimensions();
  const [mounted, setMounted] = React.useState(false);
  const sheetY = React.useRef(new Animated.Value(height)).current;
  const scrollY = React.useRef(0);
  const opened = React.useRef(false);
  const closing = React.useRef(false);

  const slide = React.useCallback(
    (toValue: number, done?: () => void) =>
      Animated.spring(sheetY, {
        toValue,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
        overshootClamping: true,
      }).start(({finished}) => finished && done?.()),
    [sheetY],
  );

  React.useEffect(() => {
    if (visible && !mounted) {
      sheetY.setValue(height);
      setMounted(true);
    } else if (visible && closing.current) {
      // Reopened while still sliding away.
      closing.current = false;
      opened.current = true;
      slide(0);
    } else if (!visible && opened.current) {
      opened.current = false;
      closing.current = true;
      slide(height, () => {
        closing.current = false;
        setMounted(false);
      });
    } else if (!visible && mounted && !closing.current) {
      // Closed before the first layout opened it: nothing showed yet, so
      // start from scratch next time instead of waiting for a layout that
      // has already happened.
      setMounted(false);
    }
  }, [visible, mounted, height, sheetY, slide]);

  // Opening waits for the first layout so the sheet starts off screen.
  const onLayout = React.useCallback(
    (_: LayoutChangeEvent) => {
      if (visible && !opened.current) {
        opened.current = true;
        slide(0);
      }
    },
    [visible, slide],
  );

  const swipe = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, {dx, dy}) =>
          scrollY.current <= 0 && dy > 8 && dy > Math.abs(dx) * 1.5,
        onPanResponderMove: (_, {dy}) => sheetY.setValue(Math.max(0, dy)),
        onPanResponderRelease: (_, {dy, vy}) =>
          dy > 100 || vy > 0.8 ? onClose() : slide(0),
        onPanResponderTerminate: () => slide(0),
        onPanResponderTerminationRequest: () => false,
      }),
    [sheetY, slide, onClose],
  );

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
        accessibilityLabel={t('sheet.closeTitle', {title})}
        style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            sheetStyles.backdrop,
            {
              opacity: sheetY.interpolate({
                inputRange: [0, height],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </Pressable>
      <Animated.View
        {...swipe.panHandlers}
        onLayout={onLayout}
        style={[
          sheetStyles.sheet,
          {
            maxHeight: height - insets.top - 10,
            backgroundColor: palette.surface,
            transform: [{translateY: sheetY}],
          },
        ]}>
        <ScrollView
          bounces={false}
          scrollEventThrottle={16}
          onScroll={event => {
            scrollY.current = event.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={[
            sheetStyles.content,
            {paddingBottom: insets.bottom + 16},
          ]}>
          <View
            style={[sheetStyles.grabber, {backgroundColor: palette.secondary}]}
          />
          <View style={sheetStyles.header}>
            <Text
              style={[
                sheetStyles.title,
                sheetStyles.grow,
                {color: palette.text},
              ]}>
              {title}
            </Text>
            <Pressable
              testID="sheet-close"
              onPress={onClose}
              accessibilityRole="button"
              hitSlop={12}>
              <Text style={[sheetStyles.close, {color: palette.text}]}>
                {t('sheet.close')}
              </Text>
            </Pressable>
          </View>
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

export const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  // On the scrolling content, not the sheet: the scroll bar keeps to the
  // sheet's edge.
  content: {
    paddingHorizontal: 16,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 16,
  },
  grow: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  close: {
    fontSize: 17,
    fontWeight: '600',
    paddingTop: 4,
  },
});

import React from 'react';
import {Image, Linking, StyleSheet, Text, View} from 'react-native';
import type {FakeCameraCode, FakeCameraProps} from '../../fakeCamera';

// Stands in for fakeCamera.ts in E2E_BUILD=1 builds. Tests "hold boxes in
// front of the camera" by opening mfrevealr-e2e://scan/<data-matrix values>,
// each URI-encoded, separated by commas: they go through the app's own scan
// handling as one frame, as the code reader would deliver them. The box
// photo shows two box codes; the first values held up are read there, again
// and again like a real camera, so figures can be drawn on them.

const SCAN = /^mfrevealr-e2e:\/\/scan\/(.+)$/;

const PHOTO = {width: 780, height: 975};
// The photo's data matrix codes, in its pixels.
const CODES = [
  {x: 548, y: 398, width: 100, height: 105},
  {x: 591, y: 729, width: 69, height: 63},
];
// Readings like a camera's: 30 a second, each a little off.
const EVERY_MS = 33;
const JITTER = 2;

type Size = {width: number; height: number};

/** The photo filling the view, its right edge kept where the codes are. */
function photoFrame(view: Size) {
  const scale = Math.max(view.width / PHOTO.width, view.height / PHOTO.height);
  return {
    scale,
    left: view.width - PHOTO.width * scale,
    top: (view.height - PHOTO.height * scale) / 2,
    width: PHOTO.width * scale,
    height: PHOTO.height * scale,
  };
}

function FakeCameraView({onScan, onCodes}: FakeCameraProps) {
  const onScanRef = React.useRef(onScan);
  onScanRef.current = onScan;
  const onCodesRef = React.useRef(onCodes);
  onCodesRef.current = onCodes;
  const [values, setValues] = React.useState<string[]>([]);
  const [view, setView] = React.useState<Size>();

  React.useEffect(() => {
    const receive = (url?: string | null) => {
      const match = url?.match(SCAN);
      if (match) {
        const scanned = match[1].split(',').map(decodeURIComponent);
        setValues(scanned);
        onScanRef.current(scanned);
      }
    };
    Linking.getInitialURL().then(receive);
    const subscription = Linking.addEventListener('url', ({url}) =>
      receive(url),
    );
    return () => subscription.remove();
  }, []);

  const frame = view && photoFrame(view);
  const left = frame?.left ?? 0;
  const top = frame?.top ?? 0;
  const scale = frame?.scale ?? 0;
  React.useEffect(() => {
    if (!scale || !values.length) {
      return;
    }
    const timer = setInterval(() => {
      const off = () => (Math.random() * 2 - 1) * JITTER;
      const codes: FakeCameraCode[] = values
        .slice(0, CODES.length)
        .map((value, index) => {
          const code = CODES[index];
          return {
            value,
            rect: {
              x: left + code.x * scale + off(),
              y: top + code.y * scale + off(),
              width: code.width * scale,
              height: code.height * scale,
            },
          };
        });
      onCodesRef.current?.(codes);
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, [left, top, scale, values]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={event => setView(event.nativeEvent.layout)}>
      {frame && (
        <Image
          source={require('../../screenshots/photos/shelf.jpg')}
          style={[
            styles.photo,
            {
              left: frame.left,
              top: frame.top,
              width: frame.width,
              height: frame.height,
            },
          ]}
        />
      )}
      <Text testID="fake-camera" style={styles.label}>
        {values.length
          ? `Simulated camera: ${values.join(', ')}`
          : 'Simulated camera'}
      </Text>
    </View>
  );
}

export const FakeCamera = FakeCameraView;

const styles = StyleSheet.create({
  photo: {
    position: 'absolute',
  },
  label: {
    position: 'absolute',
    top: 64,
    left: 16,
    color: '#fff',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

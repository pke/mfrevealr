import React from 'react';
import {Image, Linking, StyleSheet, Text, View} from 'react-native';
import type {FakeCameraProps} from '../../fakeCamera';

// Stands in for fakeCamera.ts in E2E_BUILD=1 builds. Tests "hold boxes in
// front of the camera" by opening mfrevealr-e2e://scan/<data-matrix values>,
// each URI-encoded, separated by commas: they go through the app's own scan
// handling as one frame, as the code reader would deliver them. The box photo only makes reports look like the real app.

const SCAN = /^mfrevealr-e2e:\/\/scan\/(.+)$/;

function FakeCameraView({onScan}: FakeCameraProps) {
  const onScanRef = React.useRef(onScan);
  onScanRef.current = onScan;
  const [last, setLast] = React.useState<string>();

  React.useEffect(() => {
    const receive = (url?: string | null) => {
      const match = url?.match(SCAN);
      if (match) {
        const values = match[1].split(',').map(decodeURIComponent);
        setLast(values.join(', '));
        onScanRef.current(values);
      }
    };
    Linking.getInitialURL().then(receive);
    const subscription = Linking.addEventListener('url', ({url}) =>
      receive(url),
    );
    return () => subscription.remove();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        source={require('../../screenshots/photos/shelf.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <Text testID="fake-camera" style={styles.label}>
        {last ? `Simulated camera: ${last}` : 'Simulated camera'}
      </Text>
    </View>
  );
}

export const FakeCamera = FakeCameraView;

const styles = StyleSheet.create({
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

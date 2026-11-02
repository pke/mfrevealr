import type React from 'react';

/**
 * Stands in for the camera in end-to-end test builds, where simulators have
 * none: it shows a box and feeds the codes a test sends in as if they had
 * been scanned. Only `E2E_BUILD=1` builds bundle one (e2e/app/fakeCamera.tsx,
 * swapped in by metro.config.js); the app itself always gets this empty stub.
 */
/** A code in view and where it is, in the camera view's points. */
export type FakeCameraCode = {
  value: string;
  rect: {x: number; y: number; width: number; height: number};
};

export type FakeCameraProps = {
  onScan: (values: string[]) => void;
  // Where the codes held up are, read again and again like a real camera.
  onCodes?: (codes: FakeCameraCode[]) => void;
};

export const FakeCamera: React.ComponentType<FakeCameraProps> | undefined =
  undefined;

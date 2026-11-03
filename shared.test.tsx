import {measure} from './shared';

test('A view is measured where it is in the window', async () => {
  const view = {
    measureInWindow: (answer: (...rect: number[]) => void) =>
      answer(10, 20, 30, 40),
  };
  await expect(measure(view)).resolves.toEqual({
    x: 10,
    y: 20,
    width: 30,
    height: 40,
  });
});

test('A view gone from the screen is not waited for', async () => {
  // React Native never answers for a view that is no longer mounted.
  const gone = {measureInWindow: () => {}};
  await expect(measure(gone)).resolves.toBeUndefined();
});

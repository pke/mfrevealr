import {BOX, expect, scan, SERIES_25, test} from '../support';

test('the card opens the series with the found figures ticked', async ({
  device,
  screen,
}) => {
  await scan(device, BOX.fitness);
  await screen.getByTestId('reveal-card').tap();
  await expect(screen.getByTestId(`tile-${SERIES_25[1]}`)).toBeChecked();
  await expect(screen.getByTestId(`tile-${SERIES_25[0]}`)).not.toBeChecked();
  await expect(screen.getByText('1 of 12 found · tap to tick off')).toBeVisible();
});

test('figures can be ticked off by hand', async ({device, screen}) => {
  await scan(device, BOX.fitness);
  await screen.getByTestId('reveal-card').tap();
  await screen.getByTestId(`tile-${SERIES_25[3]}`).tap();
  await expect(screen.getByTestId(`tile-${SERIES_25[3]}`)).toBeChecked();
  await expect(screen.getByText('2 of 12 found · tap to tick off')).toBeVisible();

  await screen.getByTestId(`tile-${SERIES_25[3]}`).tap();
  await expect(screen.getByTestId(`tile-${SERIES_25[3]}`)).not.toBeChecked();
});

test('the series sheet closes again', async ({device, screen}) => {
  await scan(device, BOX.fitness);
  await screen.getByTestId('reveal-card').tap();
  await expect(screen.getByTestId('series-close')).toBeVisible();
  await screen.getByTestId('series-close').tap();
  await expect(screen.getByTestId('series-close')).toBeHidden();
  await expect(screen.getByTestId('reveal-card')).toBeVisible();
});

test('ticking off every figure completes the series', async ({
  device,
  screen,
}) => {
  await scan(device, BOX.fitness);
  await screen.getByTestId('reveal-card').tap();
  for (const code of SERIES_25.filter(other => other !== SERIES_25[1])) {
    await screen.getByTestId(`tile-${code}`).tap();
  }
  await expect(screen.getByText('12 of 12 found · tap to tick off')).toBeVisible();
  await screen.getByTestId('series-close').tap();
  await expect(screen.getByTestId('reveal-card')).toContainText(
    'Series complete',
  );
});

test('starting over clears the collection', async ({device, screen}) => {
  await scan(device, BOX.fitness);
  await scan(device, BOX.sprite);
  await screen.getByTestId('reveal-card').tap();
  await screen.getByTestId('series-start-over').tap();
  // The confirmation is a system alert. Its "Start over" sits before or
  // after the sheet's own in the tree depending on the device, so take the
  // one beside the alert's Cancel (in capitals on Android).
  await device
    .locator('role=scroll-area')
    .filter({has: screen.getByRole('button', /^cancel$/i)})
    .getByRole('button', /^start over$/i)
    .tap();
  await expect(screen.getByTestId('scan-hint')).toBeVisible();
});

import {BOX, expect, scan, SERIES_25, test} from '../support';

test('the card opens the series with the found figures ticked', async ({
  device,
  screen,
}) => {
  await scan(device, BOX.fitness);
  await screen.getByTestId('reveal-card').tap();
  await expect(screen.getByTestId(`tile-${SERIES_25[1]}`)).toBeChecked();
  await expect(screen.getByTestId(`tile-${SERIES_25[0]}`)).not.toBeChecked();
  await expect(
    screen.getByText('1 of 12 found · tap to tick off'),
  ).toBeVisible();
});

test('figures can be ticked off by hand', async ({device, screen}) => {
  await scan(device, BOX.fitness);
  await screen.getByTestId('reveal-card').tap();
  await screen.getByTestId(`tile-${SERIES_25[3]}`).tap();
  await expect(screen.getByTestId(`tile-${SERIES_25[3]}`)).toBeChecked();
  await expect(
    screen.getByText('2 of 12 found · tap to tick off'),
  ).toBeVisible();

  await screen.getByTestId(`tile-${SERIES_25[3]}`).tap();
  await expect(screen.getByTestId(`tile-${SERIES_25[3]}`)).not.toBeChecked();
});

test('the collection is kept when the app starts again', async ({
  app,
  device,
  screen,
}) => {
  await scan(device, BOX.fitness);
  await screen.getByTestId('reveal-card').tap();
  await screen.getByTestId(`tile-${SERIES_25[3]}`).tap();
  await expect(screen.getByTestId(`tile-${SERIES_25[3]}`)).toBeChecked();

  await app.restart();
  // Nothing scanned yet: the card shows the series being collected.
  await screen.getByTestId('series-card').tap();
  await expect(screen.getByTestId(`tile-${SERIES_25[1]}`)).toBeChecked();
  await expect(screen.getByTestId(`tile-${SERIES_25[3]}`)).toBeChecked();
  await expect(
    screen.getByText('2 of 12 found · tap to tick off'),
  ).toBeVisible();
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
  await expect(
    screen.getByText('12 of 12 found · tap to tick off'),
  ).toBeVisible();
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

test('the collection lists every series started and opens one', async ({
  device,
  screen,
}) => {
  await scan(device, BOX.fitness);
  await scan(device, BOX.blacktron);
  await screen.getByTestId('collection-button').tap();
  await expect(screen.getByTestId('collection-71045')).toContainText(
    'Series 25',
  );
  await expect(screen.getByTestId('collection-71046')).toContainText(
    'Series 26 Space',
  );

  await screen.getByTestId('collection-71045').tap();
  await expect(
    screen.getByText('1 of 12 found · tap to tick off'),
  ).toBeVisible();
  await expect(screen.getByTestId(`tile-${SERIES_25[1]}`)).toBeChecked();
  // Closed, the series goes back to the collection it was opened from.
  await screen.getByTestId('series-close').tap();
  await expect(screen.getByTestId('series-close')).toBeHidden();
  await expect(screen.getByTestId('collection-71046')).toBeVisible();
  // So it does when pulled down, opened on a figure touched in its row.
  await screen.getByTestId(`collection-figure-${SERIES_25[1]}`).tap();
  await expect(screen.getByTestId('series-close')).toBeVisible();
  await screen.swipe({from: {x: 200, y: 300}, to: {x: 200, y: 800}});
  await expect(screen.getByTestId('series-close')).toBeHidden();
  await expect(screen.getByTestId('collection-71046')).toBeVisible();
});

test('the collection closes when pulled down', async ({device, screen}) => {
  await scan(device, BOX.fitness);
  await screen.getByTestId('collection-button').tap();
  await expect(screen.getByTestId('collection-71045')).toBeVisible();
  // The list is longer than the screen: a pull from within it still
  // closes the sheet.
  await screen.swipe({from: {x: 200, y: 300}, to: {x: 200, y: 800}});
  await expect(screen.getByTestId('collection-71045')).toBeHidden();
  await expect(screen.getByTestId('collection-button')).toBeVisible();
});

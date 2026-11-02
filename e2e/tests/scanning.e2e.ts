import {BOX, expect, scan, SERIES_25, test} from '../support';

test('before the first box, the card explains what to scan', async ({
  screen,
}) => {
  await expect(screen.getByTestId('scan-hint')).toBeVisible();
  await expect(screen.getByText('Scan a box')).toBeVisible();
});

test('a scanned box reveals the figure inside', async ({device, screen}) => {
  await scan(device, BOX.fitness);
  const card = screen.getByTestId('reveal-card');
  await expect(card).toContainText('Fitness Instructor');
  await expect(card).toContainText('Series 25');
  await expect(card).toContainText('New for your collection');
  await expect(card).toContainText('1 of 12');
  await expect(screen.getByTestId('scan-hint')).toBeHidden();
});

test('each new box of the series adds to the collection', async ({
  device,
  screen,
}) => {
  await scan(device, BOX.fitness);
  await scan(device, BOX.sprite);
  const card = screen.getByTestId('reveal-card');
  await expect(card).toContainText('Mushroom Sprite');
  await expect(card).toContainText('2 of 12');
});

test('two boxes in view both count', async ({device, screen}) => {
  await scan(device, BOX.fitness, BOX.sprite);
  const card = screen.getByTestId('reveal-card');
  await expect(card).toContainText('2 of 12');
  await card.tap();
  await expect(screen.getByTestId(`tile-${SERIES_25[1]}`)).toBeChecked();
  await expect(screen.getByTestId(`tile-${SERIES_25[2]}`)).toBeChecked();
});

test('a figure found before is not counted twice', async ({device, screen}) => {
  await scan(device, BOX.fitness);
  await scan(device, BOX.sprite);
  await scan(device, BOX.fitness);
  const card = screen.getByTestId('reveal-card');
  await expect(card).toContainText('Fitness Instructor');
  await expect(card).toContainText('Already found');
  await expect(card).toContainText('2 of 12');
});

test('a box from another series starts that series', async ({
  device,
  screen,
}) => {
  await scan(device, BOX.fitness);
  await scan(device, BOX.blacktron);
  const card = screen.getByTestId('reveal-card');
  await expect(card).toContainText('Blacktron Mutant');
  await expect(card).toContainText('Series 26');
  await expect(card).toContainText('1 of 12');
});

test('a code that is no minifigure box says so', async ({device, screen}) => {
  await scan(device, 'NOT A BOX');
  await expect(screen.getByTestId('fake-camera')).toContainText('NOT A BOX');
  await expect(screen.getByTestId('lookup-message')).toContainText(
    'Not a minifigure box',
  );
  // A real box afterwards shows as usual.
  await scan(device, BOX.fitness);
  await expect(screen.getByTestId('reveal-card')).toContainText(
    'Fitness Instructor',
  );
  await expect(screen.getByTestId('lookup-message')).toBeHidden();
});

import {BOX, expect, scan, SERIES_25, test} from '../support';

test('the settings sheet shows the app version', async ({screen}) => {
  await screen.getByTestId('settings-button').tap();
  await expect(screen.getByTestId('app-version')).toHaveText(
    /^Version \d+\.\d+\.\d+/,
  );
  await screen.getByTestId('sheet-close').tap();
  await expect(screen.getByTestId('app-version')).toBeHidden();
});

test('the split checklist shows the whole series', async ({device, screen}) => {
  await screen.getByTestId('settings-button').tap();
  await screen.getByTestId('section-layout').tap();
  await screen.getByTestId('layout-split').tap();
  await expect(screen.getByTestId('layout-split')).toBeChecked();
  await screen.getByTestId('sheet-close').tap();

  await scan(device, BOX.fitness);
  await expect(screen.getByTestId(`split-${SERIES_25[1]}`)).toBeChecked();
  await expect(screen.getByTestId(`split-${SERIES_25[0]}`)).not.toBeChecked();
});

test('the slim strip shows the series as thumbnails', async ({
  device,
  screen,
}) => {
  await screen.getByTestId('settings-button').tap();
  await screen.getByTestId('section-layout').tap();
  await screen.getByTestId('layout-strip').tap();
  await screen.getByTestId('sheet-close').tap();

  await scan(device, BOX.fitness);
  await expect(screen.getByTestId(`strip-${SERIES_25[1]}`)).toBeVisible();
  await expect(screen.getByTestId('reveal-card')).toBeHidden();
});

test('the language can be picked in the app', async ({screen}) => {
  await screen.getByTestId('settings-button').tap();
  await screen.getByTestId('section-language').tap();
  await screen.getByTestId('language-de').tap();
  await expect(screen.getByTestId('language-de')).toBeChecked();
  await expect(
    screen.getByRole('button', 'Einstellungen schließen'),
  ).toBeVisible();

  await screen.getByTestId('language-system').tap();
  await expect(screen.getByRole('button', 'Close Settings')).toBeVisible();
});

test('settings sections other than appearance fold away', async ({screen}) => {
  await screen.getByTestId('settings-button').tap();
  const language = screen.getByTestId('section-language');
  await expect(language).toContainText('System');
  await expect(screen.getByTestId('language-de')).toBeHidden();
  await language.tap();
  await expect(screen.getByTestId('language-de')).toBeVisible();
  await language.tap();
  await expect(screen.getByTestId('language-de')).toBeHidden();
  await expect(screen.getByTestId('theme-dark')).toBeVisible();
});

test('the appearance can be picked in the app', async ({screen}) => {
  await screen.getByTestId('settings-button').tap();
  await expect(screen.getByTestId('theme-system')).toBeChecked();
  await screen.getByTestId('theme-dark').tap();
  await expect(screen.getByTestId('theme-dark')).toBeChecked();
  await expect(screen.getByTestId('theme-system')).not.toBeChecked();
});

test('the flashlight switch turns on and off', async ({screen}) => {
  const torch = screen.getByTestId('torch-button');
  await expect(torch).not.toBeChecked();
  await torch.tap();
  await expect(torch).toBeChecked();
  await torch.tap();
  await expect(torch).not.toBeChecked();
});

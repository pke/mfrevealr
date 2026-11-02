import {CatalogServer, startCatalogServer} from '../catalogServer';
import {BOX, expect, onPhysicalDevice, scan, test} from '../support';

// The test build comes with a catalog that lacks the Shrek Series
// (e2e/app/catalogSource.ts) and updates from this server, which plays the
// GitHub release in its different versions.
// Started by the worker that runs these tests, not each time the file loads.
let server: CatalogServer;
test.beforeAll(async () => {
  server = await startCatalogServer();
});
test.afterEach(() => server.serve('bundled'));
test.afterAll(() => server.close());

// A whole catalog of pictures has to arrive first.
const DOWNLOAD = {timeout: 30_000};

test('a box of a series the app lacks shows once the catalog updates', async ({
  device,
  screen,
}) => {
  test.skip(onPhysicalDevice(device), 'needs the catalog server');
  server.serve('latest', {delay: 100});
  await scan(device, BOX.thelonious);
  const search = screen.getByTestId('lookup-message');
  await expect(search).toContainText('Looking for this figure…');
  await expect(search).toContainText('6634903');
  await expect(screen.getByTestId('lookup-progress')).toBeVisible();
  const card = screen.getByTestId('reveal-card');
  await expect(card).toContainText('Thelonious', DOWNLOAD);
  await expect(card).toContainText('Shrek Series');
  // The card told it all; no banner on top.
  await expect(screen.getByTestId('catalog-notice')).toBeHidden();
});

test('an unknown box without a newer catalog changes nothing', async ({
  device,
  screen,
}) => {
  test.skip(onPhysicalDevice(device), 'needs the catalog server');
  await scan(device, BOX.thelonious);
  const message = screen.getByTestId('lookup-message');
  await expect(message).toContainText('Unknown figure', DOWNLOAD);
  await expect(message).toContainText("Code 6634903 isn't in the catalog yet.");
});

test('an unknown box tells when the update fails', async ({device, screen}) => {
  test.skip(onPhysicalDevice(device), 'needs the catalog server');
  server.serve('offline');
  await scan(device, BOX.thelonious);
  await expect(screen.getByTestId('lookup-message')).toContainText(
    "Couldn't check for new figures. Try again later.",
    DOWNLOAD,
  );
});

test('a corrupt download is shown and keeps the catalog the app had', async ({
  device,
  screen,
}) => {
  test.skip(onPhysicalDevice(device), 'needs the catalog server');
  server.serve('broken');
  await scan(device, BOX.thelonious);
  await expect(screen.getByTestId('lookup-message')).toContainText(
    "Couldn't check for new figures. Try again later.",
    DOWNLOAD,
  );
  await screen.getByTestId('settings-button').tap();
  await expect(screen.getByTestId('section-catalog')).toContainText(
    'Jan 1, 2026',
  );
});

test('at start a newer catalog shows its download and arrival', async ({
  app,
  device,
  screen,
}) => {
  test.skip(onPhysicalDevice(device), 'needs the catalog server');
  server.serve('latest', {delay: 100});
  await app.restart();
  await expect(screen.getByText('Loading new figures…')).toBeVisible();
  await expect(screen.getByText('New figures are here')).toBeVisible(DOWNLOAD);
  // Known now, so it shows right away.
  await scan(device, BOX.thelonious);
  await expect(screen.getByTestId('reveal-card')).toContainText('Thelonious');
});

test('at start an up to date or unreachable catalog stays quiet', async ({
  app,
  device,
  screen,
}) => {
  test.skip(onPhysicalDevice(device), 'needs the catalog server');
  for (const version of ['bundled', 'offline'] as const) {
    server.serve(version);
    await app.restart();
    await expect(screen.getByTestId('scan-hint')).toBeVisible();
    await expect(screen.getByTestId('catalog-notice')).not.toBeVisible();
  }
});

test('each newer catalog brings its series', async ({device, screen}) => {
  test.skip(onPhysicalDevice(device), 'needs the catalog server');
  server.serve('latest');
  await scan(device, BOX.thelonious);
  const card = screen.getByTestId('reveal-card');
  await expect(card).toContainText('Thelonious', DOWNLOAD);

  server.serve('next');
  await scan(device, BOX.testPilot);
  await expect(card).toContainText('Test Pilot', DOWNLOAD);
  await expect(card).toContainText('Test Series');
  await screen.getByTestId('settings-button').tap();
  await expect(screen.getByTestId('section-catalog')).toContainText(
    'Dec 1, 2026',
  );
});

test('checking in the settings shows the download progress', async ({
  device,
  screen,
}) => {
  test.skip(onPhysicalDevice(device), 'needs the catalog server');
  server.serve('latest', {delay: 150});
  await screen.getByTestId('settings-button').tap();
  await screen.getByTestId('section-catalog').tap();
  await screen.getByTestId('catalog-check').tap();
  await expect(screen.getByTestId('catalog-progress')).toBeVisible();
  await expect(screen.getByText('Updated')).toBeVisible(DOWNLOAD);
  await expect(screen.getByText('Figures as of Nov 2, 2026')).toBeVisible();
});

test('without the reveal card, the search shows as a banner', async ({
  device,
  screen,
}) => {
  test.skip(onPhysicalDevice(device), 'needs the catalog server');
  await screen.getByTestId('settings-button').tap();
  await screen.getByTestId('section-layout').tap();
  await screen.getByTestId('layout-strip').tap();
  await screen.getByTestId('sheet-close').tap();

  server.serve('latest', {delay: 100});
  await scan(device, BOX.thelonious);
  await expect(screen.getByText('Looking for new figures…')).toBeVisible();
  await expect(screen.getByTestId('catalog-notice-progress')).toBeVisible();
  await expect(screen.getByText('New figures are here')).toBeVisible(DOWNLOAD);
  await expect(screen.getByTestId('strip-6634903')).toBeVisible();
});

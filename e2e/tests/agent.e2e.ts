import {BOX, expect, scan, SERIES_25, test} from '../support';

// Goals in plain language, checked with exact assertions. They need a model:
// set ANTHROPIC_API_KEY. Without it these skip; the rest of the suite runs.

const noModel = !process.env.ANTHROPIC_API_KEY;

test('a collector ticks off a figure they already own', async ({
  agent,
  device,
  screen,
}) => {
  test.skip(noModel, 'needs ANTHROPIC_API_KEY');
  await scan(device, BOX.fitness);
  await agent.act('open the series of the figure just scanned');
  await expect(screen.getByTestId('series-close')).toBeVisible();
  await agent.act('tick off the {name}', {params: {name: 'Goatherd'}});
  await expect(screen.getByTestId(`tile-${SERIES_25[3]}`)).toBeChecked();
});

test('the revealed figure is shown as a picture', async ({agent, device}) => {
  test.skip(noModel, 'needs ANTHROPIC_API_KEY');
  await scan(device, BOX.barbarian);
  // The figure image is part of the card's accessibility node, so the
  // judge needs the screenshot to see it.
  await agent.assert(
    'the card shows a picture of a minifigure and the name Fierce Barbarian',
    {vision: true},
  );
});

test('a collector switches the app to Spanish', async ({agent, screen}) => {
  test.skip(noModel, 'needs ANTHROPIC_API_KEY');
  await agent.act('switch the app language to Spanish');
  await expect(screen.getByTestId('language-es')).toBeChecked();
});

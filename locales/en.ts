const en = {
  permission: {
    message:
      'Mini Figure Revealr needs camera access to scan the code on the box.',
    allow: 'Allow camera access',
    openSettings: 'Open settings',
  },
  camera: {
    unavailable: 'No camera available',
  },
  hint: {
    title: 'Scan a box',
    text: 'Point the camera at the larger square code on the side of the box.',
    short: 'Point at the larger square code on the side',
    image: 'Box side with the square code to scan highlighted in green',
  },
  status: {
    complete: 'Series complete',
    new: 'New for your collection',
    known: 'Already found',
  },
  progress: '{{found}} of {{total}}',
  card: {
    showSeries: 'Shows every figure in this series',
  },
  series: {
    fallback: 'Series',
    summary: '{{found}} of {{total}} found · tap to tick off',
    close: 'Close series',
    tapToTick: 'Tap a figure to tick it off',
    lastScanned: '{{name}}, last scanned',
    thumbFound: '{{name}}, found. Show series.',
    thumbMissing: '{{name}}, missing. Show series.',
  },
  reset: {
    button: 'Start over',
    title: 'Start over?',
    message: 'All found figures will be unchecked.',
    cancel: 'Cancel',
  },
  sheet: {
    close: 'Close',
    closeTitle: 'Close {{title}}',
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    layout: 'Layout',
    language: 'Language',
    themeSystem: 'System',
    languageSystem: 'System',
    light: 'Light',
    dark: 'Dark',
  },
  catalog: {
    title: 'Catalog',
    version: 'Figures as of {{date}}',
    check: 'Check for updates',
    checking: 'Checking…',
    current: 'Up to date',
    updated: 'Updated',
    failed: 'Could not update. Try again later.',
  },
  layouts: {
    card: {
      label: 'Reveal card',
      description: 'A big card for the figure you just scanned.',
    },
    split: {
      label: 'Split checklist',
      description: 'Camera on top, the whole series always below.',
    },
    strip: {
      label: 'Slim strip',
      description: 'Full camera with a small row of figures.',
    },
  },
};

type Strings<T> = {
  [K in keyof T]: T[K] extends string ? string : Strings<T[K]>;
};

/** Every language must provide every string English has. */
export type Translation = Strings<typeof en>;

export default en;

import type {Translation} from './en';

const de: Translation = {
  permission: {
    message:
      'Mini Figure Revealr braucht Zugriff auf die Kamera, um den Code auf der Packung zu scannen.',
    allow: 'Kamerazugriff erlauben',
    openSettings: 'Einstellungen öffnen',
  },
  camera: {
    unavailable: 'Keine Kamera verfügbar',
    torch: 'Taschenlampe',
  },
  hint: {
    title: 'Packung scannen',
    text: 'Richte die Kamera auf den größeren quadratischen Code an der Seite der Packung.',
    short: 'Auf den größeren quadratischen Code an der Seite richten',
    image:
      'Packungsseite, der zu scannende quadratische Code ist grün markiert',
  },
  status: {
    complete: 'Serie komplett',
    new: 'Neu in deiner Sammlung',
    known: 'Schon gefunden',
  },
  progress: '{{found}} von {{total}}',
  card: {
    showSeries: 'Zeigt alle Figuren dieser Serie',
  },
  series: {
    fallback: 'Serie',
    summary: '{{found}} von {{total}} gefunden · zum Abhaken antippen',
    close: 'Serie schließen',
    tapToTick: 'Tippe auf eine Figur, um sie abzuhaken',
    lastScanned: '{{name}}, zuletzt gescannt',
    thumbFound: '{{name}}, gefunden. Serie anzeigen.',
    thumbMissing: '{{name}}, fehlt. Serie anzeigen.',
  },
  reset: {
    button: 'Neu beginnen',
    title: 'Neu beginnen?',
    message: 'Alle gefundenen Figuren werden wieder abgewählt.',
    cancel: 'Abbrechen',
  },
  sheet: {
    close: 'Schließen',
    closeTitle: '{{title}} schließen',
  },
  settings: {
    title: 'Einstellungen',
    version: 'Version {{version}}',
    appearance: 'Darstellung',
    layout: 'Layout',
    language: 'Sprache',
    themeSystem: 'System',
    languageSystem: 'System',
    light: 'Hell',
    dark: 'Dunkel',
    codeOverlay: 'Figuren auf den Codes',
    codeOverlayDescription:
      'Zeigt das Bild jeder Figur direkt auf dem Code ihrer Packung in der Kamera.',
  },
  catalog: {
    title: 'Katalog',
    version: 'Figuren mit Stand {{date}}',
    check: 'Nach Updates suchen',
    checking: 'Wird geprüft…',
    current: 'Aktuell',
    updated: 'Aktualisiert',
    failed: 'Update fehlgeschlagen. Versuche es später erneut.',
    looking: 'Suche nach neuen Figuren…',
    updating: 'Neue Figuren werden geladen…',
    arrived: 'Neue Figuren sind da',
    lookupFailed:
      'Neue Figuren konnten nicht geladen werden. Versuche es später erneut.',
  },
  lookup: {
    looking: 'Suche nach dieser Figur…',
    searching:
      'Code {{code}} ist noch nicht im Katalog. Suche nach neuen Figuren.',
    unknown: 'Unbekannte Figur',
    notInCatalog: 'Code {{code}} ist noch nicht im Katalog.',
    failed:
      'Suche nach neuen Figuren fehlgeschlagen. Versuche es später erneut.',
    notABox: 'Keine Minifiguren-Packung',
  },
  layouts: {
    card: {
      label: 'Enthüllungskarte',
      description: 'Eine große Karte für die gerade gescannte Figur.',
    },
    split: {
      label: 'Geteilte Checkliste',
      description: 'Kamera oben, darunter immer die ganze Serie.',
    },
    strip: {
      label: 'Schmaler Streifen',
      description: 'Volle Kamera mit einer kleinen Reihe Figuren.',
    },
  },
};

export default de;

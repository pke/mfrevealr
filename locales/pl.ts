import type {Translation} from './en';

const pl: Translation = {
  permission: {
    message:
      'Mini Figure Revealr potrzebuje dostępu do aparatu, aby zeskanować kod na opakowaniu.',
    allow: 'Zezwól na dostęp do aparatu',
    openSettings: 'Otwórz ustawienia',
  },
  camera: {
    unavailable: 'Aparat jest niedostępny',
    torch: 'Latarka',
  },
  hint: {
    title: 'Zeskanuj opakowanie',
    text: 'Skieruj aparat na większy kwadratowy kod z boku opakowania.',
    short: 'Skieruj na większy kwadratowy kod z boku',
    image:
      'Bok opakowania z zaznaczonym na zielono kwadratowym kodem do zeskanowania',
  },
  status: {
    complete: 'Seria kompletna',
    new: 'Nowość w Twojej kolekcji',
    known: 'Już znaleziona',
  },
  progress: '{{found}} z {{total}}',
  card: {
    showSeries: 'Pokazuje wszystkie figurki z tej serii',
  },
  series: {
    fallback: 'Seria',
    summary: 'Znalezione: {{found}} z {{total}} · dotknij, aby odhaczyć',
    close: 'Zamknij serię',
    tapToTick: 'Dotknij figurki, aby ją odhaczyć',
    lastScanned: '{{name}}, ostatnio zeskanowana',
    thumbFound: '{{name}}, znaleziona. Pokaż serię.',
    thumbMissing: '{{name}}, brakuje. Pokaż serię.',
  },
  reset: {
    button: 'Zacznij od nowa',
    title: 'Zacząć od nowa?',
    message: 'Wszystkie znalezione figurki zostaną odznaczone.',
    cancel: 'Anuluj',
  },
  sheet: {
    close: 'Zamknij',
    closeTitle: 'Zamknij: {{title}}',
  },
  settings: {
    title: 'Ustawienia',
    version: 'Wersja {{version}}',
    appearance: 'Wygląd',
    layout: 'Układ',
    language: 'Język',
    themeSystem: 'Systemowy',
    languageSystem: 'Systemowy',
    light: 'Jasny',
    dark: 'Ciemny',
  },
  catalog: {
    title: 'Katalog',
    version: 'Figurki według stanu na {{date}}',
    check: 'Sprawdź aktualizacje',
    checking: 'Sprawdzanie…',
    current: 'Aktualny',
    updated: 'Zaktualizowano',
    failed: 'Nie udało się zaktualizować. Spróbuj później.',
    looking: 'Szukanie nowych figurek…',
    updating: 'Pobieranie nowych figurek…',
    arrived: 'Nowe figurki już są',
    lookupFailed: 'Nie udało się pobrać nowych figurek. Spróbuj później.',
  },
  lookup: {
    looking: 'Szukanie tej figurki…',
    searching:
      'Kodu {{code}} nie ma jeszcze w katalogu. Szukanie nowych figurek.',
    unknown: 'Nieznana figurka',
    notInCatalog: 'Kodu {{code}} nie ma jeszcze w katalogu.',
    failed: 'Nie udało się wyszukać nowych figurek. Spróbuj później.',
    notABox: 'To nie jest opakowanie minifigurki',
  },
  layouts: {
    card: {
      label: 'Karta odsłony',
      description: 'Duża karta z właśnie zeskanowaną figurką.',
    },
    split: {
      label: 'Podzielona lista',
      description: 'Aparat u góry, cała seria zawsze pod spodem.',
    },
    strip: {
      label: 'Wąski pasek',
      description: 'Pełny obraz z aparatu i mały rząd figurek.',
    },
  },
};

export default pl;

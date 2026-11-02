import type {Translation} from './en';

const it: Translation = {
  permission: {
    message:
      'Mini Figure Revealr ha bisogno dell’accesso alla fotocamera per scansionare il codice sulla scatola.',
    allow: 'Consenti l’accesso alla fotocamera',
    openSettings: 'Apri impostazioni',
  },
  camera: {
    unavailable: 'Nessuna fotocamera disponibile',
    torch: 'Torcia',
  },
  hint: {
    title: 'Scansiona una scatola',
    text: 'Inquadra il codice quadrato più grande sul lato della scatola.',
    short: 'Inquadra il codice quadrato più grande sul lato',
    image:
      'Lato della scatola con il codice quadrato da scansionare evidenziato in verde',
  },
  status: {
    complete: 'Serie completa',
    new: 'Nuova nella tua collezione',
    known: 'Già trovata',
  },
  progress: '{{found}} di {{total}}',
  card: {
    showSeries: 'Mostra tutte le minifigure di questa serie',
  },
  series: {
    fallback: 'Serie',
    summary: '{{found}} di {{total}} trovate · tocca per spuntare',
    close: 'Chiudi serie',
    tapToTick: 'Tocca una minifigure per spuntarla',
    lastScanned: '{{name}}, ultima scansione',
    thumbFound: '{{name}}, trovata. Mostra serie.',
    thumbMissing: '{{name}}, mancante. Mostra serie.',
  },
  reset: {
    button: 'Ricomincia',
    title: 'Ricominciare?',
    message: 'Tutte le minifigure trovate verranno deselezionate.',
    cancel: 'Annulla',
  },
  sheet: {
    close: 'Chiudi',
    closeTitle: 'Chiudi {{title}}',
  },
  settings: {
    title: 'Impostazioni',
    version: 'Versione {{version}}',
    appearance: 'Aspetto',
    layout: 'Layout',
    language: 'Lingua',
    themeSystem: 'Sistema',
    languageSystem: 'Sistema',
    light: 'Chiaro',
    dark: 'Scuro',
    codeOverlay: 'Minifigure sui codici',
    codeOverlayDescription:
      'Mostra l’immagine di ogni minifigure sul codice della sua confezione nella fotocamera.',
  },
  catalog: {
    title: 'Catalogo',
    version: 'Minifigure aggiornate al {{date}}',
    check: 'Cerca aggiornamenti',
    checking: 'Verifica in corso…',
    current: 'Già aggiornato',
    updated: 'Aggiornato',
    failed: 'Aggiornamento non riuscito. Riprova più tardi.',
    looking: 'Ricerca di nuove minifigure…',
    updating: 'Caricamento delle nuove minifigure…',
    arrived: 'Sono arrivate nuove minifigure',
    lookupFailed:
      'Impossibile caricare le nuove minifigure. Riprova più tardi.',
  },
  lookup: {
    looking: 'Ricerca di questa minifigure…',
    searching:
      'Il codice {{code}} non è ancora nel catalogo. Ricerca di nuove minifigure.',
    unknown: 'Minifigure sconosciuta',
    notInCatalog: 'Il codice {{code}} non è ancora nel catalogo.',
    failed: 'Impossibile cercare nuove minifigure. Riprova più tardi.',
    notABox: 'Non è una confezione di minifigure',
  },
  layouts: {
    card: {
      label: 'Scheda rivelazione',
      description: 'Una grande scheda per la minifigure appena scansionata.',
    },
    split: {
      label: 'Lista divisa',
      description: 'Fotocamera in alto, tutta la serie sempre sotto.',
    },
    strip: {
      label: 'Striscia compatta',
      description:
        'Fotocamera a schermo intero con una piccola fila di minifigure.',
    },
  },
};

export default it;

import type {Translation} from './en';

const fr: Translation = {
  permission: {
    message:
      'Mini Figure Revealr a besoin d’accéder à l’appareil photo pour scanner le code sur la boîte.',
    allow: 'Autoriser l’accès à l’appareil photo',
    openSettings: 'Ouvrir les réglages',
  },
  camera: {
    unavailable: 'Aucun appareil photo disponible',
    torch: 'Lampe torche',
  },
  hint: {
    title: 'Scannez une boîte',
    text: 'Pointez l’appareil photo vers le plus grand code carré sur le côté de la boîte.',
    short: 'Visez le plus grand code carré sur le côté',
    image: 'Côté de la boîte, le code carré à scanner est surligné en vert',
  },
  status: {
    complete: 'Série complète',
    new: 'Nouvelle dans votre collection',
    known: 'Déjà trouvée',
  },
  progress: '{{found}} sur {{total}}',
  card: {
    showSeries: 'Affiche toutes les figurines de cette série',
  },
  series: {
    fallback: 'Série',
    summary: '{{found}} sur {{total}} trouvées · touchez pour cocher',
    close: 'Fermer la série',
    tapToTick: 'Touchez une figurine pour la cocher',
    lastScanned: '{{name}}, dernier scan',
    thumbFound: '{{name}}, trouvée. Afficher la série.',
    thumbMissing: '{{name}}, manquante. Afficher la série.',
  },
  reset: {
    button: 'Recommencer',
    title: 'Recommencer ?',
    message: 'Toutes les figurines trouvées seront décochées.',
    cancel: 'Annuler',
  },
  sheet: {
    close: 'Fermer',
    closeTitle: 'Fermer {{title}}',
  },
  settings: {
    title: 'Réglages',
    version: 'Version {{version}}',
    appearance: 'Apparence',
    layout: 'Disposition',
    language: 'Langue',
    themeSystem: 'Système',
    languageSystem: 'Système',
    light: 'Clair',
    dark: 'Sombre',
  },
  catalog: {
    title: 'Catalogue',
    version: 'Figurines au {{date}}',
    check: 'Rechercher des mises à jour',
    checking: 'Vérification…',
    current: 'À jour',
    updated: 'Mis à jour',
    failed: 'Mise à jour impossible. Réessayez plus tard.',
  },
  layouts: {
    card: {
      label: 'Carte de révélation',
      description:
        'Une grande carte pour la figurine que vous venez de scanner.',
    },
    split: {
      label: 'Liste partagée',
      description:
        'L’appareil photo en haut, toute la série toujours en dessous.',
    },
    strip: {
      label: 'Bandeau compact',
      description: 'Plein écran avec une petite rangée de figurines.',
    },
  },
};

export default fr;

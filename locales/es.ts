import type {Translation} from './en';

const es: Translation = {
  permission: {
    message:
      'Mini Figure Revealr necesita acceso a la cámara para escanear el código de la caja.',
    allow: 'Permitir acceso a la cámara',
    openSettings: 'Abrir ajustes',
  },
  camera: {
    unavailable: 'No hay cámara disponible',
    torch: 'Linterna',
  },
  hint: {
    title: 'Escanea una caja',
    text: 'Apunta la cámara al código cuadrado más grande del lateral de la caja.',
    short: 'Apunta al código cuadrado más grande del lateral',
    image:
      'Lateral de la caja con el código cuadrado que hay que escanear resaltado en verde',
  },
  status: {
    complete: 'Serie completa',
    new: 'Nueva en tu colección',
    known: 'Ya la tienes',
  },
  progress: '{{found}} de {{total}}',
  card: {
    showSeries: 'Muestra todas las figuras de esta serie',
  },
  series: {
    fallback: 'Serie',
    summary: '{{found}} de {{total}} encontradas · toca para marcar',
    close: 'Cerrar serie',
    tapToTick: 'Toca una figura para marcarla',
    lastScanned: '{{name}}, último escaneo',
    thumbFound: '{{name}}, encontrada. Mostrar serie.',
    thumbMissing: '{{name}}, falta. Mostrar serie.',
  },
  reset: {
    button: 'Empezar de nuevo',
    title: '¿Empezar de nuevo?',
    message: 'Se desmarcarán todas las figuras encontradas.',
    cancel: 'Cancelar',
  },
  sheet: {
    close: 'Cerrar',
    closeTitle: 'Cerrar {{title}}',
  },
  settings: {
    title: 'Ajustes',
    version: 'Versión {{version}}',
    appearance: 'Apariencia',
    layout: 'Diseño',
    language: 'Idioma',
    themeSystem: 'Sistema',
    languageSystem: 'Sistema',
    light: 'Claro',
    dark: 'Oscuro',
    codeOverlay: 'Figuras sobre los códigos',
    codeOverlayDescription:
      'Muestra la imagen de cada figura sobre el código de su caja en la cámara.',
  },
  catalog: {
    title: 'Catálogo',
    version: 'Figuras a fecha de {{date}}',
    check: 'Buscar actualizaciones',
    checking: 'Comprobando…',
    current: 'Está al día',
    updated: 'Actualizado',
    failed: 'No se pudo actualizar. Inténtalo más tarde.',
    looking: 'Buscando figuras nuevas…',
    updating: 'Cargando figuras nuevas…',
    arrived: 'Ya hay figuras nuevas',
    lookupFailed:
      'No se pudieron cargar las figuras nuevas. Inténtalo más tarde.',
  },
  lookup: {
    looking: 'Buscando esta figura…',
    searching:
      'El código {{code}} aún no está en el catálogo. Buscando figuras nuevas.',
    unknown: 'Figura desconocida',
    notInCatalog: 'El código {{code}} aún no está en el catálogo.',
    failed: 'No se pudieron buscar figuras nuevas. Inténtalo más tarde.',
    notABox: 'No es una caja de minifigura',
  },
  layouts: {
    card: {
      label: 'Tarjeta de revelación',
      description: 'Una tarjeta grande para la figura que acabas de escanear.',
    },
    split: {
      label: 'Lista dividida',
      description: 'Cámara arriba y toda la serie siempre debajo.',
    },
    strip: {
      label: 'Tira compacta',
      description: 'Cámara completa con una pequeña fila de figuras.',
    },
  },
};

export default es;

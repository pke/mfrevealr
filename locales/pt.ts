import type {Translation} from './en';

// Brazilian Portuguese.
const pt: Translation = {
  permission: {
    message:
      'O Mini Figure Revealr precisa de acesso à câmera para escanear o código da caixa.',
    allow: 'Permitir acesso à câmera',
    openSettings: 'Abrir ajustes',
  },
  camera: {
    unavailable: 'Nenhuma câmera disponível',
    torch: 'Lanterna',
  },
  hint: {
    title: 'Escaneie uma caixa',
    text: 'Aponte a câmera para o código quadrado maior na lateral da caixa.',
    short: 'Aponte para o código quadrado maior na lateral',
    image:
      'Lateral da caixa com o código quadrado a escanear destacado em verde',
  },
  status: {
    complete: 'Série completa',
    new: 'Nova na sua coleção',
    known: 'Já encontrada',
  },
  progress: '{{found}} de {{total}}',
  card: {
    showSeries: 'Mostra todas as figuras desta série',
  },
  series: {
    fallback: 'Série',
    summary: '{{found}} de {{total}} encontradas · toque para marcar',
    close: 'Fechar série',
    tapToTick: 'Toque em uma figura para marcá-la',
    lastScanned: '{{name}}, último escaneamento',
    thumbFound: '{{name}}, encontrada. Mostrar série.',
    thumbMissing: '{{name}}, faltando. Mostrar série.',
  },
  reset: {
    button: 'Recomeçar',
    title: 'Recomeçar?',
    message: 'Todas as figuras encontradas serão desmarcadas.',
    cancel: 'Cancelar',
  },
  sheet: {
    close: 'Fechar',
    closeTitle: 'Fechar {{title}}',
  },
  settings: {
    title: 'Ajustes',
    version: 'Versão {{version}}',
    appearance: 'Aparência',
    layout: 'Layout',
    language: 'Idioma',
    themeSystem: 'Sistema',
    languageSystem: 'Sistema',
    light: 'Claro',
    dark: 'Escuro',
    codeOverlay: 'Figuras nos códigos',
    codeOverlayDescription:
      'Mostra a imagem de cada figura sobre o código da embalagem na câmera.',
  },
  catalog: {
    title: 'Catálogo',
    version: 'Figuras atualizadas em {{date}}',
    check: 'Verificar atualizações',
    checking: 'Verificando…',
    current: 'Já está atualizado',
    updated: 'Atualizado',
    failed: 'Não foi possível atualizar. Tente mais tarde.',
    looking: 'Procurando figuras novas…',
    updating: 'Carregando figuras novas…',
    arrived: 'Chegaram figuras novas',
    lookupFailed:
      'Não foi possível carregar as figuras novas. Tente mais tarde.',
  },
  lookup: {
    looking: 'Procurando esta figura…',
    searching:
      'O código {{code}} ainda não está no catálogo. Procurando figuras novas.',
    unknown: 'Figura desconhecida',
    notInCatalog: 'O código {{code}} ainda não está no catálogo.',
    failed: 'Não foi possível procurar figuras novas. Tente mais tarde.',
    notABox: 'Não é uma embalagem de minifigura',
  },
  layouts: {
    card: {
      label: 'Cartão de revelação',
      description:
        'Um cartão grande para a figura que você acabou de escanear.',
    },
    split: {
      label: 'Lista dividida',
      description: 'Câmera em cima e a série inteira sempre embaixo.',
    },
    strip: {
      label: 'Faixa compacta',
      description: 'Câmera em tela cheia com uma pequena fileira de figuras.',
    },
  },
};

export default pt;

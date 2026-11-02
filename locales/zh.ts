import type {Translation} from './en';

// Simplified Chinese.
const zh: Translation = {
  permission: {
    message: 'Mini Figure Revealr 需要访问相机才能扫描包装盒上的代码。',
    allow: '允许访问相机',
    openSettings: '打开设置',
  },
  camera: {
    unavailable: '没有可用的相机',
    torch: '手电筒',
  },
  hint: {
    title: '扫描包装盒',
    text: '将相机对准包装盒侧面较大的方形码。',
    short: '对准侧面较大的方形码',
    image: '包装盒侧面，需要扫描的方形码以绿色标出',
  },
  status: {
    complete: '系列已集齐',
    new: '收藏新成员',
    known: '已找到',
  },
  progress: '{{found}} / {{total}}',
  card: {
    showSeries: '显示该系列的所有人仔',
  },
  series: {
    fallback: '系列',
    summary: '已找到 {{found}} / {{total}} · 点按即可勾选',
    close: '关闭系列',
    tapToTick: '点按人仔即可勾选',
    lastScanned: '{{name}}，最近扫描',
    thumbFound: '{{name}}，已找到。显示系列。',
    thumbMissing: '{{name}}，未找到。显示系列。',
  },
  reset: {
    button: '重新开始',
    title: '重新开始？',
    message: '所有已找到的人仔都将取消勾选。',
    cancel: '取消',
  },
  sheet: {
    close: '关闭',
    closeTitle: '关闭{{title}}',
  },
  settings: {
    title: '设置',
    version: '版本 {{version}}',
    appearance: '外观',
    layout: '布局',
    language: '语言',
    themeSystem: '跟随系统',
    languageSystem: '跟随系统',
    light: '浅色',
    dark: '深色',
  },
  catalog: {
    title: '目录',
    version: '人仔数据更新于 {{date}}',
    check: '检查更新',
    checking: '正在检查…',
    current: '已是最新',
    updated: '已更新',
    failed: '更新失败，请稍后再试。',
    looking: '正在查找新人仔…',
    updating: '正在加载新人仔…',
    arrived: '新人仔已到',
    lookupFailed: '无法加载新人仔，请稍后再试。',
  },
  lookup: {
    looking: '正在查找这个人仔…',
    searching: '目录中还没有代码 {{code}}，正在查找新人仔。',
    unknown: '未知人仔',
    notInCatalog: '目录中还没有代码 {{code}}。',
    failed: '无法查找新人仔，请稍后再试。',
    notABox: '这不是人仔包装',
  },
  layouts: {
    card: {
      label: '揭晓卡片',
      description: '用大卡片展示刚扫描的人仔。',
    },
    split: {
      label: '分屏清单',
      description: '相机在上，整个系列始终在下方。',
    },
    strip: {
      label: '精简条',
      description: '全屏相机，下方是一小排人仔。',
    },
  },
};

export default zh;

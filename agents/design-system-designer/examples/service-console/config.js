/* The only editable business data, design defaults and demo timing. */
(function (root) {
  const config = {
    brand: { name: '小店预约台', tagline: '把每一次到店安排好', mark: '小' },
    defaults: { theme: 'light', density: 'comfortable' },
    options: { themes: [{ value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }], densities: [{ value: 'comfortable', label: '舒适' }, { value: 'compact', label: '紧凑' }], fontSizes: [{ value: 15, label: '标准' }, { value: 18, label: '大字' }] },
    timeSlots: ['14:00 — 14:30', '14:30 — 15:00', '15:00 — 15:30'],
    services: ['手作体验', '产品咨询', '作品领取'],
    appointments: [
      { name: '示例用户 A', email: 'demo-a@example.test', service: '手作体验', slot: '14:00 — 14:30', state: '待到店' },
      { name: '示例用户 B', email: 'demo-b@example.test', service: '产品咨询 · Product introduction and first visit', slot: '14:30 — 15:00', state: '待到店' },
      { name: '示例用户 C', email: 'demo-c@example.test', service: '作品领取', slot: '15:00 — 15:30', state: '已到店' }
    ],
    simulationDelayMs: 550,
    tokens: {
    schemaVersion: 1, exampleData: true,
    palette: { action: '#176b50', actionText: '#ffffff', paper: '#f4f4ef', surface: '#ffffff', ink: '#22342d',
      muted: '#53665c', border: '#cdd7ce', night: '#15231d', nightSurface: '#1d3026', nightInk: '#ecf2e9', nightMuted: '#b4c5b7', nightBorder: '#52695b', error: '#9c331a', nightError: '#ffb19e' },
    themes: {
      light: { action: '{palette.action}', actionText: '{palette.actionText}', background: '{palette.paper}', surface: '{palette.surface}', text: '{palette.ink}', muted: '{palette.muted}', border: '{palette.border}', error: '{palette.error}' },
      dark: { action: '{palette.action}', actionText: '{palette.actionText}', background: '{palette.night}', surface: '{palette.nightSurface}', text: '{palette.nightInk}', muted: '{palette.nightMuted}', border: '{palette.nightBorder}', error: '{palette.nightError}' }
    },
    spacing: { comfortable: 16, compact: 10 }, typography: { bodySize: 15 }, radius: 10,
    components: { button: ['idle','loading','success','error','disabled'], input: ['idle','focus','invalid','disabled'] }
  }
  };
  if (typeof module === 'object' && module.exports) module.exports = config;
  else root.KimServiceConsoleConfig = config;
})(typeof globalThis === 'object' ? globalThis : this);

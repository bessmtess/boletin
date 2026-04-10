/**
 * BESS 2025 Dashboard - Utilities
 */

const CAJA_COLORS = {
  'IPS': '#2563EB',
  'Fiscal': '#7C3AED',
  'Ande': '#F59E0B',
  'Bancaria': '#10B981',
  'Cajubi': '#EF4444',
  'Ferroviaria': '#6B7280',
  'Municipal': '#EC4899'
};

const CAJA_ORDER = ['IPS', 'Fiscal', 'Ande', 'Bancaria', 'Cajubi', 'Ferroviaria', 'Municipal'];

const BENEFIT_COLORS = {
  'Vejez': '#2563EB',
  'Invalidez': '#F59E0B',
  'Pensión/Sobrevivencia': '#10B981',
  'Otros': '#6B7280'
};

const AGE_ORDER = [
  '0 a 4', '5 a 9', '10 a 14', '15 a 19', '20 a 24', '25 a 29',
  '30 a 34', '35 a 39', '40 a 44', '45 a 49', '50 a 54', '55 a 59',
  '60 a 64', '65 a 69', '70 a 74', '75 a 79', '80 a 84', '85 y más'
];

function formatNumber(n) {
  if (n == null || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('es-PY');
}

function formatGs(n) {
  if (n == null || isNaN(n)) return 'Gs. 0';
  if (Math.abs(n) >= 1e12) return 'Gs. ' + (n / 1e12).toFixed(2) + ' bill.';
  if (Math.abs(n) >= 1e9) return 'Gs. ' + (n / 1e9).toFixed(1) + ' mil mill.';
  if (Math.abs(n) >= 1e6) return 'Gs. ' + (n / 1e6).toFixed(1) + ' mill.';
  return 'Gs. ' + formatNumber(n);
}

function formatGsShort(n) {
  if (n == null || isNaN(n)) return '0';
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'MM';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return formatNumber(n);
}

function formatPct(n) {
  if (n == null || isNaN(n)) return '0%';
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function isDark() {
  return document.documentElement.classList.contains('dark');
}

function plotlyLayout(overrides = {}) {
  const dark = isDark();
  const base = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: dark ? '#CBD5E1' : '#334155',
      size: 12
    },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    xaxis: {
      gridcolor: dark ? '#334155' : '#E2E8F0',
      zerolinecolor: dark ? '#475569' : '#CBD5E1'
    },
    yaxis: {
      gridcolor: dark ? '#334155' : '#E2E8F0',
      zerolinecolor: dark ? '#475569' : '#CBD5E1'
    },
    hoverlabel: {
      bgcolor: dark ? '#1E293B' : '#FFFFFF',
      font: { family: 'Inter, system-ui, sans-serif', size: 13 }
    },
    legend: {
      bgcolor: 'rgba(0,0,0,0)',
      font: { size: 11 }
    },
    separators: ',.'
  };
  return deepMerge(base, overrides);
}

function plotlyConfig() {
  return {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    displaylogo: false,
    locale: 'es',
    toImageButtonOptions: { format: 'png', filename: 'bess2025_chart', scale: 2 }
  };
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function animateCountUp(el, endVal, duration = 2000) {
  const start = 0;
  const startTime = performance.now();
  const isDecimal = endVal % 1 !== 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (endVal - start) * eased;
    el.textContent = isDecimal ? current.toFixed(2) : formatNumber(Math.round(current));
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function ratioColor(ratio) {
  if (ratio >= 3) return '#10B981';
  if (ratio >= 2) return '#F59E0B';
  return '#EF4444';
}

function ratioLabel(ratio) {
  if (ratio >= 3) return 'Sostenible';
  if (ratio >= 2) return 'En riesgo';
  return 'Crítico';
}

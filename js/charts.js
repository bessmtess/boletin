/**
 * BESS 2025 Dashboard - Chart Rendering Functions
 */

// ============================================
// SECTION: PANORAMA GENERAL
// ============================================
function renderPanorama(data, year) {
  renderPanoramaEvolution(data);
  renderActivosPorCaja(data, year);
  renderPasivosPorCaja(data, year);
  renderDistribucionCaja(data, year);
  renderDonutBeneficios(data, year);
}

function renderPanoramaEvolution(data) {
  const serie = data.serie_temporal;
  const years = [2020, 2021, 2022, 2023, 2024];

  const actByYear = years.map(y => serie.filter(r => r.ano === y && r.estado === 'Activos').reduce((s, r) => s + r.cantidad, 0));
  const pasByYear = years.map(y => serie.filter(r => r.ano === y && r.estado === 'Pasivos').reduce((s, r) => s + r.cantidad, 0));

  const traces = [
    { x: years, y: actByYear, name: 'Activos', type: 'scatter', mode: 'lines+markers', fill: 'tozeroy',
      line: { color: '#2563EB', width: 3, shape: 'spline' }, marker: { size: 8 }, fillcolor: 'rgba(37,99,235,0.1)',
      hovertemplate: '<b>%{x}</b><br>Activos: %{y:,.0f}<extra></extra>' },
    { x: years, y: pasByYear, name: 'Pasivos', type: 'scatter', mode: 'lines+markers', fill: 'tozeroy',
      line: { color: '#F59E0B', width: 3, shape: 'spline' }, marker: { size: 8 }, fillcolor: 'rgba(245,158,11,0.1)',
      hovertemplate: '<b>%{x}</b><br>Pasivos: %{y:,.0f}<extra></extra>' }
  ];

  Plotly.newPlot('chart-evolution', traces, plotlyLayout({
    title: { text: 'Evolución del Sistema Previsional', font: { size: 16 } },
    xaxis: { dtick: 1 },
    yaxis: { title: 'Cantidad de personas' },
    legend: { orientation: 'h', y: -0.15 }
  }), plotlyConfig());
}

function renderActivosPorCaja(data, year) {
  const serie = data.serie_temporal;
  const years = [2020, 2021, 2022, 2023, 2024];
  const cajas = CAJA_ORDER;

  const traces = years.map((y, i) => ({
    x: cajas, type: 'bar', name: String(y),
    y: cajas.map(c => {
      const r = serie.find(r => r.ano === y && r.caja === c && r.estado === 'Activos');
      return r ? r.cantidad : 0;
    }),
    marker: { color: `rgba(37,99,235,${0.3 + i * 0.15})`, cornerradius: 4 },
    hovertemplate: '<b>%{x}</b><br>Activos %{data.name}: %{y:,.0f}<extra></extra>'
  }));

  Plotly.newPlot('chart-activos-caja', traces, plotlyLayout({
    title: { text: 'Cotizantes Activos por Caja', font: { size: 16 } },
    barmode: 'group', yaxis: { title: 'Cantidad' },
    legend: { orientation: 'h', y: -0.2 }
  }), plotlyConfig());
}

function renderPasivosPorCaja(data, year) {
  const serie = data.serie_temporal;
  const years = [2020, 2021, 2022, 2023, 2024];
  const cajas = CAJA_ORDER;

  const traces = years.map((y, i) => ({
    x: cajas, type: 'bar', name: String(y),
    y: cajas.map(c => {
      const r = serie.find(r => r.ano === y && r.caja === c && r.estado === 'Pasivos');
      return r ? r.cantidad : 0;
    }),
    marker: { color: `rgba(245,158,11,${0.3 + i * 0.15})`, cornerradius: 4 },
    hovertemplate: '<b>%{x}</b><br>Pasivos %{data.name}: %{y:,.0f}<extra></extra>'
  }));

  Plotly.newPlot('chart-pasivos-caja', traces, plotlyLayout({
    title: { text: 'Beneficiarios Pasivos por Caja', font: { size: 16 } },
    barmode: 'group', yaxis: { title: 'Cantidad' },
    legend: { orientation: 'h', y: -0.2 }
  }), plotlyConfig());
}

function renderDistribucionCaja(data, year) {
  const serie = data.serie_temporal;
  const cajas = CAJA_ORDER;
  const vals = cajas.map(c => {
    const r = serie.find(r => r.ano === year && r.caja === c && r.estado === 'Activos');
    return r ? r.cantidad : 0;
  });
  const total = vals.reduce((s, v) => s + v, 0);
  const pcts = vals.map(v => total > 0 ? (v / total * 100) : 0);

  Plotly.newPlot('chart-dist-caja', [{
    type: 'bar', orientation: 'h',
    y: cajas, x: pcts,
    marker: { color: cajas.map(c => CAJA_COLORS[c]), cornerradius: 4 },
    text: vals.map((v, i) => `${pcts[i].toFixed(1)}% (${formatNumber(v)})`),
    textposition: 'outside', textfont: { size: 12 },
    hovertemplate: '<b>%{y}</b><br>%{x:.1f}% del total<extra></extra>'
  }], plotlyLayout({
    title: { text: `Distribución de Activos por Caja (${year})`, font: { size: 16 } },
    xaxis: { title: '% del total', range: [0, 100] },
    yaxis: { autorange: 'reversed' },
    margin: { l: 100, r: 120 }
  }), plotlyConfig());
}

function renderDonutBeneficios(data, year) {
  const ben = data.beneficios_pasivos.filter(r => r.ano === year);
  const tipos = ['Vejez', 'Invalidez', 'Pensión/Sobrevivencia', 'Otros'];
  const vals = tipos.map(t => ben.filter(r => r.tipo_beneficio === t).reduce((s, r) => s + r.cantidad, 0));

  Plotly.newPlot('chart-donut-ben', [{
    type: 'pie', hole: 0.55,
    labels: tipos, values: vals,
    marker: { colors: tipos.map(t => BENEFIT_COLORS[t]) },
    textinfo: 'label+percent', textfont: { size: 12 },
    hovertemplate: '<b>%{label}</b><br>%{value:,.0f} personas<br>%{percent}<extra></extra>'
  }], plotlyLayout({
    title: { text: `Composición de Pasivos por Tipo (${year})`, font: { size: 16 } },
    showlegend: false,
    margin: { t: 50, b: 20 },
    annotations: [{ text: formatNumber(vals.reduce((s, v) => s + v, 0)), x: 0.5, y: 0.5, font: { size: 20, color: isDark() ? '#E2E8F0' : '#1E293B', family: 'Inter' }, showarrow: false }]
  }), plotlyConfig());
}

// ============================================
// SECTION: PIRAMIDES POBLACIONALES
// ============================================
function renderPiramides(data, year, caja) {
  renderPyramid(data, year, caja, 'Activos', 'chart-pyramid-activos');
  renderPyramid(data, year, caja, 'Pasivos', 'chart-pyramid-pasivos');
  renderMiniPyramids(data, year);
}

function renderPyramid(data, year, caja, estado, divId) {
  const pir = data.piramide_data.filter(r =>
    r.ano === year && r.estado === estado &&
    (caja === 'Todas' ? true : r.caja === caja)
  );

  const ages = AGE_ORDER;
  const hombres = ages.map(a => -pir.filter(r => r.edad_quinquenal === a && r.sexo === 'Hombres').reduce((s, r) => s + r.cantidad, 0));
  const mujeres = ages.map(a => pir.filter(r => r.edad_quinquenal === a && r.sexo === 'Mujeres').reduce((s, r) => s + r.cantidad, 0));

  const maxVal = Math.max(Math.max(...mujeres), Math.max(...hombres.map(Math.abs)));

  Plotly.newPlot(divId, [
    { type: 'bar', orientation: 'h', y: ages, x: hombres, name: 'Hombres',
      marker: { color: '#3B82F6' },
      hovertemplate: '<b>%{y}</b><br>Hombres: %{customdata:,.0f}<extra></extra>',
      customdata: hombres.map(v => Math.abs(v)) },
    { type: 'bar', orientation: 'h', y: ages, x: mujeres, name: 'Mujeres',
      marker: { color: '#EC4899' },
      hovertemplate: '<b>%{y}</b><br>Mujeres: %{x:,.0f}<extra></extra>' }
  ], plotlyLayout({
    title: { text: `Pirámide ${estado} - ${caja === 'Todas' ? 'Todas las Cajas' : caja} (${year})`, font: { size: 15 } },
    barmode: 'overlay', bargap: 0.1,
    xaxis: {
      title: 'Cantidad de personas',
      range: [-maxVal * 1.15, maxVal * 1.15],
      tickvals: [-maxVal, -maxVal / 2, 0, maxVal / 2, maxVal],
      ticktext: [formatNumber(maxVal), formatNumber(maxVal / 2), '0', formatNumber(maxVal / 2), formatNumber(maxVal)]
    },
    legend: { orientation: 'h', y: -0.15 },
    margin: { l: 80 }
  }), plotlyConfig());
}

function renderMiniPyramids(data, year) {
  CAJA_ORDER.forEach(caja => {
    const divId = `mini-pyr-${caja}`;
    const el = document.getElementById(divId);
    if (!el) return;

    const pir = data.piramide_data.filter(r => r.ano === year && r.caja === caja);
    const ages = AGE_ORDER;
    const hAct = ages.map(a => -pir.filter(r => r.edad_quinquenal === a && r.sexo === 'Hombres' && r.estado === 'Activos').reduce((s, r) => s + r.cantidad, 0));
    const mAct = ages.map(a => pir.filter(r => r.edad_quinquenal === a && r.sexo === 'Mujeres' && r.estado === 'Activos').reduce((s, r) => s + r.cantidad, 0));

    Plotly.newPlot(divId, [
      { type: 'bar', orientation: 'h', y: ages, x: hAct, marker: { color: '#3B82F6' }, showlegend: false, hoverinfo: 'skip' },
      { type: 'bar', orientation: 'h', y: ages, x: mAct, marker: { color: '#EC4899' }, showlegend: false, hoverinfo: 'skip' }
    ], plotlyLayout({
      title: { text: caja, font: { size: 13 } },
      barmode: 'overlay', bargap: 0.05,
      xaxis: { showticklabels: false, showgrid: false },
      yaxis: { showticklabels: false },
      margin: { t: 30, r: 5, b: 5, l: 5 },
      height: 200
    }), { ...plotlyConfig(), displayModeBar: false });
  });
}

// ============================================
// SECTION: ANALISIS POR CAJA
// ============================================
function renderCajaDeepDive(data, caja, year) {
  renderCajaEvolution(data, caja);
  renderCajaBeneficiosStack(data, caja);
  renderCajaSalarioPromedio(data, caja);
  renderCajaHeatmap(data, caja, year);
}

function renderCajaEvolution(data, caja) {
  const serie = data.serie_temporal.filter(r => r.caja === caja);
  const years = [2020, 2021, 2022, 2023, 2024];
  const act = years.map(y => { const r = serie.find(r => r.ano === y && r.estado === 'Activos'); return r ? r.cantidad : 0; });
  const pas = years.map(y => { const r = serie.find(r => r.ano === y && r.estado === 'Pasivos'); return r ? r.cantidad : 0; });
  const ratio = years.map((_, i) => pas[i] > 0 ? +(act[i] / pas[i]).toFixed(2) : 0);

  Plotly.newPlot('chart-caja-evo', [
    { x: years, y: act, name: 'Activos', type: 'bar', marker: { color: '#2563EB', cornerradius: 4 }, yaxis: 'y',
      hovertemplate: 'Activos: %{y:,.0f}<extra></extra>' },
    { x: years, y: pas, name: 'Pasivos', type: 'bar', marker: { color: '#F59E0B', cornerradius: 4 }, yaxis: 'y',
      hovertemplate: 'Pasivos: %{y:,.0f}<extra></extra>' },
    { x: years, y: ratio, name: 'Ratio A/P', type: 'scatter', mode: 'lines+markers',
      line: { color: '#EF4444', width: 3 }, marker: { size: 10, symbol: 'diamond' },
      yaxis: 'y2', hovertemplate: 'Ratio: %{y:.2f}<extra></extra>' }
  ], plotlyLayout({
    title: { text: `Evolución ${caja}`, font: { size: 16 } },
    barmode: 'group', xaxis: { dtick: 1 },
    yaxis: { title: 'Cantidad', side: 'left' },
    yaxis2: { title: 'Ratio A/P', overlaying: 'y', side: 'right', showgrid: false, rangemode: 'tozero' },
    legend: { orientation: 'h', y: -0.2 }
  }), plotlyConfig());
}

function renderCajaBeneficiosStack(data, caja) {
  const ben = data.beneficios_pasivos.filter(r => r.caja === caja);
  const years = [2020, 2021, 2022, 2023, 2024];
  const tipos = ['Vejez', 'Invalidez', 'Pensión/Sobrevivencia', 'Otros'];

  const traces = tipos.map(t => ({
    x: years, type: 'bar', name: t,
    y: years.map(y => { const r = ben.find(r => r.ano === y && r.tipo_beneficio === t); return r ? r.cantidad : 0; }),
    marker: { color: BENEFIT_COLORS[t], cornerradius: 4 },
    hovertemplate: `<b>${t}</b><br>%{y:,.0f} personas<extra></extra>`
  }));

  Plotly.newPlot('chart-caja-ben', traces, plotlyLayout({
    title: { text: `Pasivos por Tipo de Prestación - ${caja}`, font: { size: 16 } },
    barmode: 'stack', xaxis: { dtick: 1 },
    yaxis: { title: 'Cantidad' },
    legend: { orientation: 'h', y: -0.2 }
  }), plotlyConfig());
}

function renderCajaSalarioPromedio(data, caja) {
  const serie = data.serie_temporal.filter(r => r.caja === caja);
  const years = [2020, 2021, 2022, 2023, 2024];
  const smls = [2192839, 2289324, 2550307, 2680373, 2798309];
  const salAct = years.map(y => { const r = serie.find(r => r.ano === y && r.estado === 'Activos'); return r ? r.salario_promedio : 0; });
  const salPas = years.map(y => { const r = serie.find(r => r.ano === y && r.estado === 'Pasivos'); return r ? r.salario_promedio : 0; });

  Plotly.newPlot('chart-caja-sal', [
    { x: years, y: salAct, name: 'Salario Prom. Activos', type: 'scatter', mode: 'lines+markers',
      line: { color: '#2563EB', width: 3 }, marker: { size: 8 },
      hovertemplate: 'Activos: Gs. %{y:,.0f}<extra></extra>' },
    { x: years, y: salPas, name: 'Beneficio Prom. Pasivos', type: 'scatter', mode: 'lines+markers',
      line: { color: '#F59E0B', width: 3 }, marker: { size: 8 },
      hovertemplate: 'Pasivos: Gs. %{y:,.0f}<extra></extra>' },
    { x: years, y: smls, name: 'SML', type: 'scatter', mode: 'lines',
      line: { color: '#94A3B8', width: 2, dash: 'dash' },
      hovertemplate: 'SML: Gs. %{y:,.0f}<extra></extra>' }
  ], plotlyLayout({
    title: { text: `Salario/Beneficio Promedio - ${caja}`, font: { size: 16 } },
    xaxis: { dtick: 1 }, yaxis: { title: 'Guaraníes' },
    legend: { orientation: 'h', y: -0.2 }
  }), plotlyConfig());
}

function renderCajaHeatmap(data, caja, year) {
  const sal = data.salarios_edad.filter(r => r.caja === caja && r.ano === year && r.estado === 'Activos');
  const ages = AGE_ORDER.filter(a => sal.some(r => r.edad_quinquenal === a));
  const vals = ages.map(a => { const r = sal.find(r => r.edad_quinquenal === a); return r ? r.cantidad : 0; });

  Plotly.newPlot('chart-caja-heat', [{
    type: 'bar', x: ages, y: vals,
    marker: {
      color: vals,
      colorscale: [[0, '#DBEAFE'], [0.5, '#3B82F6'], [1, '#1E3A8A']],
      cornerradius: 4
    },
    hovertemplate: '<b>%{x}</b><br>%{y:,.0f} personas<extra></extra>'
  }], plotlyLayout({
    title: { text: `Distribución por Edad - Activos ${caja} (${year})`, font: { size: 16 } },
    xaxis: { title: 'Grupo de edad', tickangle: -45 },
    yaxis: { title: 'Cantidad' },
    margin: { b: 80 }
  }), plotlyConfig());
}

// ============================================
// SECTION: COMPARATIVO
// ============================================
function renderComparativo(data, year) {
  renderRadar(data, year);
  renderBubble(data, year);
  renderGrowthBars(data);
}

function renderRadar(data, year) {
  const kpis = data.kpis.por_caja;
  const cajas = CAJA_ORDER.filter(c => kpis[c]?.[year]);

  const metrics = ['activos', 'pasivos', 'ratio', 'salario_promedio_activos'];
  const labels = ['Activos', 'Pasivos', 'Ratio A/P', 'Salario Promedio'];

  // Normalize to 0-100
  const maxVals = metrics.map(m => Math.max(...cajas.map(c => kpis[c]?.[year]?.[m] || 0)));

  const traces = cajas.map(c => {
    const vals = metrics.map((m, i) => maxVals[i] > 0 ? ((kpis[c]?.[year]?.[m] || 0) / maxVals[i] * 100) : 0);
    return {
      type: 'scatterpolar', name: c,
      r: [...vals, vals[0]], theta: [...labels, labels[0]],
      fill: 'toself', fillcolor: CAJA_COLORS[c] + '20',
      line: { color: CAJA_COLORS[c], width: 2 },
      hovertemplate: `<b>${c}</b><br>%{theta}: %{r:.0f}%<extra></extra>`
    };
  });

  Plotly.newPlot('chart-radar', traces, plotlyLayout({
    title: { text: `Perfil Comparativo (${year})`, font: { size: 16 } },
    polar: {
      radialaxis: { visible: true, range: [0, 110], showticklabels: false },
      bgcolor: 'rgba(0,0,0,0)',
      angularaxis: { gridcolor: isDark() ? '#334155' : '#E2E8F0' }
    },
    legend: { orientation: 'h', y: -0.1 }
  }), plotlyConfig());
}

function renderBubble(data, year) {
  const kpis = data.kpis.por_caja;
  const cajas = CAJA_ORDER.filter(c => kpis[c]?.[year]);

  Plotly.newPlot('chart-bubble', [{
    type: 'scatter', mode: 'markers+text',
    x: cajas.map(c => kpis[c][year].ratio),
    y: cajas.map(c => kpis[c][year].salario_promedio_activos || 0),
    marker: {
      size: cajas.map(c => Math.max(15, Math.sqrt(kpis[c][year].activos) / 5)),
      color: cajas.map(c => CAJA_COLORS[c]),
      line: { width: 2, color: 'white' }, opacity: 0.85
    },
    text: cajas, textposition: 'top center', textfont: { size: 11 },
    hovertemplate: '<b>%{text}</b><br>Ratio: %{x:.2f}<br>Salario Prom: Gs. %{y:,.0f}<br>Activos: %{customdata:,.0f}<extra></extra>',
    customdata: cajas.map(c => kpis[c][year].activos)
  }], plotlyLayout({
    title: { text: `Ratio vs. Salario Promedio (${year})`, font: { size: 16 } },
    xaxis: { title: 'Ratio Activos/Pasivos', rangemode: 'tozero' },
    yaxis: { title: 'Salario Promedio (Gs.)' },
    showlegend: false
  }), plotlyConfig());
}

function renderGrowthBars(data) {
  const kpis = data.kpis.por_caja;
  const cajas = CAJA_ORDER.filter(c => kpis[c]?.['2020'] && kpis[c]?.['2024']);

  const growthAct = cajas.map(c => {
    const v0 = kpis[c]['2020']?.activos || 0;
    const v1 = kpis[c]['2024']?.activos || 0;
    return v0 > 0 ? ((v1 - v0) / v0 * 100) : 0;
  });
  const growthPas = cajas.map(c => {
    const v0 = kpis[c]['2020']?.pasivos || 0;
    const v1 = kpis[c]['2024']?.pasivos || 0;
    return v0 > 0 ? ((v1 - v0) / v0 * 100) : 0;
  });

  Plotly.newPlot('chart-growth', [
    { x: cajas, y: growthAct, name: 'Crecimiento Activos', type: 'bar',
      marker: { color: '#2563EB', cornerradius: 4 },
      hovertemplate: '<b>%{x}</b><br>Activos: %{y:+.1f}%<extra></extra>' },
    { x: cajas, y: growthPas, name: 'Crecimiento Pasivos', type: 'bar',
      marker: { color: '#F59E0B', cornerradius: 4 },
      hovertemplate: '<b>%{x}</b><br>Pasivos: %{y:+.1f}%<extra></extra>' }
  ], plotlyLayout({
    title: { text: 'Crecimiento % (2020-2024)', font: { size: 16 } },
    barmode: 'group',
    yaxis: { title: '% de cambio', zeroline: true, zerolinewidth: 2 },
    legend: { orientation: 'h', y: -0.2 }
  }), plotlyConfig());
}

// ============================================
// SECTION: SOSTENIBILIDAD
// ============================================
function renderSostenibilidad(data, year) {
  renderRatioTrend(data);
  renderRatioBars(data, year);
  renderProjection(data);
}

function renderRatioTrend(data) {
  const kpis = data.kpis.por_caja;
  const years = [2020, 2021, 2022, 2023, 2024];
  const cajas = CAJA_ORDER;

  const traces = cajas.map(c => ({
    x: years, name: c, type: 'scatter', mode: 'lines+markers',
    y: years.map(y => kpis[c]?.[y]?.ratio || 0),
    line: { color: CAJA_COLORS[c], width: 2.5 }, marker: { size: 6 },
    hovertemplate: `<b>${c}</b><br>%{x}: %{y:.2f}<extra></extra>`
  }));

  // Threshold lines
  traces.push({
    x: [2020, 2024], y: [3, 3], name: 'Umbral sostenible', mode: 'lines',
    line: { color: '#F59E0B', dash: 'dash', width: 1.5 }, showlegend: true, hoverinfo: 'skip'
  });
  traces.push({
    x: [2020, 2024], y: [2, 2], name: 'Umbral crítico', mode: 'lines',
    line: { color: '#EF4444', dash: 'dash', width: 1.5 }, showlegend: true, hoverinfo: 'skip'
  });

  Plotly.newPlot('chart-ratio-trend', traces, plotlyLayout({
    title: { text: 'Evolución del Ratio Activos/Pasivos', font: { size: 16 } },
    xaxis: { dtick: 1 }, yaxis: { title: 'Ratio A/P', rangemode: 'tozero' },
    legend: { orientation: 'h', y: -0.2, font: { size: 10 } }
  }), plotlyConfig());
}

function renderRatioBars(data, year) {
  const kpis = data.kpis.por_caja;
  const cajas = CAJA_ORDER;
  const ratios = cajas.map(c => kpis[c]?.[year]?.ratio || 0);

  Plotly.newPlot('chart-ratio-bars', [{
    type: 'bar', x: cajas, y: ratios,
    marker: { color: ratios.map(r => ratioColor(r)), cornerradius: 6 },
    text: ratios.map(r => r.toFixed(2)),
    textposition: 'outside', textfont: { size: 13, color: isDark() ? '#E2E8F0' : '#334155' },
    hovertemplate: '<b>%{x}</b><br>Ratio: %{y:.2f}<extra></extra>'
  }], plotlyLayout({
    title: { text: `Ratio Activos/Pasivos por Caja (${year})`, font: { size: 16 } },
    yaxis: { title: 'Ratio', rangemode: 'tozero' },
    shapes: [
      { type: 'line', x0: -0.5, x1: 6.5, y0: 3, y1: 3, line: { color: '#F59E0B', width: 1.5, dash: 'dash' } },
      { type: 'line', x0: -0.5, x1: 6.5, y0: 2, y1: 2, line: { color: '#EF4444', width: 1.5, dash: 'dash' } }
    ]
  }), plotlyConfig());
}

function renderProjection(data) {
  const kpis = data.kpis.por_caja;
  const years = [2020, 2021, 2022, 2023, 2024];
  const projYears = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
  const cajas = ['IPS', 'Fiscal', 'Ande', 'Bancaria'];

  const traces = [];
  cajas.forEach(c => {
    const actuals = years.map(y => kpis[c]?.[y]?.ratio || 0);
    // Simple linear regression
    const n = actuals.length;
    const xMean = years.reduce((s, v) => s + v, 0) / n;
    const yMean = actuals.reduce((s, v) => s + v, 0) / n;
    const slope = years.reduce((s, x, i) => s + (x - xMean) * (actuals[i] - yMean), 0) /
                  years.reduce((s, x) => s + (x - xMean) ** 2, 0);
    const intercept = yMean - slope * xMean;
    const projected = projYears.map(y => Math.max(0, intercept + slope * y));

    traces.push({
      x: years, y: actuals, name: c, type: 'scatter', mode: 'lines+markers',
      line: { color: CAJA_COLORS[c], width: 2.5 }, marker: { size: 6 },
      hovertemplate: `<b>${c}</b><br>%{x}: %{y:.2f}<extra></extra>`, legendgroup: c
    });
    traces.push({
      x: projYears, y: projected, name: `${c} (proy.)`, type: 'scatter', mode: 'lines',
      line: { color: CAJA_COLORS[c], width: 2, dash: 'dot' },
      hovertemplate: `<b>${c} proy.</b><br>%{x}: %{y:.2f}<extra></extra>`, legendgroup: c, showlegend: false
    });
  });

  traces.push({
    x: [2020, 2030], y: [2, 2], name: 'Umbral crítico', mode: 'lines',
    line: { color: '#EF4444', dash: 'dash', width: 1.5 }, hoverinfo: 'skip'
  });

  Plotly.newPlot('chart-projection', traces, plotlyLayout({
    title: { text: 'Proyección del Ratio a 2030 (tendencia lineal)', font: { size: 16 } },
    xaxis: { dtick: 1, range: [2019.5, 2030.5] },
    yaxis: { title: 'Ratio A/P', rangemode: 'tozero' },
    legend: { orientation: 'h', y: -0.2, font: { size: 10 } },
    annotations: [{
      x: 2028, y: 0.3, text: 'Nota: Proyección basada en tendencia<br>lineal simple. No es pronóstico actuarial.',
      showarrow: false, font: { size: 10, color: '#94A3B8' }, align: 'left'
    }]
  }), plotlyConfig());
}

// ============================================
// SECTION: SALARIOS Y APORTES
// ============================================
function renderSalarios(data, year, caja) {
  renderSalarioPromedioCajas(data);
  renderSalarioPorEdad(data, year);
  renderMasaSalarial(data);
  renderTasasAporte(data);
}

function renderSalarioPromedioCajas(data) {
  const serie = data.serie_temporal.filter(r => r.estado === 'Activos');
  const years = [2020, 2021, 2022, 2023, 2024];
  const smls = [2192839, 2289324, 2550307, 2680373, 2798309];
  const cajas = CAJA_ORDER.filter(c => serie.some(r => r.caja === c && r.salario_promedio > 0));

  const traces = cajas.map(c => ({
    x: years, name: c, type: 'scatter', mode: 'lines+markers',
    y: years.map(y => { const r = serie.find(r => r.ano === y && r.caja === c); return r ? r.salario_promedio : 0; }),
    line: { color: CAJA_COLORS[c], width: 2.5 }, marker: { size: 6 },
    hovertemplate: `<b>${c}</b><br>%{x}: Gs. %{y:,.0f}<extra></extra>`
  }));
  traces.push({
    x: years, y: smls, name: 'SML', mode: 'lines',
    line: { color: '#94A3B8', dash: 'dash', width: 2 },
    hovertemplate: 'SML: Gs. %{y:,.0f}<extra></extra>'
  });

  Plotly.newPlot('chart-sal-cajas', traces, plotlyLayout({
    title: { text: 'Salario Promedio Activos por Caja', font: { size: 16 } },
    xaxis: { dtick: 1 }, yaxis: { title: 'Guaraníes' },
    legend: { orientation: 'h', y: -0.2, font: { size: 10 } }
  }), plotlyConfig());
}

function renderSalarioPorEdad(data, year) {
  const sal = data.salarios_edad.filter(r => r.ano === year && r.estado === 'Activos');
  const cajas = ['IPS', 'Fiscal', 'Ande', 'Bancaria'];
  const ages = AGE_ORDER.filter(a => sal.some(r => r.edad_quinquenal === a && r.salario_promedio > 0));

  const traces = cajas.map(c => ({
    x: ages, name: c, type: 'bar',
    y: ages.map(a => { const r = sal.find(r => r.edad_quinquenal === a && r.caja === c); return r ? r.salario_promedio : 0; }),
    marker: { color: CAJA_COLORS[c], cornerradius: 3 },
    hovertemplate: `<b>${c}</b><br>%{x}: Gs. %{y:,.0f}<extra></extra>`
  }));

  Plotly.newPlot('chart-sal-edad', traces, plotlyLayout({
    title: { text: `Salario Promedio por Grupo de Edad (${year})`, font: { size: 16 } },
    barmode: 'group', xaxis: { title: 'Grupo de edad', tickangle: -45 },
    yaxis: { title: 'Guaraníes' },
    legend: { orientation: 'h', y: -0.3 },
    margin: { b: 90 }
  }), plotlyConfig());
}

function renderMasaSalarial(data) {
  const serie = data.serie_temporal.filter(r => r.estado === 'Activos');
  const years = [2020, 2021, 2022, 2023, 2024];

  const traces = CAJA_ORDER.map(c => ({
    x: years, name: c, type: 'scatter', mode: 'lines', stackgroup: 'one',
    y: years.map(y => { const r = serie.find(r => r.ano === y && r.caja === c); return r ? r.salarios : 0; }),
    line: { color: CAJA_COLORS[c] }, fillcolor: CAJA_COLORS[c] + '80',
    hovertemplate: '<b>' + c + '</b><br>%{x}: Gs. %{y:,.0f}<extra></extra>'
  }));

  Plotly.newPlot('chart-masa', traces, plotlyLayout({
    title: { text: 'Masa Salarial Total por Caja', font: { size: 16 } },
    xaxis: { dtick: 1 }, yaxis: { title: 'Guaraníes (total)' },
    legend: { orientation: 'h', y: -0.2, font: { size: 10 } }
  }), plotlyConfig());
}

function renderTasasAporte(data) {
  const tasas = data.tasas_aporte;
  if (!tasas?.length) return;

  const cajas = tasas.map(t => t.caja);
  const traces = [
    { name: 'Empleado', y: cajas, x: tasas.map(t => t.tasa_empleado), type: 'bar', orientation: 'h',
      marker: { color: '#2563EB', cornerradius: 3 },
      hovertemplate: '<b>%{y}</b><br>Empleado: %{x}%<extra></extra>' },
    { name: 'Empleador', y: cajas, x: tasas.map(t => t.tasa_empleador), type: 'bar', orientation: 'h',
      marker: { color: '#10B981', cornerradius: 3 },
      hovertemplate: '<b>%{y}</b><br>Empleador: %{x}%<extra></extra>' },
    { name: 'Estado', y: cajas, x: tasas.map(t => t.tasa_estado), type: 'bar', orientation: 'h',
      marker: { color: '#F59E0B', cornerradius: 3 },
      hovertemplate: '<b>%{y}</b><br>Estado: %{x}%<extra></extra>' }
  ];

  Plotly.newPlot('chart-tasas', traces, plotlyLayout({
    title: { text: 'Tasas de Aporte por Caja', font: { size: 16 } },
    barmode: 'stack', xaxis: { title: '% de aporte' },
    yaxis: { autorange: 'reversed' },
    legend: { orientation: 'h', y: -0.15 },
    margin: { l: 100 }
  }), plotlyConfig());
}

/**
 * BESS 2025 Dashboard - App State & Navigation
 */
document.addEventListener('alpine:init', () => {
  Alpine.data('dashboard', () => ({
    // State
    section: 'panorama',
    selectedYear: 2024,
    selectedCaja: 'IPS',
    darkMode: localStorage.getItem('bess-dark') === 'true',
    sidebarOpen: false,
    loading: true,
    data: {},
    years: [2020, 2021, 2022, 2023, 2024],
    tableSort: { col: null, asc: true },
    tableFilter: { caja: '', estado: '', ano: '', search: '' },
    tablePage: 0,

    sections: [
      { id: 'panorama', label: 'Panorama General', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { id: 'piramides', label: 'Pirámides Poblacionales', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
      { id: 'caja', label: 'Análisis por Caja', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      { id: 'comparativo', label: 'Comparativo', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { id: 'sostenibilidad', label: 'Sostenibilidad', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
      { id: 'salarios', label: 'Salarios y Aportes', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'explorador', label: 'Explorador de Datos', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' }
    ],

    async init() {
      this.applyTheme();
      await this.loadData();
      this.loading = false;
      this.$nextTick(() => {
        this.renderSection();
        this.animateKPIs();
      });
    },

    applyTheme() {
      document.documentElement.classList.toggle('dark', this.darkMode);
      document.body.className = this.darkMode ? 'dark bg-slate-900 text-slate-200' : 'light bg-slate-50 text-slate-800';
    },

    toggleDark() {
      this.darkMode = !this.darkMode;
      localStorage.setItem('bess-dark', this.darkMode);
      this.applyTheme();
      this.renderSection();
    },

    async loadData() {
      const files = ['kpis', 'serie_temporal', 'piramide_data', 'beneficios_pasivos', 'tasas_aporte', 'salarios_edad'];
      const results = await Promise.all(
        files.map(f => fetch(`datos/${f}.json`).then(r => r.json()))
      );
      files.forEach((f, i) => this.data[f] = results[i]);
    },

    navigate(id) {
      this.section = id;
      this.sidebarOpen = false;
      this.$nextTick(() => this.renderSection());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    setYear(y) {
      this.selectedYear = y;
      this.$nextTick(() => {
        this.renderSection();
        this.animateKPIs();
      });
    },

    setCaja(c) {
      this.selectedCaja = c;
      this.$nextTick(() => this.renderSection());
    },

    renderSection() {
      if (this.loading) return;
      const s = this.section;
      if (s === 'panorama') renderPanorama(this.data, this.selectedYear);
      else if (s === 'piramides') renderPiramides(this.data, this.selectedYear, this.selectedCaja);
      else if (s === 'caja') renderCajaDeepDive(this.data, this.selectedCaja, this.selectedYear);
      else if (s === 'comparativo') renderComparativo(this.data, this.selectedYear);
      else if (s === 'sostenibilidad') renderSostenibilidad(this.data, this.selectedYear);
      else if (s === 'salarios') renderSalarios(this.data, this.selectedYear, this.selectedCaja);
      else if (s === 'explorador') this.renderTable();
    },

    animateKPIs() {
      const g = this.data.kpis?.global?.[this.selectedYear];
      if (!g) return;
      this.$nextTick(() => {
        const el1 = document.getElementById('kpi-activos');
        const el2 = document.getElementById('kpi-pasivos');
        const el3 = document.getElementById('kpi-ratio');
        const el4 = document.getElementById('kpi-masa');
        if (el1) animateCountUp(el1, g.total_activos);
        if (el2) animateCountUp(el2, g.total_pasivos);
        if (el3) animateCountUp(el3, g.ratio, 1500);
        if (el4) { el4.textContent = formatGs(g.masa_salarial); }
      });
    },

    getKPI(field) {
      return this.data.kpis?.global?.[this.selectedYear]?.[field] || 0;
    },

    getKPIChange(field) {
      return this.data.kpis?.global?.[this.selectedYear]?.[field + '_cambio_pct'] || null;
    },

    getCajaInfo() {
      const t = this.data.tasas_aporte?.find(t => t.caja === this.selectedCaja);
      const k = this.data.kpis?.por_caja?.[this.selectedCaja]?.[this.selectedYear];
      return { tasas: t, kpis: k };
    },

    // Data explorer
    get tableData() {
      let rows = this.data.serie_temporal || [];
      if (this.tableFilter.caja) rows = rows.filter(r => r.caja === this.tableFilter.caja);
      if (this.tableFilter.estado) rows = rows.filter(r => r.estado === this.tableFilter.estado);
      if (this.tableFilter.ano) rows = rows.filter(r => r.ano === parseInt(this.tableFilter.ano));
      if (this.tableFilter.search) {
        const s = this.tableFilter.search.toLowerCase();
        rows = rows.filter(r => r.caja.toLowerCase().includes(s) || r.estado.toLowerCase().includes(s));
      }
      if (this.tableSort.col) {
        const col = this.tableSort.col;
        const dir = this.tableSort.asc ? 1 : -1;
        rows = [...rows].sort((a, b) => {
          const va = a[col], vb = b[col];
          if (typeof va === 'number') return (va - vb) * dir;
          return String(va).localeCompare(String(vb)) * dir;
        });
      }
      return rows;
    },

    get tablePageData() {
      const start = this.tablePage * 20;
      return this.tableData.slice(start, start + 20);
    },

    get totalTablePages() {
      return Math.ceil(this.tableData.length / 20);
    },

    sortTable(col) {
      if (this.tableSort.col === col) this.tableSort.asc = !this.tableSort.asc;
      else { this.tableSort.col = col; this.tableSort.asc = true; }
    },

    renderTable() { /* table is reactive via Alpine */ },

    exportCSV() {
      const rows = this.tableData;
      if (!rows.length) return;
      const headers = Object.keys(rows[0]);
      let csv = headers.join(',') + '\n';
      rows.forEach(r => {
        csv += headers.map(h => {
          const v = r[h];
          return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
        }).join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bess2025_datos.csv';
      a.click();
    }
  }));
});

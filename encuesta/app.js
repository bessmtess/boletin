/* MTESS Encuesta (cliente-only) */

const LS_USERS = "mtess_encuesta_users_v1";
const LS_SESSION = "mtess_encuesta_session_v1";
const LS_DATA_PREFIX = "mtess_encuesta_data_v1:";

const AGE_GROUPS = [
  "15 a 19",
  "20 a 24",
  "25 a 29",
  "30 a 34",
  "35 a 39",
  "40 a 44",
  "45 a 49",
  "50 a 54",
  "55 a 59",
  "60 a 64",
  "65 a 69",
  "70 a 74",
  "75 a 79",
  "80 a 84",
  "85 y más",
];

const state = {
  user: null,
  users: {},
  data: { version: 1, updatedAt: null, rows: [] },
};

function $(id) {
  return document.getElementById(id);
}

function nowISO() {
  return new Date().toISOString();
}

function normalizeUsername(input) {
  const raw = String(input || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return raw.replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

async function sha256(text) {
  if (!window.crypto?.subtle) {
    throw new Error("Crypto API no disponible en este navegador.");
  }
  const data = new TextEncoder().encode(String(text));
  const hash = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(LS_USERS);
    state.users = raw ? JSON.parse(raw) : {};
  } catch {
    state.users = {};
  }
}

function saveUsers() {
  localStorage.setItem(LS_USERS, JSON.stringify(state.users));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(username) {
  localStorage.setItem(LS_SESSION, JSON.stringify({ username, loggedInAt: nowISO() }));
}

function clearSession() {
  localStorage.removeItem(LS_SESSION);
}

function loadUserData(username) {
  try {
    const raw = localStorage.getItem(LS_DATA_PREFIX + username);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.rows)) {
      state.data = {
        version: 1,
        updatedAt: parsed.updatedAt || null,
        rows: parsed.rows.map(normalizeRow),
      };
      return;
    }
  } catch {}

  state.data = { version: 1, updatedAt: null, rows: [blankRow()] };
}

let saveDataTimer = null;
function saveUserDataDebounced() {
  if (!state.user) return;
  if (saveDataTimer) clearTimeout(saveDataTimer);
  saveDataTimer = setTimeout(() => {
    state.data.updatedAt = nowISO();
    localStorage.setItem(LS_DATA_PREFIX + state.user, JSON.stringify(state.data));
  }, 200);
}

function blankRow() {
  return {
    area: "",
    cargo: "",
    edad_grupo: AGE_GROUPS[1],
    mujeres_total: 0,
    hombres_total: 0,
    mujeres_ips: 0,
    hombres_ips: 0,
  };
}

function toInt(v) {
  const n = Number.parseInt(String(v || "0"), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function normalizeRow(r) {
  const out = { ...blankRow(), ...(r || {}) };
  out.area = String(out.area || "");
  out.cargo = String(out.cargo || "");
  out.edad_grupo = AGE_GROUPS.includes(out.edad_grupo) ? out.edad_grupo : AGE_GROUPS[1];
  out.mujeres_total = toInt(out.mujeres_total);
  out.hombres_total = toInt(out.hombres_total);
  out.mujeres_ips = toInt(out.mujeres_ips);
  out.hombres_ips = toInt(out.hombres_ips);
  return out;
}

function setView(viewId) {
  ["viewLogin", "viewEncuesta", "viewPerfil"].forEach((id) => $(id).classList.remove("active"));
  $(viewId).classList.add("active");
}

function setActiveNav(navId) {
  ["navEncuesta", "navPerfil"].forEach((id) => $(id).classList.remove("active"));
  $(navId).classList.add("active");
}

function showNav(visible) {
  $("appNav").style.display = visible ? "block" : "none";
}

function fmt(n) {
  return Number(n || 0).toLocaleString("es-PY");
}

function fmtPct(n) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(1) + "%";
}

function downloadBlob(filename, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function escapeCsv(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function computeStats(rows) {
  let w = 0,
    m = 0,
    wI = 0,
    mI = 0;
  const age = new Map();
  const byArea = new Map();
  const byCargo = new Map();

  const addGroup = (map, key, row) => {
    const k = String(key || "").trim() || "(Sin dato)";
    const cur = map.get(k) || { w: 0, m: 0, wI: 0, mI: 0, ips: 0, total: 0 };
    cur.w += row.mujeres_total;
    cur.m += row.hombres_total;
    cur.wI += row.mujeres_ips;
    cur.mI += row.hombres_ips;
    cur.ips += row.mujeres_ips + row.hombres_ips;
    cur.total = cur.w + cur.m;
    map.set(k, cur);
  };

  (rows || []).forEach((r0) => {
    const r = normalizeRow(r0);
    w += r.mujeres_total;
    m += r.hombres_total;
    wI += r.mujeres_ips;
    mI += r.hombres_ips;

    const ag = r.edad_grupo;
    const cur = age.get(ag) || { w: 0, m: 0 };
    cur.w += r.mujeres_total;
    cur.m += r.hombres_total;
    age.set(ag, cur);

    addGroup(byArea, r.area, r);
    addGroup(byCargo, r.cargo, r);
  });

  const total = w + m;
  const ips = wI + mI;
  const pctW = total > 0 ? (w / total) * 100 : 0;
  const pctIps = total > 0 ? (ips / total) * 100 : 0;

  return { total, w, m, ips, pctW, pctIps, age, byArea, byCargo };
}

function validateRows(rows) {
  const errors = [];
  (rows || []).forEach((r0, idx) => {
    const r = normalizeRow(r0);
    if (r.mujeres_ips > r.mujeres_total) errors.push(`Fila ${idx + 1}: Mujeres IPS (${r.mujeres_ips}) supera Mujeres (${r.mujeres_total}).`);
    if (r.hombres_ips > r.hombres_total) errors.push(`Fila ${idx + 1}: Hombres IPS (${r.hombres_ips}) supera Hombres (${r.hombres_total}).`);
  });
  return errors;
}

function renderHero(stats) {
  const countRows = (state.data.rows || []).length;
  $("heroKpis").innerHTML = `
    <div class="hero-kpi"><div class="num">${fmt(stats.total)}</div><div class="lbl">Total Personas</div></div>
    <div class="hero-kpi"><div class="num">${fmtPct(stats.pctW)}</div><div class="lbl">% Mujeres</div></div>
    <div class="hero-kpi"><div class="num">${fmtPct(stats.pctIps)}</div><div class="lbl">Cobertura IPS</div></div>
    <div class="hero-kpi"><div class="num">${fmt(countRows)}</div><div class="lbl">Registros</div></div>
  `;
}

function renderKPIs(stats) {
  $("kpiTotal").textContent = fmt(stats.total);
  $("kpiTotalSub").textContent = `${fmt(stats.w)} mujeres · ${fmt(stats.m)} hombres`;
  $("kpiMujeres").textContent = fmtPct(stats.pctW);
  $("kpiMujeresSub").textContent = stats.total ? `Mujeres: ${fmt(stats.w)}` : "—";
  $("kpiIPS").textContent = fmt(stats.ips);
  $("kpiIPSSub").textContent = stats.total ? `IPS: ${fmtPct(stats.pctIps)} del total` : "—";
  $("kpiCobertura").textContent = fmtPct(stats.pctIps);
  $("kpiCoberturaSub").textContent = stats.total ? `${fmt(stats.ips)} de ${fmt(stats.total)}` : "—";
}

function plotlyLayout(overrides = {}) {
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "DM Sans, sans-serif", size: 12, color: "#5a6a7e" },
    margin: { t: 28, b: 56, l: 70, r: 20 },
    xaxis: { gridcolor: "#eef1f5", zeroline: false },
    yaxis: { gridcolor: "#eef1f5", zeroline: false },
    legend: { orientation: "h", y: 1.12, x: 0.5, xanchor: "center" },
    hoverlabel: { bordercolor: "transparent" },
    ...overrides,
  };
}

function plotlyConfig() {
  return { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] };
}

function renderCharts(stats) {
  if (!window.Plotly) return;

  // Pirámide
  const y = [...AGE_GROUPS].slice().reverse();
  const menAbs = y.map((g) => stats.age.get(g)?.m || 0);
  const men = menAbs.map((v) => -v);
  const women = y.map((g) => stats.age.get(g)?.w || 0);
  const maxV = Math.max(1, ...men.map((v) => Math.abs(v)), ...women) * 1.15;

  Plotly.newPlot(
    "chartPiramide",
    [
      {
        y,
        x: men,
        customdata: menAbs,
        name: "Hombres",
        type: "bar",
        orientation: "h",
        marker: { color: "#1d4354" },
        hovertemplate: "<b>%{y}</b><br>Hombres: %{customdata:,.0f}<extra></extra>",
      },
      { y, x: women, name: "Mujeres", type: "bar", orientation: "h", marker: { color: "#ea2424" }, hovertemplate: "<b>%{y}</b><br>Mujeres: %{x:,.0f}<extra></extra>" },
    ],
    plotlyLayout({
      barmode: "relative",
      bargap: 0.12,
      height: Math.max(420, y.length * 26),
      xaxis: { range: [-maxV, maxV], showticklabels: false, showgrid: false, zeroline: true, zerolinecolor: "#dee2e6", zerolinewidth: 2 },
      yaxis: { showgrid: false },
      margin: { t: 20, b: 40, l: 78, r: 18 },
    }),
    plotlyConfig(),
  );

  const topN = (map, n = 10) =>
    [...map.entries()]
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, n);

  const areas = topN(stats.byArea, 10);
  const cargos = topN(stats.byCargo, 10);

  const areaX = areas.map(([k]) => k);
  const areaY = areas.map(([, v]) => (v.total ? (v.w / v.total) * 100 : 0));
  const areaCov = areas.map(([, v]) => (v.total ? (v.ips / v.total) * 100 : 0));

  Plotly.newPlot(
    "chartMujeresArea",
    [
      {
        x: areaX,
        y: areaY,
        type: "bar",
        marker: { color: areaY.map((p) => (p >= 50 ? "#ea2424" : "#1d4354")) },
        text: areaY.map((p) => p.toFixed(1) + "%"),
        textposition: "outside",
        customdata: areas.map(([, v]) => [v.total, v.w, v.m]),
        hovertemplate:
          "<b>%{x}</b><br>%{y:.1f}% mujeres<br>Total: %{customdata[0]:,.0f}<br>Mujeres: %{customdata[1]:,.0f}<br>Hombres: %{customdata[2]:,.0f}<extra></extra>",
      },
    ],
    plotlyLayout({
      height: 420,
      yaxis: { title: "% Mujeres", range: [0, Math.max(60, Math.max(...areaY) * 1.2)] },
      xaxis: { tickangle: -30 },
      margin: { t: 20, b: 96, l: 60, r: 18 },
      shapes: [
        { type: "line", x0: -0.5, x1: areaX.length - 0.5, y0: 50, y1: 50, line: { color: "#ea2424", width: 2, dash: "dash" } },
      ],
    }),
    plotlyConfig(),
  );

  const cargoX = cargos.map(([k]) => k);
  const cargoY = cargos.map(([, v]) => (v.total ? (v.w / v.total) * 100 : 0));
  Plotly.newPlot(
    "chartMujeresCargo",
    [
      {
        x: cargoX,
        y: cargoY,
        type: "bar",
        marker: { color: cargoY.map((p) => (p >= 50 ? "#ea2424" : "#1d4354")) },
        text: cargoY.map((p) => p.toFixed(1) + "%"),
        textposition: "outside",
        customdata: cargos.map(([, v]) => [v.total, v.w, v.m]),
        hovertemplate:
          "<b>%{x}</b><br>%{y:.1f}% mujeres<br>Total: %{customdata[0]:,.0f}<br>Mujeres: %{customdata[1]:,.0f}<br>Hombres: %{customdata[2]:,.0f}<extra></extra>",
      },
    ],
    plotlyLayout({
      height: 420,
      yaxis: { title: "% Mujeres", range: [0, Math.max(60, Math.max(...cargoY) * 1.2)] },
      xaxis: { tickangle: -30 },
      margin: { t: 20, b: 96, l: 60, r: 18 },
      shapes: [
        { type: "line", x0: -0.5, x1: cargoX.length - 0.5, y0: 50, y1: 50, line: { color: "#ea2424", width: 2, dash: "dash" } },
      ],
    }),
    plotlyConfig(),
  );

  const cargoCov = cargos.map(([, v]) => (v.total ? (v.ips / v.total) * 100 : 0));
  Plotly.newPlot(
    "chartCoberturaCargo",
    [
      {
        x: cargoX,
        y: cargoCov,
        type: "bar",
        marker: { color: "#0693e3" },
        text: cargoCov.map((p) => p.toFixed(1) + "%"),
        textposition: "outside",
        customdata: cargos.map(([, v]) => [v.ips, v.total]),
        hovertemplate: "<b>%{x}</b><br>%{y:.1f}% cobertura IPS<br>IPS: %{customdata[0]:,.0f}<br>Total: %{customdata[1]:,.0f}<extra></extra>",
      },
    ],
    plotlyLayout({
      height: 420,
      yaxis: { title: "% Cobertura IPS", range: [0, Math.max(60, Math.max(...cargoCov) * 1.2)] },
      xaxis: { tickangle: -30 },
      margin: { t: 20, b: 96, l: 70, r: 18 },
    }),
    plotlyConfig(),
  );

  const areaGapCustom = areas.map(([, v]) => {
    const wCov = v.w ? (v.wI / v.w) * 100 : 0;
    const mCov = v.m ? (v.mI / v.m) * 100 : 0;
    return [wCov, mCov, v.wI, v.w, v.mI, v.m];
  });
  const areaGap = areaGapCustom.map((d) => d[0] - d[1]);
  const gapMaxAbs = Math.max(5, ...areaGap.map((g) => Math.abs(g))) * 1.25;
  Plotly.newPlot(
    "chartBrechaIpsArea",
    [
      {
        x: areaX,
        y: areaGap,
        type: "bar",
        marker: { color: areaGap.map((g) => (g > 0.05 ? "#ea2424" : g < -0.05 ? "#1d4354" : "#6c757d")) },
        text: areaGap.map((g) => (g >= 0 ? "+" : "") + g.toFixed(1) + " pp"),
        textposition: "outside",
        customdata: areaGapCustom,
        hovertemplate:
          "<b>%{x}</b><br>Brecha (Mujeres - Hombres): %{y:+.1f} pp<br>Cobertura mujeres: %{customdata[0]:.1f}% (%{customdata[2]:,.0f} / %{customdata[3]:,.0f})<br>Cobertura hombres: %{customdata[1]:.1f}% (%{customdata[4]:,.0f} / %{customdata[5]:,.0f})<extra></extra>",
      },
    ],
    plotlyLayout({
      height: 420,
      yaxis: { title: "Brecha cobertura IPS (pp)", range: [-gapMaxAbs, gapMaxAbs] },
      xaxis: { tickangle: -30 },
      margin: { t: 20, b: 96, l: 70, r: 18 },
      shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: 0, y1: 0, line: { color: "#adb5bd", width: 2, dash: "dash" } }],
    }),
    plotlyConfig(),
  );

  Plotly.newPlot(
    "chartCoberturaArea",
    [
      {
        x: areaX,
        y: areaCov,
        type: "bar",
        marker: { color: "#0693e3" },
        text: areaCov.map((p) => p.toFixed(1) + "%"),
        textposition: "outside",
        customdata: areas.map(([, v]) => [v.ips, v.total]),
        hovertemplate: "<b>%{x}</b><br>%{y:.1f}% cobertura IPS<br>IPS: %{customdata[0]:,.0f}<br>Total: %{customdata[1]:,.0f}<extra></extra>",
      },
    ],
    plotlyLayout({
      height: 420,
      yaxis: { title: "% Cobertura IPS", range: [0, Math.max(60, Math.max(...areaCov) * 1.2)] },
      xaxis: { tickangle: -30 },
      margin: { t: 20, b: 96, l: 70, r: 18 },
    }),
    plotlyConfig(),
  );
}

function renderTable() {
  const body = $("rowsBody");
  body.innerHTML = "";

  const rows = state.data.rows || [];
  rows.forEach((r, idx) => {
    const row = normalizeRow(r);
    const tr = document.createElement("tr");

    const mkText = (field, placeholder) => {
      const td = document.createElement("td");
      const inp = document.createElement("input");
      inp.type = "text";
      inp.value = row[field] || "";
      inp.placeholder = placeholder || "";
      inp.addEventListener("input", () => {
        state.data.rows[idx][field] = inp.value;
        saveUserDataDebounced();
        updateStats();
      });
      td.appendChild(inp);
      return td;
    };

    const mkSelect = (field) => {
      const td = document.createElement("td");
      const sel = document.createElement("select");
      AGE_GROUPS.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        sel.appendChild(opt);
      });
      sel.value = row[field];
      sel.addEventListener("change", () => {
        state.data.rows[idx][field] = sel.value;
        saveUserDataDebounced();
        updateStats();
      });
      td.appendChild(sel);
      return td;
    };

    const mkNum = (field) => {
      const td = document.createElement("td");
      const inp = document.createElement("input");
      inp.type = "number";
      inp.min = "0";
      inp.step = "1";
      inp.value = String(toInt(row[field]));
      inp.addEventListener("input", () => {
        state.data.rows[idx][field] = toInt(inp.value);
        saveUserDataDebounced();
        updateStats();
      });
      td.appendChild(inp);
      return td;
    };

    const tdDel = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.type = "button";
    delBtn.title = "Eliminar fila";
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.addEventListener("click", () => {
      state.data.rows.splice(idx, 1);
      if (state.data.rows.length === 0) state.data.rows.push(blankRow());
      saveUserDataDebounced();
      renderAll();
    });
    tdDel.appendChild(delBtn);

    tr.appendChild(mkText("area", "Ej: Finanzas"));
    tr.appendChild(mkText("cargo", "Ej: Analista"));
    tr.appendChild(mkSelect("edad_grupo"));
    tr.appendChild(mkNum("mujeres_total"));
    tr.appendChild(mkNum("hombres_total"));
    tr.appendChild(mkNum("mujeres_ips"));
    tr.appendChild(mkNum("hombres_ips"));
    tr.appendChild(tdDel);

    body.appendChild(tr);
  });
}

let chartsTimer = null;
function updateStats() {
  const rows = state.data.rows || [];
  const errors = validateRows(rows);
  $("rowsError").textContent = errors.length ? errors[0] : "";
  const stats = computeStats(rows);
  renderHero(stats);
  renderKPIs(stats);
  if (chartsTimer) clearTimeout(chartsTimer);
  chartsTimer = setTimeout(() => renderCharts(stats), 160);
}

function renderAll() {
  renderTable();
  updateStats();
}

function updatePerfilUI() {
  if (!state.user) return;
  const u = state.users[state.user];
  $("perfilUser").textContent = state.user;
  $("perfilEstado").textContent = u?.mustChangePassword ? "Debe cambiar la contraseña" : "OK";
}

async function handleLogin(e) {
  e.preventDefault();
  $("loginError").textContent = "";

  const rawUser = $("loginUser").value;
  const pass = $("loginPass").value;
  const user = normalizeUsername(rawUser);
  $("loginUser").value = user;

  if (!user) {
    $("loginError").textContent = "Ingrese un usuario válido (solo letras/números).";
    return;
  }
  if (!pass) {
    $("loginError").textContent = "Ingrese la contraseña.";
    return;
  }

  const users = state.users;
  const existing = users[user];

  try {
    const passHash = await sha256(pass);
    if (existing) {
      if (existing.passHash !== passHash) {
        $("loginError").textContent = "Usuario o contraseña incorrectos.";
        return;
      }
      state.user = user;
      saveSession(user);
      showNav(true);
      $("navUser").textContent = user;
      updatePerfilUI();
      loadUserData(user);
      if (existing.mustChangePassword) {
        setActiveNav("navPerfil");
        setView("viewPerfil");
      } else {
        setActiveNav("navEncuesta");
        setView("viewEncuesta");
      }
      renderAll();
      return;
    }

    const defaultPass = user + "123";
    if (pass !== defaultPass) {
      $("loginError").textContent = `Primer ingreso: la contraseña inicial debe ser ${defaultPass}`;
      return;
    }

    users[user] = {
      username: user,
      passHash,
      mustChangePassword: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    saveUsers();
    state.user = user;
    saveSession(user);
    showNav(true);
    $("navUser").textContent = user;
    updatePerfilUI();
    loadUserData(user);
    setActiveNav("navPerfil");
    setView("viewPerfil");
    renderAll();
  } catch (err) {
    $("loginError").textContent = String(err?.message || err || "Error de login.");
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  $("passError").textContent = "";
  $("passSuccess").textContent = "";

  const cur = $("passCurrent").value;
  const n1 = $("passNew").value;
  const n2 = $("passNew2").value;

  if (!state.user || !state.users[state.user]) {
    $("passError").textContent = "Sesión inválida. Inicie sesión nuevamente.";
    return;
  }
  if (!cur || !n1 || !n2) {
    $("passError").textContent = "Complete todos los campos.";
    return;
  }
  if (n1 !== n2) {
    $("passError").textContent = "La nueva contraseña no coincide.";
    return;
  }
  if (n1.length < 8) {
    $("passError").textContent = "La nueva contraseña debe tener al menos 8 caracteres.";
    return;
  }

  try {
    const curHash = await sha256(cur);
    const userRec = state.users[state.user];
    if (userRec.passHash !== curHash) {
      $("passError").textContent = "La contraseña actual no es correcta.";
      return;
    }
    userRec.passHash = await sha256(n1);
    userRec.mustChangePassword = false;
    userRec.updatedAt = nowISO();
    saveUsers();
    $("passSuccess").textContent = "Contraseña actualizada.";
    $("passCurrent").value = "";
    $("passNew").value = "";
    $("passNew2").value = "";
    updatePerfilUI();
    setActiveNav("navEncuesta");
    setView("viewEncuesta");
    renderAll();
  } catch (err) {
    $("passError").textContent = String(err?.message || err || "Error al cambiar la contraseña.");
  }
}

function logout() {
  state.user = null;
  clearSession();
  showNav(false);
  $("navUser").textContent = "";
  setView("viewLogin");
  setActiveNav("navEncuesta");
  $("loginPass").value = "";
}

function setupNav() {
  $("navEncuesta").addEventListener("click", () => {
    if (!state.user) return;
    const u = state.users[state.user];
    if (u?.mustChangePassword) {
      setActiveNav("navPerfil");
      setView("viewPerfil");
      return;
    }
    setActiveNav("navEncuesta");
    setView("viewEncuesta");
    updateStats();
  });
  $("navPerfil").addEventListener("click", () => {
    if (!state.user) return;
    setActiveNav("navPerfil");
    setView("viewPerfil");
    updatePerfilUI();
  });
  $("navLogout").addEventListener("click", () => logout());
}

function setupEncuestaActions() {
  $("addRowBtn").addEventListener("click", () => {
    state.data.rows.push(blankRow());
    saveUserDataDebounced();
    renderAll();
  });

  $("exportJsonBtn").addEventListener("click", () => {
    if (!state.user) return;
    const payload = { ...state.data, exportedAt: nowISO(), username: state.user };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadBlob(`encuesta_${state.user}_${stamp}.json`, blob);
  });

  $("exportCsvBtn").addEventListener("click", () => {
    if (!state.user) return;
    const headers = ["area", "cargo", "edad_grupo", "mujeres_total", "hombres_total", "mujeres_ips", "hombres_ips"];
    let csv = headers.join(",") + "\n";
    (state.data.rows || []).forEach((r0) => {
      const r = normalizeRow(r0);
      csv += headers.map((h) => escapeCsv(r[h])).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadBlob(`encuesta_${state.user}_${stamp}.csv`, blob);
  });

  $("importJson").addEventListener("change", async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.rows)) throw new Error("JSON inválido: falta 'rows'.");
      state.data.rows = parsed.rows.map(normalizeRow);
      if (state.data.rows.length === 0) state.data.rows = [blankRow()];
      saveUserDataDebounced();
      renderAll();
      ev.target.value = "";
    } catch (err) {
      $("rowsError").textContent = String(err?.message || err || "Error al importar JSON.");
    }
  });
}

function setupLoginHints() {
  $("loginUser").addEventListener("input", () => {
    const u = normalizeUsername($("loginUser").value);
    if (!u) {
      $("loginUserHint").textContent = "";
      return;
    }
    $("loginUserHint").textContent = `Normalizado: ${u} · Contraseña inicial: ${u}123`;
  });
}

function boot() {
  loadUsers();
  setupNav();
  setupEncuestaActions();
  setupLoginHints();
  $("loginForm").addEventListener("submit", handleLogin);
  $("passForm").addEventListener("submit", handleChangePassword);

  const sess = loadSession();
  if (sess?.username && state.users[sess.username]) {
    state.user = sess.username;
    showNav(true);
    $("navUser").textContent = state.user;
    updatePerfilUI();
    loadUserData(state.user);
    if (state.users[state.user].mustChangePassword) {
      setActiveNav("navPerfil");
      setView("viewPerfil");
    } else {
      setActiveNav("navEncuesta");
      setView("viewEncuesta");
    }
    renderAll();
    return;
  }

  showNav(false);
  setView("viewLogin");
  renderHero(computeStats([]));
}

boot();

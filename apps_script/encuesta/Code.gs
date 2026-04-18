/**
 * Encuesta MTESS — Apps Script (Web App)
 *
 * Hojas:
 * - Users: username | pass_hash | must_change | created_at | updated_at
 * - Responses: username | saved_at | area | cargo | edad_grupo | mujeres_total | hombres_total | mujeres_ips | hombres_ips
 *
 * Ejecutar `setup()` una vez (ideal: script ligado a un Google Sheet).
 */

const SHEET_USERS = "Users";
const SHEET_RESPONSES = "Responses";

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

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function doGet() {
  setup();
  return HtmlService.createHtmlOutputFromFile("Index").setTitle("Encuesta — MTESS");
}

function setup() {
  const ss = getSpreadsheet_();

  const users = getOrCreateSheet_(ss, SHEET_USERS, [
    "username",
    "pass_hash",
    "must_change",
    "created_at",
    "updated_at",
  ]);
  users.getRange(1, 1, 1, 5).setFontWeight("bold");

  const resp = getOrCreateSheet_(ss, SHEET_RESPONSES, [
    "username",
    "saved_at",
    "area",
    "cargo",
    "edad_grupo",
    "mujeres_total",
    "hombres_total",
    "mujeres_ips",
    "hombres_ips",
  ]);
  resp.getRange(1, 1, 1, 9).setFontWeight("bold");

  ensureSecret_();
}

// ==========================
// API
// ==========================

function apiLogin(rawUsername, password) {
  setup();
  const username = normalizeUsername_(rawUsername);

  if (!username) return { ok: false, msg: "Usuario inválido." };
  if (!password) return { ok: false, msg: "Ingrese la contraseña." };

  const user = findUser_(username);
  const passHash = sha256Hex_(String(password));

  if (!user) {
    const expected = username + "123";
    if (String(password) !== expected) {
      return { ok: false, msg: "Primer ingreso: la contraseña inicial debe ser " + expected };
    }
    createUser_(username, passHash, true);
    return {
      ok: true,
      username,
      mustChangePassword: true,
      token: makeToken_(username),
    };
  }

  if (user.passHash !== passHash) {
    return { ok: false, msg: "Usuario o contraseña incorrectos." };
  }

  return {
    ok: true,
    username,
    mustChangePassword: !!user.mustChange,
    token: makeToken_(username),
  };
}

function apiWhoAmI(token) {
  setup();
  try {
    const username = verifyToken_(token);
    const user = findUser_(username);
    if (!user) return { ok: false, msg: "Usuario no encontrado." };
    return { ok: true, username, mustChangePassword: !!user.mustChange };
  } catch (e) {
    return { ok: false, msg: String(e && e.message ? e.message : e) };
  }
}

function apiChangePassword(token, currentPassword, newPassword) {
  setup();
  try {
    const username = verifyToken_(token);
    const user = findUser_(username);
    if (!user) return { ok: false, msg: "Usuario no encontrado." };
    if (!currentPassword) return { ok: false, msg: "Ingrese la contraseña actual." };
    if (!newPassword || String(newPassword).length < 8) return { ok: false, msg: "La nueva contraseña debe tener al menos 8 caracteres." };

    const curHash = sha256Hex_(String(currentPassword));
    if (user.passHash !== curHash) return { ok: false, msg: "La contraseña actual no es correcta." };

    updateUserPassword_(username, sha256Hex_(String(newPassword)));
    return { ok: true, msg: "Contraseña actualizada.", mustChangePassword: false };
  } catch (e) {
    return { ok: false, msg: String(e && e.message ? e.message : e) };
  }
}

function apiGetMyRows(token) {
  setup();
  try {
    const username = verifyToken_(token);
    const ss = getSpreadsheet_();
    const sh = ss.getSheetByName(SHEET_RESPONSES);
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return { ok: true, rows: [] };

    const values = sh.getRange(2, 1, lastRow - 1, 9).getValues();
    const rows = [];
    for (let i = 0; i < values.length; i++) {
      const r = values[i];
      if (String(r[0]) !== username) continue;
      rows.push({
        area: String(r[2] || ""),
        cargo: String(r[3] || ""),
        edad_grupo: String(r[4] || ""),
        mujeres_total: toInt_(r[5]),
        hombres_total: toInt_(r[6]),
        mujeres_ips: toInt_(r[7]),
        hombres_ips: toInt_(r[8]),
      });
    }
    return { ok: true, rows: rows };
  } catch (e) {
    return { ok: false, msg: String(e && e.message ? e.message : e) };
  }
}

function apiSaveRows(token, rows) {
  setup();
  try {
    const username = verifyToken_(token);
    const cleanRows = normalizeRows_(rows);

    const errors = validateRows_(cleanRows);
    if (errors.length) return { ok: false, msg: errors[0] };

    const ss = getSpreadsheet_();
    const sh = ss.getSheetByName(SHEET_RESPONSES);

    // Borra filas previas del usuario (mantiene solo la versión más reciente)
    const lastRow = sh.getLastRow();
    if (lastRow >= 2) {
      const userCol = sh.getRange(2, 1, lastRow - 1, 1).getValues();
      const toDelete = [];
      for (let i = 0; i < userCol.length; i++) {
        if (String(userCol[i][0]) === username) toDelete.push(i + 2);
      }
      for (let j = toDelete.length - 1; j >= 0; j--) {
        sh.deleteRow(toDelete[j]);
      }
    }

    const savedAt = new Date();
    const out = cleanRows.map((r) => [
      username,
      savedAt,
      r.area,
      r.cargo,
      r.edad_grupo,
      r.mujeres_total,
      r.hombres_total,
      r.mujeres_ips,
      r.hombres_ips,
    ]);

    if (out.length) {
      sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
    }

    return { ok: true, saved: out.length, savedAt: savedAt.toISOString() };
  } catch (e) {
    return { ok: false, msg: String(e && e.message ? e.message : e) };
  }
}

// ==========================
// Helpers: spreadsheet
// ==========================

function getSpreadsheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("No hay Spreadsheet activo. Recomendado: ligar el script a un Google Sheet.");
  return ss;
}

function getOrCreateSheet_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
  }
  return sh;
}

// ==========================
// Helpers: users
// ==========================

function findUser_(username) {
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(SHEET_USERS);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return null;

  const values = sh.getRange(2, 1, lastRow - 1, 5).getValues();
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    if (String(r[0]) !== username) continue;
    return {
      row: i + 2,
      username: String(r[0]),
      passHash: String(r[1] || ""),
      mustChange: String(r[2]) === "TRUE" || r[2] === true,
      createdAt: r[3],
      updatedAt: r[4],
    };
  }
  return null;
}

function createUser_(username, passHash, mustChange) {
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(SHEET_USERS);
  const now = new Date();
  sh.appendRow([username, passHash, mustChange ? true : false, now, now]);
}

function updateUserPassword_(username, passHash) {
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(SHEET_USERS);
  const user = findUser_(username);
  if (!user) throw new Error("Usuario no encontrado.");
  sh.getRange(user.row, 2).setValue(passHash);
  sh.getRange(user.row, 3).setValue(false);
  sh.getRange(user.row, 5).setValue(new Date());
}

// ==========================
// Helpers: rows
// ==========================

function normalizeRows_(rows) {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map((r) => ({
    area: String((r && r.area) || ""),
    cargo: String((r && r.cargo) || ""),
    edad_grupo: AGE_GROUPS.indexOf(String((r && r.edad_grupo) || "")) >= 0 ? String(r.edad_grupo) : AGE_GROUPS[1],
    mujeres_total: toInt_(r && r.mujeres_total),
    hombres_total: toInt_(r && r.hombres_total),
    mujeres_ips: toInt_(r && r.mujeres_ips),
    hombres_ips: toInt_(r && r.hombres_ips),
  }));
}

function validateRows_(rows) {
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.mujeres_ips > r.mujeres_total) errors.push("Fila " + (i + 1) + ": Mujeres IPS supera Mujeres.");
    if (r.hombres_ips > r.hombres_total) errors.push("Fila " + (i + 1) + ": Hombres IPS supera Hombres.");
  }
  return errors;
}

function toInt_(v) {
  const n = parseInt(String(v == null ? "0" : v), 10);
  return isFinite(n) && !isNaN(n) ? Math.max(0, n) : 0;
}

// ==========================
// Helpers: crypto / tokens
// ==========================

function normalizeUsername_(input) {
  const raw = String(input || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return raw.replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

function sha256Hex_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes
    .map((b) => (b < 0 ? b + 256 : b))
    .map((b) => ("0" + b.toString(16)).slice(-2))
    .join("");
}

function ensureSecret_() {
  const props = PropertiesService.getScriptProperties();
  const key = "APP_SECRET";
  const cur = props.getProperty(key);
  if (cur) return cur;
  const secret = Utilities.getUuid() + "-" + Utilities.getUuid();
  props.setProperty(key, secret);
  return secret;
}

function getSecret_() {
  const props = PropertiesService.getScriptProperties();
  const s = props.getProperty("APP_SECRET");
  return s || ensureSecret_();
}

function makeToken_(username) {
  const payloadObj = { u: username, iat: Date.now(), exp: Date.now() + TOKEN_TTL_MS };
  const payload = Utilities.base64EncodeWebSafe(JSON.stringify(payloadObj));
  const sig = sign_(payload);
  return payload + "." + sig;
}

function verifyToken_(token) {
  const t = String(token || "");
  const parts = t.split(".");
  if (parts.length !== 2) throw new Error("Token inválido.");
  const payload = parts[0];
  const sig = parts[1];
  const expected = sign_(payload);
  if (expected !== sig) throw new Error("Token inválido.");
  const obj = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payload)).getDataAsString());
  if (!obj || !obj.u) throw new Error("Token inválido.");
  if (Date.now() > Number(obj.exp || 0)) throw new Error("Token expirado.");
  return String(obj.u);
}

function sign_(payload) {
  const secret = getSecret_();
  const bytes = Utilities.computeHmacSha256Signature(payload, secret);
  return Utilities.base64EncodeWebSafe(bytes);
}


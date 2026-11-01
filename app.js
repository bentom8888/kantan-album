"use strict";
/*
 かんたん画像アルバム スマホ版 v0.7.1
 - PC版v0.6.0が作る「スマホで見る.html」をOneDriveから読み取り専用(Files.Read)で取得
 - 取得したHTMLは端末(IndexedDB)に保存し、オフラインでも表示
 - 取得に失敗しても、保存済みのアルバムは消さない
 - 認証: Microsoft ID プラットフォーム / 認可コード + PKCE（クライアントシークレットなし）
*/
const cfg = window.ALBUM_CONFIG || {};
const $ = id => document.getElementById(id);
const BASE = new URL("./", location.href).href;          // 例: https://bentom8888.github.io/kantan-album/
const REDIRECT = BASE;                                    // Azureに登録するリダイレクトURIと完全一致させる
const SCOPES = "openid profile offline_access Files.Read";
const AUTHORITY = "https://login.microsoftonline.com/consumers/oauth2/v2.0";
const GRAPH = "https://graph.microsoft.com/v1.0";
const K = {
  refresh: "kaa.refresh",       // リフレッシュトークン（Microsoftの規則で約24時間有効）
  hint: "kaa.loginHint",        // 前回ログインしたアカウント名（自動再ログイン用）
  pkce: "kaa.pkce",             // ログイン途中の一時データ
  silentAt: "kaa.silentAt",     // 自動再ログインを試した時刻（無限ループ防止）
  loggedOut: "kaa.loggedOut"
};

let accessToken = "", expiresAt = 0, shownKey = "", rendered = false, showingPrevious = false, syncing = false, pending = null;

/* ---------- 小道具 ---------- */
function ls(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  } catch { return null; }
}
function status(msg, warn = false) { const s = $("appStatus"); s.textContent = msg; s.classList.toggle("warn", warn); }
function fmt(t) { try { return new Date(t).toLocaleString("ja-JP", {month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"}); } catch { return ""; } }
function mb(n) { return (n / 1048576).toFixed(1) + "MB"; }
function progress(p) { $("appProgress").firstElementChild.style.width = p == null ? "0" : Math.round(p * 100) + "%"; }
function b64url(bytes) { let s = ""; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function random() { return b64url(crypto.getRandomValues(new Uint8Array(32))); }
async function sha256(s) { return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))); }
function clientReady() { return cfg.clientId && !String(cfg.clientId).startsWith("REPLACE_"); }
function loggedIn() { return !!(accessToken || ls(K.refresh)); }
function setLoginButton() { $("appLogin").hidden = loggedIn(); }

/* ---------- 端末内の保存（IndexedDB） ---------- */
function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("kantan-album-mobile", 2);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("snapshot")) req.result.createObjectStore("snapshot"); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbGet(key) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("snapshot", "readonly"); const r = tx.objectStore("snapshot").get(key);
    r.onsuccess = () => resolve(r.result || null); r.onerror = () => reject(r.error); tx.oncomplete = () => d.close();
  });
}
// 新しい版を保存するとき、それまでの版を "previous" として1つ残す（1回の書き込みでまとめて行う）
async function dbSaveNew(value) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("snapshot", "readwrite"); const st = tx.objectStore("snapshot");
    const r = st.get("latest");
    r.onsuccess = () => { if (r.result) st.put(r.result, "previous"); st.put(value, "latest"); };
    tx.oncomplete = () => { d.close(); resolve(); };
    tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || Error("保存が中断されました"));
  });
}
async function dbTouch(checkedAt) {
  const cur = await dbGet("latest"); if (!cur) return;
  cur.checkedAt = checkedAt;
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("snapshot", "readwrite"); tx.objectStore("snapshot").put(cur, "latest");
    tx.oncomplete = () => { d.close(); resolve(); }; tx.onerror = () => reject(tx.error);
  });
}

/* ---------- 表示 ---------- */
// 「スマホで見る.html」の中から画像・コメントのデータ（ALBUM_DATA）だけを JSON として取り出す。
// HTML内のプログラムは実行しない。表示はアプリ内の album-view.js（PC版と同じ画面）が行う。
function extractData(html) {
  const mark = "const ALBUM_DATA=", i = html.indexOf(mark);
  const end = i < 0 ? -1 : html.indexOf(";\nconst $=id=>", i);
  if (i < 0 || end < 0) throw Error("アルバムのデータが見つかりません");
  const data = JSON.parse(html.slice(i + mark.length, end));
  if (!data || !Array.isArray(data.items)) throw Error("アルバムのデータ形式が違います");
  return data;
}
// 枠(iframe)を使わずにページへ直接表示する（iPadで枠の中がスクロールできない問題の対策）。
// 表示部分は1回しか組み立てられないため、別の版に切り替えるときはページを読み直す。
function display(value, which = "latest") {
  if (!value || !value.html) return;
  if (rendered) { try { sessionStorage.setItem("kaa.show", which); } catch {} location.reload(); return; }
  const data = extractData(value.html);
  const view = window.KAA_VIEW;
  const style = document.createElement("style"); style.textContent = view.css; document.head.appendChild(style);
  const root = $("albumRoot"); root.innerHTML = view.html; root.hidden = false; $("appHelp").hidden = true;
  view.start(data);
  rendered = true;
  shownKey = value.eTag || String(value.at);
  $("appNewBar").hidden = true; pending = null;
}
function describe(v) { return "PCで更新：" + fmt(v.modifiedAt || v.at) + "（" + mb(v.size || v.html.length) + "）"; }

/* ---------- ログイン ---------- */
async function startLogin(silent) {
  if (!clientReady()) { status("設定が未完了です（config.js のクライアントID）。", true); return; }
  if (!navigator.onLine) { status("オフラインのためログインできません。保存済みのアルバムをご覧ください。", true); return; }
  const verifier = random(), state = random();
  ls(K.pkce, JSON.stringify({verifier, state, silent: !!silent, t: Date.now()}));
  const p = new URLSearchParams({
    client_id: cfg.clientId, response_type: "code", redirect_uri: REDIRECT, response_mode: "query",
    scope: SCOPES, state, code_challenge: await sha256(verifier), code_challenge_method: "S256"
  });
  const hint = ls(K.hint);
  if (silent) { p.set("prompt", "none"); if (hint) p.set("login_hint", hint); }
  else if (hint) p.set("login_hint", hint); else p.set("prompt", "select_account");
  if (silent) ls(K.silentAt, String(Date.now()));
  location.assign(AUTHORITY + "/authorize?" + p);
}
function parseIdToken(t) {
  try { const part = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(decodeURIComponent(escape(atob(part)))); } catch { return {}; }
}
async function tokenRequest(body) {
  const res = await fetch(AUTHORITY + "/token", {method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body: new URLSearchParams(body)});
  let data = {}; try { data = await res.json(); } catch {}
  if (!res.ok) { const e = Error(data.error_description || data.error || ("HTTP " + res.status)); e.code = data.error || ""; throw e; }
  accessToken = data.access_token; expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  if (data.refresh_token) ls(K.refresh, data.refresh_token);
  if (data.id_token) { const c = parseIdToken(data.id_token); if (c.preferred_username) ls(K.hint, c.preferred_username); }
  ls(K.loggedOut, null);
}
// ログイン画面から戻ってきたときの処理。戻り値: "ok" | "none" | "needLogin"
async function handleCallback() {
  const q = new URLSearchParams(location.search);
  if (!q.has("code") && !q.has("error")) return "none";
  const raw = ls(K.pkce); ls(K.pkce, null);
  history.replaceState(null, "", REDIRECT);
  let saved = null; try { saved = raw && JSON.parse(raw); } catch {}
  if (q.has("error")) {
    const code = q.get("error");
    if (saved && saved.silent && /interaction_required|login_required|consent_required|account_selection_required/.test(code)) return "needLogin";
    throw Error(q.get("error_description") || code);
  }
  if (!saved || saved.state !== q.get("state")) throw Error("ログインの確認に失敗しました。もう一度ログインしてください。");
  await tokenRequest({client_id: cfg.clientId, grant_type: "authorization_code", code: q.get("code"),
    redirect_uri: REDIRECT, code_verifier: saved.verifier, scope: SCOPES});
  return "ok";
}
// 使えるアクセストークンを返す。どうしても無理なら null（自動再ログインに進んだ場合は "redirect"）
async function getToken(allowRedirect) {
  if (accessToken && Date.now() < expiresAt - 120000) return accessToken;
  const rt = ls(K.refresh);
  if (rt) {
    try { await tokenRequest({client_id: cfg.clientId, grant_type: "refresh_token", refresh_token: rt, scope: SCOPES}); return accessToken; }
    catch (e) { if (e.code === "invalid_grant" || e.code === "interaction_required") ls(K.refresh, null); else throw e; }
  }
  // 約24時間でログインが切れるため、前回のアカウントで画面操作なしの再ログインを試す（10分に1回まで）
  const last = Number(ls(K.silentAt) || 0);
  if (allowRedirect && ls(K.hint) && !ls(K.loggedOut) && Date.now() - last > 10 * 60 * 1000) { await startLogin(true); return "redirect"; }
  return null;
}

/* ---------- OneDriveから取得 ---------- */
async function graphGet(path, token) {
  return fetch(GRAPH + path, {headers: {Authorization: "Bearer " + token}, cache: "no-store"});
}
async function download(url, auth, expected) {
  const res = await fetch(url, auth ? {headers: {Authorization: "Bearer " + auth}, cache: "no-store"} : {cache: "no-store"});
  if (!res.ok) throw Error("ダウンロードに失敗しました（HTTP " + res.status + "）");
  const total = Number(res.headers.get("content-length")) || expected || 0;
  if (!res.body || !res.body.getReader) return res.text();
  const reader = res.body.getReader(); const chunks = []; let got = 0;
  for (;;) {
    const {done, value} = await reader.read(); if (done) break;
    chunks.push(value); got += value.length;
    if (total) { progress(got / total); status("最新のアルバムを取り込み中… " + Math.min(100, Math.round(got / total * 100)) + "%"); }
  }
  return new TextDecoder("utf-8").decode(await new Blob(chunks).arrayBuffer());
}
async function sync(reason) {
  if (syncing) return; if (!navigator.onLine) { status("オフラインです。端末に保存したアルバムを表示しています。", true); return; }
  syncing = true; $("appRefresh").disabled = true;
  try {
    status("OneDriveを確認中…");
    let token = await getToken(reason !== "manual-no-redirect");
    if (token === "redirect") return;
    if (!token) { setLoginButton(); status(shownKey ? "ログインが切れました。「ログイン」で最新に更新できます。" : "「ログイン」を押してください。", true); return; }
    const path = "/me/drive/root:/" + String(cfg.filePath).split("/").map(encodeURIComponent).join("/");
    let res = await graphGet(path, token);
    if (res.status === 401) { accessToken = ""; token = await getToken(true); if (!token || token === "redirect") return; res = await graphGet(path, token); }
    if (res.status === 404) throw Error("OneDriveに「スマホで見る.html」が見つかりません。config.js の場所を確認してください。");
    if (!res.ok) throw Error("OneDriveの確認に失敗しました（HTTP " + res.status + "）");
    const item = await res.json();
    const eTag = item.eTag || item.cTag || item.lastModifiedDateTime;
    const cur = await dbGet("latest");
    const now = Date.now();
    if (cur && cur.eTag === eTag) {
      await dbTouch(now);
      if (!shownKey || showingPrevious) display(cur);
      status("最新です（" + describe(cur) + "／確認 " + fmt(now) + "）");
      return;
    }
    let html;
    const dl = item["@microsoft.graph.downloadUrl"];
    try { html = dl ? await download(dl, null, item.size) : await download(GRAPH + path + ":/content", token, item.size); }
    catch (e) { if (!dl) throw e; html = await download(GRAPH + path + ":/content", token, item.size); }
    const head = html.slice(0, 2000).toLowerCase();
    let okFormat = head.includes("<!doctype html") || head.includes("<html");
    try { extractData(html); } catch { okFormat = false; }
    if (!okFormat) throw Error("取得したファイルがアルバムの形式ではありません。保存済みのアルバムはそのまま残しています。");
    const value = {html, at: now, checkedAt: now, eTag, modifiedAt: item.lastModifiedDateTime || "", size: item.size || html.length};
    await dbSaveNew(value);
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch {}
    if (!shownKey || reason === "launch" || reason === "login" || reason === "manual") { display(value); status("最新のアルバムを取り込みました（" + describe(value) + "）"); }
    else { pending = value; $("appNewBar").hidden = false; status("新しいアルバムを取り込みました。上の「表示する」で切り替えます。"); }
  } catch (err) {
    status("更新できませんでした：" + err.message + "\n保存済みのアルバムはそのまま見られます。", true);
  } finally {
    syncing = false; $("appRefresh").disabled = false; progress(null); setLoginButton();
  }
}

/* ---------- メニュー ---------- */
async function openMenu() {
  const cur = await dbGet("latest").catch(() => null), prev = await dbGet("previous").catch(() => null);
  let est = ""; try { const e = await navigator.storage.estimate(); est = "端末の使用量：" + mb(e.usage || 0); } catch {}
  let persisted = ""; try { persisted = (await navigator.storage.persisted()) ? "（削除されにくい保存）" : ""; } catch {}
  $("appInfo").textContent =
    "スマホ版 v" + (cfg.appVersion || "") + "\n" +
    (cur ? "表示中のデータ：" + describe(cur) + "\n最終確認：" + fmt(cur.checkedAt || cur.at) : "保存済みのアルバムはありません") + "\n" +
    (prev ? "ひとつ前のデータ：" + fmt(prev.modifiedAt || prev.at) : "ひとつ前のデータ：なし") + "\n" +
    "ログイン：" + (loggedIn() ? (ls(K.hint) || "済み") : "未ログイン") + "\n" + est + persisted;
  $("appInfo").style.whiteSpace = "pre-line";
  $("appRestore").disabled = !prev;
  $("appMenuPanel").hidden = false;
}

async function init() {
  $("appLogin").addEventListener("click", () => { ls(K.loggedOut, null); startLogin(false); });
  $("appRefresh").addEventListener("click", () => sync("manual"));
  $("appMenu").addEventListener("click", () => $("appMenuPanel").hidden ? openMenu() : ($("appMenuPanel").hidden = true));
  $("appCloseMenu").addEventListener("click", () => $("appMenuPanel").hidden = true);
  $("appShowNew").addEventListener("click", () => { if (pending) { display(pending); status("最新のアルバムを表示しています（" + describe(pending) + "）"); } });
  $("appRestore").addEventListener("click", async () => {
    const prev = await dbGet("previous"); if (!prev) return;
    $("appMenuPanel").hidden = true; display(prev, "previous");
  });
  $("appLogout").addEventListener("click", () => {
    accessToken = ""; expiresAt = 0; ls(K.refresh, null); ls(K.loggedOut, "1"); $("appMenuPanel").hidden = true; setLoginButton();
    status("ログアウトしました。端末に保存したアルバムは引き続き見られます。");
  });

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(e => console.warn(e));

  // 1) まず端末に保存済みのアルバムをすぐ表示（オフラインでも見られる）
  try {
    let which = ""; try { which = sessionStorage.getItem("kaa.show") || ""; sessionStorage.removeItem("kaa.show"); } catch {}
    const prev = which === "previous" ? await dbGet("previous") : null;
    if (prev) {
      display(prev); showingPrevious = true;
      status("ひとつ前のアルバムを表示中です（" + describe(prev) + "）。「更新」で最新に戻ります。", true);
      return wireResume();
    }
    const cached = await dbGet("latest");
    if (cached) { display(cached); status("保存済みのアルバムを表示中（" + describe(cached) + "）"); }
    else status("端末に保存されたアルバムはまだありません。");
  } catch (e) { status("端末の保存データを読めません：" + e.message, true); }

  // 2) ログイン画面から戻った直後なら、その処理
  let cb = "none";
  try { cb = await handleCallback(); }
  catch (e) { status("ログインできませんでした：" + e.message, true); }
  setLoginButton();
  if (cb === "needLogin") { status(shownKey ? "ログインが切れました。「ログイン」で最新に更新できます。" : "「ログイン」を押してください。", true); }
  else if (cb === "ok") await sync("login");
  else if (!clientReady()) status("設定が未完了です（config.js のクライアントID）。", true);
  else if (loggedIn() || (ls(K.hint) && !ls(K.loggedOut))) await sync("launch");
  else if (!shownKey) status("初回は「ログイン」を押してください。");

  wireResume();
}
// 3) アプリに戻ってきたとき・ネットに再接続したときにも確認
function wireResume() {
  let lastCheck = Date.now();
  const again = () => { if (document.hidden || !navigator.onLine || !loggedIn() || showingPrevious) return; if (Date.now() - lastCheck < 60000) return; lastCheck = Date.now(); sync("resume"); };
  document.addEventListener("visibilitychange", again);
  window.addEventListener("online", () => { lastCheck = 0; again(); });
  window.addEventListener("offline", () => status("オフラインになりました。保存済みのアルバムを表示しています。", true));
}
init();

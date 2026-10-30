/* Digital Journal — web app (v0.5)
   Plain JavaScript, no build step. Entries, photos, people and places live in this
   browser's IndexedDB; look settings live in localStorage.
   Works opened straight from a folder (file://) or from a web server. */
'use strict';
(() => {

  // ---------- Small helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, '0');
  const uid = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const words = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
  const num = (n) => n.toLocaleString();
  const plural = (n, one, many = one + 's') => `${num(n)} ${n === 1 ? one : many}`;
  const excerpt = (s, n = 220) => { s = (s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s; };
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const reducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ICON = {
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3.5c2 0 3.2 1 4.3 2.7l1.4 2.2c1.1 1.8 2.4 3.1 4.6 3.1H20M4 17h3.5c1.4 0 2.4-.5 3.2-1.3M13.3 8.3c.9-.8 2-1.3 3.5-1.3H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/></svg>',
    filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.4"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    story: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="10" rx="1.5"/><path d="M4 18h16M4 21h10"/></svg>',
    tilesS: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z"/></svg>',
    tilesM: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>',
    tilesL: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
  };

  // ---------- Vocabulary: moods, colors, stickers ----------
  const MOODS = [
    ['great', '😄', 'Great', '#F4C542'], ['excited', '🤩', 'Excited', '#F29E4C'], ['loved', '🥰', 'Loved', '#EC7FA9'],
    ['good', '🙂', 'Good', '#8CCB7E'], ['calm', '😌', 'Calm', '#7EC4CF'], ['okay', '😐', 'Okay', '#B9B9B0'],
    ['tired', '😴', 'Tired', '#9A9FD6'], ['low', '😔', 'Low', '#7A93C9'], ['sad', '😢', 'Sad', '#5B76B0'], ['angry', '😠', 'Angry', '#E06450'],
  ];
  const moodOf = (id) => MOODS.find((m) => m[0] === id);
  const TINTS = [
    ['mood', 'Follow mood', ''], ['none', 'No color', ''], ['rose', 'Rose', '#F2B8C6'], ['peach', 'Peach', '#F7C9A8'], ['butter', 'Butter', '#F3E3A1'],
    ['sage', 'Sage', '#BFD8B8'], ['sky', 'Sky', '#B9D6EE'], ['lilac', 'Lilac', '#D3C4EC'], ['sand', 'Sand', '#E3D3BC'],
  ];
  function tintColor(e) {
    const t = e.tint || 'mood';
    if (t === 'none') return '';
    if (t === 'mood') { const m = moodOf(e.mood); return m ? m[3] : ''; }
    const x = TINTS.find((k) => k[0] === t); return x ? x[2] : '';
  }
  const tintCls = (e) => (tintColor(e) ? ' tinted' : '');
  const tintStyle = (e) => { const c = tintColor(e); return c ? ` style="--tint:${c}"` : ''; };
  const STICKERS = ['⭐', '🌟', '✨', '🌸', '🌼', '🌻', '🍀', '🍂', '🍁', '❄️', '☀️', '🌙', '🌈', '☁️', '❤️', '💛', '💙', '💚', '🎉', '🎈', '🎂', '🍰', '☕', '🍵', '🍜', '🍕', '📚', '✏️', '🎓', '📷', '🎵', '🎧', '✈️', '🚗', '🏠', '📍', '🐱', '🐶', '🦋', '🌊', '⛰️', '🏖️', '💌', '🎁', '👍', '😂', '🥹', '💯'];

  // ---------- Settings ----------
  const THEMES = [
    ['auto', 'Auto (light & dark)'], ['seasonal', 'Seasonal (auto)'], ['fog', 'Fog'], ['paper', 'Paper'], ['sepia', 'Vintage'], ['sakura', 'Sakura'], ['lavender', 'Lavender'],
    ['ocean', 'Ocean'], ['forest', 'Forest'], ['mint', 'Mint'], ['sunset', 'Sunset'], ['spring', 'Spring'], ['summer', 'Summer'],
    ['autumn', 'Autumn'], ['winter', 'Winter'], ['midnight', 'Midnight'], ['charcoal', 'Charcoal'], ['plum', 'Plum night'],
  ];
  const FONTS = [
    ['classic', 'Classic'], ['elegant', 'Elegant'], ['hand', 'Handwritten'], ['script', 'Script'], ['typewriter', 'Typewriter'],
    ['notebook', 'Notebook'], ['display', 'Magazine'], ['retro', 'Retro'], ['clean', 'Clean'],
  ];
  const fontName = (id) => (FONTS.find((f) => f[0] === id) || FONTS[0])[1];
  const VIEWS = [['story', 'Story', ICON.story], ['s', 'Small tiles', ICON.tilesS], ['m', 'Medium tiles', ICON.tilesM], ['l', 'Large tiles', ICON.tilesL]];
  const SETTINGS_KEY = 'dj-settings';
  const DEFAULTS = { theme: 'fog', titleFont: 'classic', view: 'story', interval: 8, name: '', paper: 'plain', frame: 'none', stamp: 'film', dropcap: true, calMode: 'photos', photoQuality: 'balanced', autoBackup: 0, backupKeep: 5, backupToFolder: false, backupToDrive: false, lastAutoBackup: 0, autoCheckPhone: true, autoLight: 'fog', autoDark: 'midnight', autolock: 5, backupEvery: 14, lastBackup: 0, backupSnooze: 0, firstUse: 0 };
  let settings = { ...DEFAULTS };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (_) { /* storage blocked */ }
  const season = () => { const m = new Date().getMonth(); return m < 2 || m === 11 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn'; };
  const prefersDark = () => !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  const resolveName = (t) => (t === 'seasonal' ? season() : t);
  const resolvedTheme = () => (settings.theme === 'auto' ? resolveName(prefersDark() ? settings.autoDark : settings.autoLight) : resolveName(settings.theme));
  if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applySettings()); } catch (_) { /* old browsers */ } }
  function saveSettings(patch) {
    Object.assign(settings, patch);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) { /* ignore */ }
    applySettings();
  }
  function applySettings() {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme();
    [...root.classList].filter((c) => c.startsWith('tf-')).forEach((c) => root.classList.remove(c));
    root.classList.add('tf-' + settings.titleFont);
    const rl = $('.rail-lock'); if (rl) rl.hidden = !lockInfoSafe();
    root.dataset.paper = settings.paper;
    root.dataset.frame = settings.frame;
    root.dataset.dropcap = settings.dropcap ? 'on' : 'off';
    const bg = getComputedStyle(root).getPropertyValue('--fog').trim();
    const meta = $('meta[name="theme-color"]');
    if (meta && bg) meta.content = bg;
  }

  function lockInfoSafe() { try { return !!localStorage.getItem('dj-lock'); } catch (_) { return false; } }

  // ---------- Dates (always local, stored as YYYY-MM-DD) ----------
  const D = {
    fmt: (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    today: () => D.fmt(new Date()),
    parse: (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); },
    ym: (s) => s.slice(0, 7),
    monthName: (ym, opts = { month: 'long', year: 'numeric' }) => D.parse(ym + '-01').toLocaleDateString(undefined, opts),
    long: (s) => D.parse(s).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    dayLine: (s) => D.parse(s).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    short: (s) => D.parse(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    tiny: (s) => D.parse(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    medium: (s) => D.parse(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    monthDay: (s) => D.parse(s).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }),
    weekday: (s) => D.parse(s).toLocaleDateString(undefined, { weekday: 'long' }),
    daysIn: (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); },
    addMonths: (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; },
    valid: (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || ''),
    ago: (s) => {
      const days = Math.round((D.parse(D.today()) - D.parse(s)) / 86400000);
      if (days <= 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 14) return `${days} days ago`;
      if (days < 60) return `${Math.round(days / 7)} weeks ago`;
      if (days < 365) { const m = Math.round(days / 30.4); return m <= 1 ? 'A month ago' : `${m} months ago`; }
      const y = Math.floor(days / 365.25);
      return y <= 1 ? 'A year ago' : `${y} years ago`;
    },
  };

  // ---------- Date stamp: film camera (7-segment), rubber stamp, or handwritten ----------
  const SEG = { a: [2, 0, 6, 2], b: [8, 2, 2, 7], c: [8, 11, 2, 7], d: [2, 18, 6, 2], e: [0, 11, 2, 7], f: [0, 2, 2, 7], g: [2, 9, 6, 2] };
  const DIGITS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
  function stamp(date, cls = '', style = settings.stamp) {
    const label = esc(D.long(date));
    if (style === 'rubber') {
      const d = D.parse(date);
      const txt = `${pad(d.getDate())} ${d.toLocaleDateString(undefined, { month: 'short' }).replace('.', '').toUpperCase()} ${d.getFullYear()}`;
      return `<span class="stamp dstamp rubber ${cls}" role="img" aria-label="${label}">${esc(txt)}</span>`;
    }
    if (style === 'hand') return `<span class="stamp dstamp hand ${cls}" role="img" aria-label="${label}">${esc(D.medium(date))}</span>`;
    const [y, m, d] = date.split('-');
    const text = `'${y.slice(2)} ${m} ${d}`;
    let x = 0, out = '';
    for (const ch of text) {
      if (ch === ' ') { x += 7; continue; }
      if (ch === "'") { out += `<rect x="${x}" y="0" width="2" height="5" rx=".8"/>`; x += 5; continue; }
      for (const s of DIGITS[+ch]) { const [sx, sy, w, h] = SEG[s]; out += `<rect x="${x + sx}" y="${sy}" width="${w}" height="${h}" rx=".8"/>`; }
      x += 13;
    }
    return `<svg class="stamp ${cls}" viewBox="-4 -1 ${x + 4} 22" role="img" aria-label="${label}"><g transform="skewX(-7)">${out}</g></svg>`;
  }

  // Entry title in its chosen font (or the default font when none is chosen)
  const tfClass = (e) => (e && e.titleFont ? ' tf-' + e.titleFont : '');
  const titleHTML = (e, tag = 'h3', cls = '', text = null) => `<${tag} class="title-text${tfClass(e)}${cls ? ' ' + cls : ''}">${esc(text ?? e.title)}</${tag}>`;
  // Polaroid captions look best handwritten, unless the entry has its own font
  const pcapTitle = (e, text) => `<span class="title-text ${e.titleFont ? 'tf-' + e.titleFont : 'tf-hand'}">${esc(text)}</span>`;
  const moodBadge = (e) => { const m = moodOf(e.mood); return m ? `<span class="mood-badge" style="--mc:${m[3]}"><span class="mood-e">${m[1]}</span>${m[2]}</span>` : ''; };
  const moodEmoji = (e) => { const m = moodOf(e.mood); return m ? `<span class="mood-e" role="img" aria-label="Mood: ${m[2]}">${m[1]}</span>` : ''; };

  // ---------- Encryption (passcode lock) ----------
  // When a passcode is set, every entry, photo, person, place and tag is encrypted with AES-GCM.
  // The encryption key is itself encrypted with a key made from your passcode (PBKDF2, 310,000 rounds),
  // so the passcode is never stored. Forgetting it means restoring from a backup.
  const CRYPT = { key: null };
  const LOCK_KEY = 'dj-lock';
  const te = new TextEncoder(), td = new TextDecoder();
  const lockInfo = () => { try { return JSON.parse(localStorage.getItem(LOCK_KEY) || 'null'); } catch (_) { return null; } };
  const lockOn = () => !!lockInfo();
  function b64(u8) {
    u8 = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const unb64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  async function encBytes(bytes, key = CRYPT.key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
    const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
  }
  async function decBytes(u8, key = CRYPT.key) {
    u8 = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8.subarray(0, 12) }, key, u8.subarray(12)));
  }
  const encJSON = async (obj, key) => encBytes(te.encode(JSON.stringify(obj)), key);
  const decJSON = async (u8, key) => JSON.parse(td.decode(await decBytes(u8, key)));
  const encBlob = async (blob) => (blob ? new Blob([await encBytes(new Uint8Array(await blob.arrayBuffer()))]) : null);
  const decBlob = async (blob, type) => (blob ? new Blob([await decBytes(new Uint8Array(await blob.arrayBuffer()))], { type: type || 'application/octet-stream' }) : null);
  async function deriveKEK(pass, salt, iter) {
    const base = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function wrapKey(pass, raw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iter = 310000;
    const kek = await deriveKEK(pass, salt, iter);
    const wrapped = await encBytes(raw, kek);
    return { v: 1, salt: b64(salt), iter, wrapped: b64(wrapped) };
  }
  // Returns { key, raw } or throws if the passcode is wrong
  async function unwrapKey(pass, info) {
    const kek = await deriveKEK(pass, unb64(info.salt), info.iter);
    const raw = await decBytes(unb64(info.wrapped), kek);
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    return { key, raw };
  }
  const SEAL = {
    json: {
      seal: async (r) => ({ id: r.id, sealed: await encJSON(r) }),
      open: async (r) => decJSON(r.sealed),
    },
    people: {
      seal: async (r) => { const { photo, ...rest } = r; return { id: r.id, sealed: await encJSON({ ...rest, photoType: photo ? photo.type : '' }), photo: await encBlob(photo) }; },
      open: async (r) => { const m = await decJSON(r.sealed); const photo = await decBlob(r.photo, m.photoType); delete m.photoType; return { ...m, photo }; },
    },
    photos: {
      seal: async (r) => {
        const { blob, md, thumb, ...meta } = r;
        return { id: r.id, entryId: r.entryId, sealed: await encJSON({ ...meta, types: [blob && blob.type, md && md.type, thumb && thumb.type] }),
          blob: await encBlob(blob), md: await encBlob(md), thumb: await encBlob(thumb) };
      },
      open: async (r) => {
        const m = await decJSON(r.sealed); const [bt, mt, tt] = m.types || []; delete m.types;
        return { ...m, blob: await decBlob(r.blob, bt), md: await decBlob(r.md, mt), thumb: await decBlob(r.thumb, tt) };
      },
    },
  };
  const sealerFor = (store) => SEAL[store] || SEAL.json;
  const seal = async (store, rec) => (CRYPT.key && rec ? sealerFor(store).seal(rec) : rec);
  const unseal = async (store, rec) => {
    if (!rec || !rec.sealed) return rec;
    if (!CRYPT.key) throw new Error('locked');
    return sealerFor(store).open(rec);
  };

  // ---------- Storage (IndexedDB) ----------
  const DB = (() => {
    let dbp;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('digital-journal', 3);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'id' }).createIndex('date', 'date');
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' }).createIndex('entryId', 'entryId');
        if (!db.objectStoreNames.contains('people')) db.createObjectStore('people', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('places')) db.createObjectStore('places', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tags')) db.createObjectStore('tags', { keyPath: 'id' });
      };
      r.onblocked = () => toast('Close other tabs with the journal open, then reload this page.', 6000);
      r.onsuccess = () => { const db = r.result; db.onversionchange = () => db.close(); res(db); };
      r.onerror = () => rej(r.error);
    }));
    const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    async function tx(stores, mode, fn) {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction(stores, mode);
        let out;
        Promise.resolve(fn(t)).then((v) => { out = v; }, rej);
        t.oncomplete = () => res(out);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error || new Error('Transaction aborted'));
      });
    }
    const rawAll = (store) => tx([store], 'readonly', (t) => req(t.objectStore(store).getAll()));
    const rawGet = (store, id) => tx([store], 'readonly', (t) => req(t.objectStore(store).get(id)));
    const rawPut = (store, rec) => tx([store], 'readwrite', (t) => { t.objectStore(store).put(rec); });
    const keys = (store) => tx([store], 'readonly', (t) => req(t.objectStore(store).getAllKeys()));
    const all = async (store) => Promise.all((await rawAll(store)).map((r) => unseal(store, r)));
    return {
      open, keys, rawGet, rawPut,
      close: async () => { if (dbp) { (await dbp).close(); dbp = null; } },
      draftPhotoIds: () => tx(['photos'], 'readonly', (t) => req(t.objectStore('photos').index('entryId').getAllKeys(IDBKeyRange.only('__draft__')))),
      allEntries: () => all('entries'),
      allPhotos: () => all('photos'),
      allPeople: () => all('people'),
      allPlaces: () => all('places'),
      allTags: () => all('tags'),
      getPhoto: async (id) => unseal('photos', await rawGet('photos', id)),
      putPhoto: async (rec) => rawPut('photos', await seal('photos', rec)),
      put: async (store, rec) => rawPut(store, await seal(store, rec)),
      putEntries: async (list) => { const s = await Promise.all(list.map((e) => seal('entries', e))); return tx(['entries'], 'readwrite', (t) => { s.forEach((e) => t.objectStore('entries').put(e)); }); },
      del: (store, id) => tx([store], 'readwrite', (t) => { t.objectStore(store).delete(id); }),
      saveEntry: async (entry, newPhotos, removedIds) => {
        const e = await seal('entries', entry);
        const ps = await Promise.all(newPhotos.map((p) => seal('photos', { ...p, entryId: entry.id })));
        return tx(['entries', 'photos'], 'readwrite', (t) => {
          t.objectStore('entries').put(e);
          ps.forEach((p) => t.objectStore('photos').put(p));
          removedIds.forEach((id) => t.objectStore('photos').delete(id));
        });
      },
      deleteEntry: (entry) => tx(['entries', 'photos'], 'readwrite', (t) => {
        t.objectStore('entries').delete(entry.id);
        [...entry.photoIds, ...(entry.assetIds || []), ...(entry.mediaIds || [])].forEach((id) => t.objectStore('photos').delete(id));
      }),
      putMany: async (data) => {
        const S = {};
        for (const store of ['entries', 'people', 'places', 'tags']) S[store] = await Promise.all((data[store] || []).map((r) => seal(store, r)));
        await tx(['entries', 'people', 'places', 'tags'], 'readwrite', (t) => { for (const store in S) S[store].forEach((r) => t.objectStore(store).put(r)); });
        // Photos one at a time so a big import doesn't hold everything twice in memory
        for (const p of data.photos || []) await rawPut('photos', await seal('photos', p));
      },
    };
  })();
  // Re-write every record encrypted (turning the lock on) or in the clear (turning it off)
  async function recryptAll(toKey, progress) {
    const fromKey = CRYPT.key;
    for (const store of ['entries', 'people', 'places', 'tags', 'photos']) {
      const ids = await DB.keys(store);
      let i = 0;
      for (const id of ids) {
        CRYPT.key = fromKey;
        const plain = await unseal(store, await DB.rawGet(store, id));
        CRYPT.key = toKey;
        await DB.rawPut(store, await seal(store, plain));
        if (store === 'photos' && progress && ++i % 5 === 0) progress(i, ids.length);
      }
    }
    CRYPT.key = toKey;
  }

  // ---------- Images ----------
  // Each photo is kept in three sizes: full (up to 2560 px) for the viewer and big displays,
  // md (1280 px) for feed cards and tiles, thumb (600 px) for the calendar and small tiles.
  // The work is done in core.js (shared with the phone app): WebP where possible, adaptive quality,
  // high-quality downscaling. The photo-quality setting picks Best, Balanced or Smallest.
  const decode = DJ.decode, shrink = DJ.shrink;
  const processImage = (file) => DJ.processImage(file, settings.photoQuality || 'balanced');
  // Photos saved by v0.1 have no medium size: make it once, from the full image, and keep it.
  let mdRunning = 0; const mdQueue = [];
  const mdSlot = () => new Promise((res) => { if (mdRunning < 2) { mdRunning++; res(); } else mdQueue.push(res); });
  const mdDone = () => { const next = mdQueue.shift(); if (next) next(); else mdRunning--; };
  async function ensureMd(rec) {
    if (rec.md) return rec.md;
    await mdSlot();
    try {
      rec.md = await DJ.makeSize(rec.blob, 'md', settings.photoQuality || 'balanced');
      DB.putPhoto(rec).catch(() => {});
      return rec.md;
    } catch (_) { return rec.blob; } finally { mdDone(); }
  }

  const urlCache = new Map();
  function photoURL(id, kind = 'thumb') {
    const key = id + ':' + kind;
    if (!urlCache.has(key)) {
      urlCache.set(key, DB.getPhoto(id).then(async (rec) => {
        if (!rec) return '';
        const blob = kind === 'full' ? rec.blob : kind === 'md' ? await ensureMd(rec) : rec.thumb;
        return URL.createObjectURL(blob);
      }));
    }
    return urlCache.get(key);
  }
  function forgetPhoto(id) {
    for (const kind of ['thumb', 'md', 'full']) {
      const key = id + ':' + kind, p = urlCache.get(key);
      if (p) { p.then((u) => u && URL.revokeObjectURL(u)); urlCache.delete(key); }
    }
  }
  async function fillImg(img, attr = 'photo') {
    const u = await photoURL(img.dataset[attr], img.dataset.kind || 'thumb');
    if (!u) return;
    img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
    img.src = u;
  }
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((list) => list.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); fillImg(en.target); } }), { rootMargin: '600px 0px' })
    : null;
  function hydrate(root) { $$('img[data-photo]', root).forEach((img) => io ? io.observe(img) : fillImg(img)); }
  const imgTag = (id, kind = 'thumb', alt = '') => `<img data-photo="${esc(id)}" data-kind="${kind}" alt="${esc(alt)}" decoding="async">`;

  // ---------- App state ----------
  let entries = [];           // all entry records (no image data), newest first
  let people = [];            // { id, name, photo: Blob|null, createdAt }
  let places = [];            // { id, name, addr, lat, lng, link, createdAt }
  const avatarURL = new Map();
  const state = { query: '', lastRoute: '', navCount: 0, homePerson: null, homePlace: null };
  const view = $('#view');

  const norm = (e) => ({
    ...e, title: e.title || '', text: e.text || '', titleFont: e.titleFont || '', mood: e.mood || '', tint: e.tint || 'mood',
    photoIds: Array.isArray(e.photoIds) ? e.photoIds : [], peopleIds: Array.isArray(e.peopleIds) ? e.peopleIds : [],
    placeId: e.placeId || '', stickers: Array.isArray(e.stickers) ? e.stickers : [],
    tags: Array.isArray(e.tags) ? e.tags : [], fav: !!e.fav, pinned: !!e.pinned, capsule: e.capsule || '',
    assetIds: Array.isArray(e.assetIds) ? e.assetIds : [], mediaIds: Array.isArray(e.mediaIds) ? e.mediaIds : [],
    song: e.song && e.song.title ? { title: e.song.title, artist: e.song.artist || '', link: e.song.link || '' } : null, layout: e.layout && Array.isArray(e.layout.items) ? e.layout : null,
  });
  const sortEntries = () => entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
  const byId = (id) => entries.find((e) => e.id === id);
  const personById = (id) => people.find((p) => p.id === id);
  const placeById = (id) => places.find((p) => p.id === id);
  function byDate() {
    const m = new Map();
    for (const e of [...entries].reverse()) { if (!m.has(e.date)) m.set(e.date, []); m.get(e.date).push(e); }
    return m; // each day's list is oldest → newest
  }
  const dayMood = (list) => { for (let i = list.length - 1; i >= 0; i--) { const m = moodOf(list[i].mood); if (m) return m; } return null; };
  function longestRun(dates) {
    const arr = [...new Set(dates)].sort();
    let best = 0, cur = 0, prev = null;
    for (const s of arr) {
      const t = D.parse(s).getTime();
      cur = (prev !== null && Math.round((t - prev) / 86400000) === 1) ? cur + 1 : 1;
      best = Math.max(best, cur); prev = t;
    }
    return best;
  }
  function stats(list) {
    return {
      entries: list.length,
      days: new Set(list.map((e) => e.date)).size,
      photos: list.reduce((n, e) => n + e.photoIds.length, 0),
      words: list.reduce((n, e) => n + words(e.text) + words(e.title), 0),
      run: longestRun(list.map((e) => e.date)),
    };
  }
  const photosOf = (list) => list.flatMap((e) => e.photoIds.map((id) => ({ id, date: e.date, entryId: e.id })));
  function moodCounts(list) {
    const c = new Map();
    list.forEach((e) => { if (moodOf(e.mood)) c.set(e.mood, (c.get(e.mood) || 0) + 1); });
    return [...c].sort((a, b) => b[1] - a[1]).map(([id, n]) => [moodOf(id), n]);
  }
  const personEntries = (id) => entries.filter((e) => e.peopleIds.includes(id));
  const placeEntries = (id) => entries.filter((e) => e.placeId === id);

  // ---------- People & places helpers ----------
  function setAvatar(p) {
    if (avatarURL.has(p.id)) { URL.revokeObjectURL(avatarURL.get(p.id)); avatarURL.delete(p.id); }
    if (p.photo) avatarURL.set(p.id, URL.createObjectURL(p.photo));
  }
  const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  function avatarHTML(p, size = '') {
    if (!p) return '';
    const u = avatarURL.get(p.id);
    return `<span class="avatar ${size}" aria-hidden="true">${u ? `<img src="${u}" alt="">` : esc(initials(p.name))}</span>`;
  }
  function parseAddr(str) {
    const s = (str || '').trim();
    const out = { addr: s, lat: null, lng: null, link: '' };
    if (!s) return out;
    const coord = s.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (coord) { out.lat = +coord[1]; out.lng = +coord[2]; return out; }
    if (/^https?:\/\//i.test(s)) {
      out.link = s;
      const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (at) { out.lat = +at[1]; out.lng = +at[2]; }
      else {
        try {
          const u = new URL(s);
          const q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('destination');
          if (q) { const c2 = q.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/); if (c2) { out.lat = +c2[1]; out.lng = +c2[2]; } else out.addr = q; }
          else { const m = u.pathname.match(/\/maps\/place\/([^/]+)/); if (m) out.addr = decodeURIComponent(m[1].replace(/\+/g, ' ')); }
        } catch (_) { /* not a URL after all */ }
      }
    }
    return out;
  }
  function placeQuery(pl) {
    if (pl.lat != null && pl.lng != null) return `${pl.lat},${pl.lng}`;
    if (pl.addr && !/^https?:\/\//i.test(pl.addr)) return pl.addr;
    return pl.name;
  }
  const mapEmbed = (pl) => `<iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map of ${esc(pl.name)}" src="https://maps.google.com/maps?q=${encodeURIComponent(placeQuery(pl))}&z=15&output=embed"></iframe>`;
  const mapLink = (pl) => pl.link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery(pl))}`;
  const placeSub = (pl) => (pl.addr && !/^https?:\/\//i.test(pl.addr) ? pl.addr : pl.lat != null ? `${pl.lat.toFixed(4)}, ${pl.lng.toFixed(4)}` : pl.link ? 'Google Maps link' : '');

  // ---------- Router ----------
  let fxEl = null;
  function route() {
    stopHero();
    endPageEdit();
    if (fxEl) { fxEl.remove(); fxEl = null; }
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    let name = parts[0] || 'home';
    if (name === 'backup') name = 'settings';
    const arg = parts[1];
    const navFor = { book: 'journal', print: 'journal', day: 'calendar', entry: 'journal', person: 'people', place: 'people', tag: 'people', map: 'people' };
    if (mapObj && name !== 'map') { mapObj.remove(); mapObj = null; }
    $$('.nav-link').forEach((a) => {
      if (a.dataset.nav === (navFor[name] || name)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const sameRoute = location.hash === state.lastRoute;
    state.lastRoute = location.hash;
    const y = window.scrollY;
    switch (name) {
      case 'journal': renderJournal(); break;
      case 'calendar': renderCalendar(arg && /^\d{4}-\d{2}$/.test(arg) ? arg : D.ym(D.today())); break;
      case 'recap': renderRecap(arg); break;
      case 'day': case 'entry': break;
      case 'people': renderPeople(); break;
      case 'person': renderPerson(arg); break;
      case 'place': renderPlace(arg); break;
      case 'settings': renderSettings(); break;
      case 'tag': renderTag(arg); break;
      case 'map': renderMap(); break;
      case 'book': renderBook(); break;
      case 'print': renderPrint(arg); break;
      case 'help': renderHelp(arg); break;
      default: renderHome();
    }
    const done = () => {
      hydrate(view);
      window.scrollTo(0, sameRoute ? y : 0);
      document.title = (view.dataset.title ? view.dataset.title + ' — ' : '') + 'Digital Journal';
      fitAll();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitAll());
    };
    if (name === 'entry' || name === 'day') {
      if (name === 'entry' && !sameRoute) view.innerHTML = '';
      Promise.resolve(name === 'entry' ? renderEntry(arg) : renderDay(arg)).then(done);
    } else done();
  }
  window.addEventListener('resize', () => { if (!pe.on) fitAll(); });
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function back() { if (state.navCount > 0) history.back(); else go('#/journal'); }
  window.addEventListener('hashchange', () => { state.navCount++; route(); });

  const emptyHTML = () => `<div class="page"><div class="empty">
      ${stamp(D.today())}
      <h2>Start your journal</h2>
      <p>Add a photo and a few lines about today. Entries show up in your journal, on the calendar, in your recaps, and as memories on the home page.</p>
      <div class="row-tight"><button class="btn btn-primary" data-action="new">Write today’s entry</button><button class="btn btn-line" data-action="quick">${ICON.camera}Snap &amp; save</button></div>
    </div></div>`;

  // ---------- Home ----------
  const hero = { timer: null, i: 0, n: 0, paused: false, el: null };
  function stopHero() { clearTimeout(hero.timer); hero.timer = null; hero.el = null; }

  function greeting() {
    const h = new Date().getHours();
    const g = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return settings.name ? `${g}, ${settings.name}` : g;
  }
  function memCard(e, ago = false) {
    const cover = e.photoIds[0];
    return `<a class="mem${tintCls(e)}" href="#/entry/${e.id}"${tintStyle(e)}>
      ${cover ? `<div class="ph">${imgTag(cover, 'md')}</div>` : ''}
      <div class="mb">${cover ? '' : stamp(e.date, 'stamp-paper')}
        ${ago ? `<p class="ago">${esc(D.ago(e.date))}</p>` : ''}
        <p class="md">${esc(ago ? D.long(e.date) : D.dayLine(e.date))} ${moodEmoji(e)}</p>
        ${e.title ? titleHTML(e, 'h3') : ''}
        ${e.text ? `<p>${esc(excerpt(e.text, 140))}</p>` : ''}
      </div></a>`;
  }
  function buildSlides() {
    const pool = entries.filter((e) => e.photoIds.length);
    const withPhotos = shuffle([...pool, ...pool.filter((e) => e.fav)]).filter((e, i, a) => a.indexOf(e) === i).slice(0, 40)
      .map((e) => ({ type: 'photo', e, photo: pick(e.photoIds) }));
    const quotes = shuffle(entries.filter((e) => !e.photoIds.length && e.text.trim()))
      .slice(0, withPhotos.length ? Math.max(1, Math.floor(withPhotos.length / 4)) : 12)
      .map((e) => ({ type: 'quote', e }));
    const out = [];
    let q = 0;
    withPhotos.forEach((s, i) => { out.push(s); if ((i + 1) % 4 === 0 && q < quotes.length) out.push(quotes[q++]); });
    while (q < quotes.length && (!withPhotos.length || out.length < 3)) out.push(quotes[q++]);
    return out;
  }
  function slideHTML(s, i) {
    const e = s.e;
    const ago = D.ago(e.date);
    const when = ago === 'Today' || ago === 'Yesterday' ? ago : `${ago}, on a ${D.weekday(e.date)}`;
    const m = moodOf(e.mood);
    if (s.type === 'quote') {
      return `<a class="slide quote${tintCls(e)}" href="#/entry/${e.id}" data-i="${i}"${tintStyle(e)} aria-label="${esc((e.title || 'Entry') + ', ' + D.long(e.date))}">
        <div class="q">${stamp(e.date, 'stamp-paper')}<blockquote>“${esc(excerpt(e.text, 220))}”</blockquote>
          ${e.title ? titleHTML(e, 'p') : `<p class="title-text">${esc(when)}</p>`}</div></a>`;
    }
    const title = e.title || excerpt(e.text, 70);
    return `<a class="slide" href="#/entry/${e.id}" data-i="${i}" aria-label="${esc((title || 'Memory') + ', ' + D.long(e.date))}">
      <img class="bg" data-hero="${esc(s.photo)}" data-kind="thumb" alt="">
      <img class="fg" data-hero="${esc(s.photo)}" data-kind="full" alt="">
      <span class="shade"></span>
      <div class="info">${stamp(e.date)}${title ? titleHTML(e, 'h2', '', title) : ''}<p class="when">${esc(when)}${m ? ` ${m[1]}` : ''}</p></div></a>`;
  }
  function heroHTML() {
    const slides = buildSlides();
    hero.n = slides.length; hero.i = 0;
    if (!slides.length) {
      return `<section class="hero hero-empty"><div><h2>Your memories will play here</h2>
        <p>Add photos to your entries and they’ll appear here as a slideshow of random moments.</p>
        <button class="btn btn-primary" data-action="new">Write an entry</button></div></section>`;
    }
    return `<section class="hero ${hero.paused ? 'paused' : ''}" id="hero" aria-roledescription="carousel" aria-label="Memories">
        ${slides.map(slideHTML).join('')}
        <div class="hero-ctrl">
          <button type="button" data-hero-act="shuffle" aria-label="Shuffle memories" title="Shuffle">${ICON.shuffle}</button>
          ${slides.length > 1 ? `<button type="button" data-hero-act="prev" aria-label="Previous memory">${ICON.left}</button>
          <button type="button" data-hero-act="pause" aria-label="${hero.paused ? 'Play slideshow' : 'Pause slideshow'}">${hero.paused ? ICON.play : ICON.pause}</button>
          <button type="button" data-hero-act="next" aria-label="Next memory">${ICON.right}</button>` : ''}
        </div>
        <div class="hero-progress" aria-hidden="true"><span style="--dur:${settings.interval}s"></span></div>
      </section>`;
  }
  function heroInit() {
    hero.el = $('#hero');
    if (!hero.el || !hero.n) return;
    heroShow(0);
    let tx = null;
    hero.el.addEventListener('touchstart', (ev) => { tx = ev.touches[0].clientX; }, { passive: true });
    hero.el.addEventListener('touchend', (ev) => {
      if (tx == null) return;
      const dx = ev.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) { ev.preventDefault(); heroShow(hero.i + (dx < 0 ? 1 : -1)); }
    });
  }
  function heroLoad(i) {
    if (!hero.el) return;
    const slide = hero.el.querySelector(`.slide[data-i="${(i + hero.n) % hero.n}"]`);
    if (slide) $$('img[data-hero]', slide).forEach((img) => { if (!img.src) fillImg(img, 'hero'); });
  }
  function heroShow(i) {
    if (!hero.el || !hero.n) return;
    hero.i = (i + hero.n) % hero.n;
    $$('.slide', hero.el).forEach((s) => s.classList.toggle('on', Number(s.dataset.i) === hero.i));
    heroLoad(hero.i); heroLoad(hero.i + 1);
    const bar = $('.hero-progress span', hero.el);
    if (bar) { bar.classList.remove('run'); void bar.offsetWidth; if (hero.n > 1) bar.classList.add('run'); }
    heroSchedule();
  }
  function heroSchedule() {
    clearTimeout(hero.timer);
    if (!hero.el || hero.paused || hero.n < 2 || document.hidden) return;
    hero.timer = setTimeout(() => heroShow(hero.i + 1), settings.interval * 1000);
  }
  function heroPause(p) {
    hero.paused = p;
    if (!hero.el) return;
    hero.el.classList.toggle('paused', p);
    const b = $('[data-hero-act="pause"]', hero.el);
    if (b) { b.innerHTML = p ? ICON.play : ICON.pause; b.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow'); }
    if (p) clearTimeout(hero.timer); else heroShow(hero.i);
  }
  function heroShuffle() {
    if (!hero.el) return;
    clearTimeout(hero.timer);
    hero.el.outerHTML = heroHTML();
    heroInit();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(hero.timer); else if (hero.el) heroShow(hero.i); });

  // Entries from the days around today's date in past years (exact date excluded; that's "On this day")
  function weekInPastYears(today) {
    const t = D.parse(today), year = t.getFullYear();
    const out = [];
    for (const e of entries) {
      const ey = Number(e.date.slice(0, 4));
      if (ey >= year) continue;
      const [, m, d] = e.date.split('-').map(Number);
      let best = Infinity;
      for (const yy of [year - 1, year, year + 1]) best = Math.min(best, Math.abs(Math.round((new Date(yy, m - 1, d) - t) / 86400000)));
      if (best >= 1 && best <= 3) out.push(e);
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  }
  function withPersonHTML(excludeId = null) {
    const cands = people.filter((p) => personEntries(p.id).length);
    if (!cands.length) return '';
    let p = personById(state.homePerson);
    if (!p || !cands.includes(p) || excludeId) p = pick(cands.length > 1 && excludeId ? cands.filter((c) => c.id !== excludeId) : cands);
    state.homePerson = p.id;
    const list = shuffle(personEntries(p.id)).slice(0, 6);
    return `<header><h2 class="with">${avatarHTML(p, 'md')}Memories with ${esc(p.name)}</h2>
        <div class="acts">${cands.length > 1 ? `<button class="linkbtn" data-home-shuffle="person">Someone else</button>` : `<button class="linkbtn" data-home-shuffle="person">Shuffle</button>`}<a class="link" href="#/person/${p.id}">See all</a></div></header>
      <div class="mem-row">${list.map((e) => memCard(e)).join('')}</div>`;
  }
  function atPlaceHTML(excludeId = null) {
    const cands = places.filter((p) => placeEntries(p.id).length);
    if (!cands.length) return '';
    let p = placeById(state.homePlace);
    if (!p || !cands.includes(p) || excludeId) p = pick(cands.length > 1 && excludeId ? cands.filter((c) => c.id !== excludeId) : cands);
    state.homePlace = p.id;
    const list = shuffle(placeEntries(p.id)).slice(0, 6);
    return `<header><h2 class="with"><span class="avatar md" style="color:var(--sea)">${ICON.pin}</span>Memories at ${esc(p.name)}</h2>
        <div class="acts">${cands.length > 1 ? `<button class="linkbtn" data-home-shuffle="place">Another place</button>` : `<button class="linkbtn" data-home-shuffle="place">Shuffle</button>`}<a class="link" href="#/place/${p.id}">See all</a></div></header>
      <div class="mem-row">${list.map((e) => memCard(e)).join('')}</div>`;
  }
  function seasonFx() {
    const th = resolvedTheme();
    if (reducedMotion() || (th !== 'winter' && th !== 'autumn')) return;
    fxEl = document.createElement('div');
    fxEl.className = 'season-fx' + (th === 'autumn' ? ' leaves' : '');
    fxEl.setAttribute('aria-hidden', 'true');
    const n = th === 'winter' ? 28 : 9;
    let h = '';
    for (let i = 0; i < n; i++) {
      const sz = th === 'winter' ? (3 + Math.random() * 5).toFixed(1) + 'px' : (14 + Math.random() * 10).toFixed(0) + 'px';
      h += `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--sz:${sz};--d:${(th === 'winter' ? 9 : 14) + Math.random() * 10}s;--dl:-${(Math.random() * 20).toFixed(1)}s;--drift:${(Math.random() * 120 - 60).toFixed(0)}px;--rot:${(Math.random() * 540 - 270).toFixed(0)}deg">${th === 'autumn' ? pick(['🍂', '🍁', '🍂']) : ''}</i>`;
    }
    fxEl.innerHTML = h;
    document.body.prepend(fxEl);
  }

  function pinnedHTML() {
    const list = entries.filter((e) => e.pinned);
    return list.length ? `<section class="home-sec pinned"><header><h2>Pinned</h2></header><div class="mem-row">${list.map((e) => memCard(e)).join('')}</div></section>` : '';
  }
  function renderHome() {
    view.dataset.title = 'Home';
    if (!entries.length) { view.innerHTML = emptyHTML(); return; }
    const today = D.today(), year = Number(today.slice(0, 4)), md = today.slice(5);

    const todays = entries.filter((e) => e.date === today);
    const todayHTML = todays.length
      ? `<div class="mem-row">${todays.map((e) => memCard(e)).join('')}</div>`
      : `<div class="note"><p>Nothing written today yet. A photo and a line or two is enough.<br><span class="prompt-line">Try this: ${esc(pick(PROMPTS))}</span></p><div class="row-tight"><button class="btn btn-line" data-action="quick">${ICON.camera}Snap &amp; save</button><button class="btn btn-primary" data-action="new" data-date="${today}">Write today’s entry</button></div></div>`;

    // On this day in past years (Feb 29 entries show on Feb 28 in other years)
    const isLeap = (y) => new Date(y, 1, 29).getMonth() === 1;
    const matchDay = (d) => d.slice(5) === md || (md === '02-28' && !isLeap(year) && d.slice(5) === '02-29');
    const past = entries.filter((e) => matchDay(e.date) && Number(e.date.slice(0, 4)) < year);
    const years = [...new Set(past.map((e) => e.date.slice(0, 4)))].sort().reverse();
    const otdHTML = years.length ? years.map((y) => {
      const list = past.filter((e) => e.date.startsWith(y)).reverse();
      const s = stats(list), n = year - Number(y);
      const m = dayMood(list);
      return `<div class="otd-year">
        <h3>${n === 1 ? 'One year ago' : `${n} years ago`} <span>${esc(D.long(list[0].date))}</span></h3>
        <p class="recap-line">You wrote ${plural(s.entries, 'entry', 'entries')}${s.photos ? ` and added ${plural(s.photos, 'photo')}` : ''} that day.${m ? ` You felt ${m[2].toLowerCase()} ${m[1]}` : ''}</p>
        <div class="mem-row">${list.map((e) => memCard(e)).join('')}</div></div>`;
    }).join('') : `<div class="note"><p>Nothing from ${esc(D.monthDay(today))} in past years yet. What you write today will show up here on ${esc(D.monthDay(today))}, ${year + 1}.</p></div>`;

    const week = weekInPastYears(today);
    const ym = D.ym(today), ms = stats(entries.filter((e) => e.date.startsWith(ym)));
    const wp = withPersonHTML(), ap = atPlaceHTML();

    view.innerHTML = `<div class="page-wide">
      <header class="home-head"><div><h1>${esc(greeting())}</h1><p>${esc(D.long(today))}</p></div>
        <div class="home-acts">${lockOn() ? `<button class="icon-btn" data-action="lock-now" aria-label="Lock now" title="Lock now">${ICON.lock}</button>` : ''}<button class="btn btn-primary" data-action="quick">${ICON.camera}Snap &amp; save</button></div></header>
      ${arrivedHTML()}
      ${syncBannerHTML()}${backupFolderNoteHTML()}${backupBannerHTML()}
      ${storyCardHTML()}
      ${weekCardHTML()}
      ${pinnedHTML()}
      ${heroHTML()}
      <section class="home-sec"><header><h2>On this day</h2></header>${otdHTML}</section>
      ${week.length ? `<section class="home-sec"><header><h2>This week in past years</h2></header><div class="mem-row">${week.map((e) => memCard(e, true)).join('')}</div></section>` : ''}
      ${wp ? `<section class="home-sec" id="withPerson">${wp}</section>` : ''}
      ${ap ? `<section class="home-sec" id="atPlace">${ap}</section>` : ''}
      <section class="home-sec"><header><h2>Today</h2></header>${todayHTML}</section>
      ${capsulesHTML()}
      <section class="home-sec"><header><h2>This month</h2><a class="link" href="#/recap/${ym}">See the recap</a></header>
        <p class="month-line">${ms.entries ? `So far you’ve written on <b>${plural(ms.days, 'day')}</b> and added <b>${plural(ms.photos, 'photo')}</b> in ${esc(D.monthName(ym, { month: 'long' }))}.` : `Nothing written in ${esc(D.monthName(ym, { month: 'long' }))} yet.`}</p>
      </section>
    </div>`;
    heroInit();
    seasonFx();
  }

  // ---------- Journal ----------
  function metaSpans(e) {
    const ppl = e.peopleIds.map(personById).filter(Boolean);
    const pl = placeById(e.placeId);
    const tg = e.tags.map(tagById).filter(Boolean);
    if (!ppl.length && !pl && !tg.length) return '';
    return `<div class="entry-meta">${tg.map((t) => tagChip(t, false)).join('')}${ppl.slice(0, 5).map((p) => `<span class="pill">${avatarHTML(p)}${esc(p.name)}</span>`).join('')}${ppl.length > 5 ? `<span class="pill" style="padding-left:11px">+${ppl.length - 5}</span>` : ''}
      ${pl ? `<span class="pill"><span class="pin">${ICON.pin}</span>${esc(pl.name)}</span>` : ''}</div>`;
  }
  function cardHTML(e) {
    const n = e.photoIds.length;
    let photos = '';
    if (n) {
      const shown = e.photoIds.slice(0, 3);
      photos = `<div class="mosaic-card n-${Math.min(n, 3)}">${shown.map((id, i) =>
        `<div class="ph">${imgTag(id, 'md')}${i === 2 && n > 3 ? `<span class="more">+${n - 3}</span>` : ''}</div>`).join('')}${stamp(e.date)}</div>`;
    }
    return `<article class="card${tintCls(e)}"${tintStyle(e)}><a class="card-link" href="#/entry/${e.id}">${photos}
      <div class="card-body">${n ? '' : stamp(e.date, 'stamp-paper')}
        <p class="card-day">${esc(D.dayLine(e.date))} ${moodEmoji(e)}${e.fav ? '<span class="fav-star" title="Favorite">★</span>' : ''}${e.pinned ? '<span class="pin-mark" title="Pinned">📌</span>' : ''}</p>
        ${e.title ? titleHTML(e, 'h3') : ''}
        ${e.text ? `<p class="excerpt">${esc(excerpt(e.text))}</p>` : ''}
        ${metaSpans(e)}
      </div></a></article>`;
  }
  function tileHTML(e, size) {
    const n = e.photoIds.length;
    const date = size === 's' ? D.tiny(e.date) : size === 'm' ? D.short(e.date) : D.dayLine(e.date);
    const label = esc(`${e.title || 'Entry'}, ${D.long(e.date)}${n > 1 ? `, ${n} photos` : ''}`);
    const m = moodOf(e.mood);
    const mood = m ? `<span class="mood-corner" aria-hidden="true">${m[1]}</span>` : '';
    if (n) {
      return `<a class="tile-e" href="#/entry/${e.id}" aria-label="${label}">
        <span class="ph">${imgTag(e.photoIds[0], size === 's' ? 'thumb' : 'md')}</span>${mood}
        ${n > 1 ? `<span class="multi">${n}</span>` : ''}
        <span class="cap">${e.title ? titleHTML(e, 'span') : ''}<span class="d">${e.fav ? '★ ' : ''}${esc(date)}</span></span>
        <span class="pcap">${pcapTitle(e, e.title || '')}<small>${esc(size === 's' ? D.tiny(e.date) : D.medium(e.date))}${m ? `<span class="pm">${m[1]}</span>` : ''}${n > 1 && size !== 's' ? ` · ${n} photos` : ''}</small></span></a>`;
    }
    return `<a class="tile-e text${tintCls(e)}" href="#/entry/${e.id}" aria-label="${label}"${tintStyle(e)}>${stamp(e.date, 'stamp-paper')}
      ${titleHTML(e, 'span', '', e.title || excerpt(e.text, 60))}${e.title && e.text ? `<span class="tx">${esc(excerpt(e.text, 200))}</span>` : ''}${m ? `<span class="mood-corner">${m[1]}</span>` : ''}</a>`;
  }
  function feedHTML() {
    const q = state.query.trim().toLowerCase();
    const hay = (e) => [e.title, e.text, ...e.peopleIds.map((id) => (personById(id) || {}).name || ''), (placeById(e.placeId) || {}).name || '', (moodOf(e.mood) || [])[2] || '', ...e.tags.map((id) => '#' + ((tagById(id) || {}).name || ''))].join(' ').toLowerCase();
    const list = applyFilters(q ? entries.filter((e) => hay(e).includes(q)) : entries);
    if (!list.length) return `<div class="no-results"><p>No entries match ${q ? `“${esc(state.query)}”` : ''}${q && filterCount() ? ' with ' : ''}${filterCount() ? 'these filters' : ''}.</p>${filterCount() ? '<button class="btn btn-line" data-f="clear" style="margin-top:12px">Clear filters</button>' : ''}</div>`;
    const groups = new Map();
    for (const e of list) { const k = D.ym(e.date); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
    const v = settings.view;
    return [...groups].map(([ym, items]) => `
      <section class="month-group">
        <h2 class="month-label"><strong>${esc(D.monthName(ym))}</strong><a class="link" href="#/recap/${ym}">Month recap</a></h2>
        ${v === 'story' ? `<div class="cards">${items.map(cardHTML).join('')}</div>`
          : `<div class="tiles size-${v}">${items.map((e) => tileHTML(e, v)).join('')}</div>`}
      </section>`).join('');
  }
  function renderJournal() {
    view.dataset.title = 'Journal';
    if (!entries.length) { view.innerHTML = emptyHTML(); return; }
    if (!VIEWS.some((v) => v[0] === settings.view)) settings.view = 'story';
    view.innerHTML = `<div class="${settings.view === 'story' ? 'page' : 'page-wide'}" id="journalPage">
      <header class="page-head"><h1>Journal</h1>
        <input class="search" id="search" type="search" placeholder="Search entries, people, places" aria-label="Search entries" value="${esc(state.query)}">
        <div class="views" role="group" aria-label="Layout">${VIEWS.map(([id, name, icon]) =>
          `<button type="button" data-view="${id}" aria-pressed="${settings.view === id}" aria-label="${name}" title="${name}">${icon}</button>`).join('')}</div>
        <a class="btn btn-line" href="#/book" title="Read your journal like a book">📖 Book</a>
        <button type="button" class="btn btn-line" data-action="import-photos" title="Make entries from many photos at once">Import photos</button>
        <button type="button" class="btn btn-line f-btn" data-f="toggle" aria-expanded="${state.showFilters}">${ICON.filter}Filters${filterCount() ? ` <span class="f-count">${filterCount()}</span>` : ''}</button>
      </header>
      <div id="filterPanel" ${state.showFilters ? '' : 'hidden'}>${state.showFilters ? filterPanelHTML() : ''}</div>
      <div id="filterActive">${state.showFilters ? '' : activeFiltersHTML()}</div>
      <div id="feed">${feedHTML()}</div></div>`;
    $('#search').addEventListener('input', (ev) => {
      state.query = ev.target.value;
      const feed = $('#feed'); feed.innerHTML = feedHTML(); hydrate(feed);
    });
    $('.views').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-view]');
      if (!b || b.dataset.view === settings.view) return;
      saveSettings({ view: b.dataset.view });
      $$('.views button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('#journalPage').className = settings.view === 'story' ? 'page' : 'page-wide';
      const feed = $('#feed'); feed.innerHTML = feedHTML(); hydrate(feed);
    });
  }

  // ---------- Calendar (photos or moods) ----------
  function renderCalendar(ym) {
    view.dataset.title = D.monthName(ym);
    const map = byDate(), today = D.today();
    const moods = settings.calMode === 'moods';
    const lead = D.parse(ym + '-01').getDay();
    const n = D.daysIn(ym);
    // Jan 1, 2023 was a Sunday, so these are Sun..Sat in the user's language
    const wd = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' }));
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="day blank" aria-hidden="true"></span>';
    let monthCount = 0;
    const used = new Map();
    for (let d = 1; d <= n; d++) {
      const date = `${ym}-${pad(d)}`;
      const list = map.get(date) || [];
      monthCount += list.length;
      const cover = list.map((e) => e.photoIds[0]).find(Boolean);
      const dm = dayMood(list);
      if (dm) used.set(dm[0], dm);
      const showPhoto = cover && !moods;
      const cls = ['day', showPhoto && 'has-photo', list.length && 'has-entry', moods && dm && 'has-mood', date === today && 'today', date > today && 'future'].filter(Boolean).join(' ');
      const label = `${D.long(date)}${list.length ? `, ${plural(list.length, 'entry', 'entries')}` : ', no entries'}${dm ? `, mood ${dm[2]}` : ''}`;
      cells += `<button class="${cls}" data-action="day" data-date="${date}" aria-label="${esc(label)}"${moods && dm ? ` style="--mc:${dm[3]}"` : ''}>
        ${showPhoto ? `<span class="ph">${imgTag(cover)}</span>` : ''}
        <span class="num">${d}</span>
        ${moods && dm ? `<span class="me" aria-hidden="true">${dm[1]}</span>` : ''}
        ${list.length > 1 ? `<span class="count">${list.length}</span>` : ''}
        ${list.length && !showPhoto && !(moods && dm) ? '<span class="dot"></span>' : ''}
      </button>`;
    }
    const thisMonth = D.ym(today);
    view.innerHTML = `<div class="page-wide">
      <header class="cal-head">
        <a class="icon-btn" href="#/calendar/${D.addMonths(ym, -1)}" aria-label="Previous month">${ICON.left}</a>
        <h1>${esc(D.monthName(ym))}</h1>
        <a class="icon-btn" href="#/calendar/${D.addMonths(ym, 1)}" aria-label="Next month">${ICON.right}</a>
        <span class="spacer"></span>
        <div class="seg" role="group" aria-label="Show"><button type="button" data-cal-mode="photos" aria-pressed="${!moods}">Photos</button><button type="button" data-cal-mode="moods" aria-pressed="${moods}">Moods</button></div>
        ${ym !== thisMonth ? `<a class="btn btn-line" href="#/calendar/${thisMonth}">This month</a>` : ''}
      </header>
      <div class="weekdays" aria-hidden="true">${wd.map((w) => `<span>${esc(w)}</span>`).join('')}</div>
      <div class="cal ${moods ? 'moods' : ''}">${cells}</div>
      ${moods ? (used.size ? `<div class="mood-legend">${[...used.values()].map((m) => `<span><span class="mood-e">${m[1]}</span>${m[2]}</span>`).join('')}</div>`
        : `<p class="mood-legend">No moods this month yet. Pick a mood when you write an entry.</p>`) : ''}
      <div class="cal-foot">
        <span>${monthCount ? plural(monthCount, 'entry', 'entries') + ' this month' : 'No entries this month. Tap a day to write one.'}</span>
        ${monthCount ? `<a class="link" href="#/recap/${ym}">See the month recap</a>` : ''}
      </div></div>`;
    $('[aria-label="Show"]').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-cal-mode]'); if (!b) return;
      saveSettings({ calMode: b.dataset.calMode }); route();
    });
  }

  // ---------- Journal page: stickers, tapes, notes ----------
  const TAB_ITEMS = (s) => s.split(' ').filter(Boolean);
  // Text stickers ("badges"): shape, font, colors
  const BADGES = {
    best: { t: 'Best day ever', s: 'ribbon', f: 'script', bg: '#F6C744', fg: '#3A2A10' },
    memories: { t: 'Memories', s: 'pill', f: 'hand', bg: '#FFFFFF', fg: '#2F6F73' },
    today: { t: 'Today', s: 'tag', f: 'typewriter', bg: '#D9B88F', fg: '#3B2A1A' },
    love: { t: 'Love this', s: 'seal', f: 'hand', bg: '#F5B5C8', fg: '#7A1F3D' },
    grateful: { t: 'Grateful', s: 'ribbon', f: 'elegant', bg: '#BFD8B8', fg: '#22402B' },
    yay: { t: 'Yay!', s: 'seal', f: 'retro', bg: '#FFD36B', fg: '#7A3D00' },
    oops: { t: 'Oops', s: 'pill', f: 'notebook', bg: '#FDE2E2', fg: '#9B2C2C' },
    self: { t: 'Note to self', s: 'tag', f: 'hand', bg: '#F3E3A1', fg: '#4A3B12' },
    weekend: { t: 'Weekend', s: 'ribbon', f: 'display', bg: '#B9D6EE', fg: '#16324A' },
    adventure: { t: 'Adventure', s: 'pill', f: 'typewriter', bg: '#2F4F4F', fg: '#F4EBD0' },
    eid1: { t: 'Eid Mubarak', s: 'ribbon', f: 'script', bg: '#1F6B4F', fg: '#F6D77A' },
    eid2: { t: 'Eid Mubarak', s: 'seal', f: 'elegant', bg: '#F6D77A', fg: '#1F4D3A' },
    eidadha: { t: 'Eid al-Adha Mubarak', s: 'pill', f: 'elegant', bg: '#FFFFFF', fg: '#1F6B4F' },
    ramadan: { t: 'Ramadan Kareem', s: 'ribbon', f: 'elegant', bg: '#2B2F5E', fg: '#F6D77A' },
    iftar: { t: 'Iftar', s: 'tag', f: 'hand', bg: '#F2C38B', fg: '#4A2A0A' },
    chand: { t: 'Chand Raat', s: 'pill', f: 'script', bg: '#2B2F5E', fg: '#FFFFFF' },
    halloween: { t: 'Happy Halloween', s: 'ribbon', f: 'display', bg: '#F07F1E', fg: '#1A1A1A' },
    boo: { t: 'Boo!', s: 'seal', f: 'retro', bg: '#1E1E24', fg: '#F7A23B' },
    trick: { t: 'Trick or treat', s: 'pill', f: 'hand', bg: '#6B3FA0', fg: '#FFE7A8' },
    thanks: { t: 'Happy Thanksgiving', s: 'ribbon', f: 'elegant', bg: '#B5562A', fg: '#FFF4E3' },
    thankful: { t: 'Thankful', s: 'tag', f: 'hand', bg: '#E8B25A', fg: '#4A2A0A' },
    gather: { t: 'Gather', s: 'seal', f: 'script', bg: '#7A4E2A', fg: '#FFF1D6' },
    xmas: { t: 'Merry Christmas', s: 'ribbon', f: 'script', bg: '#B3262E', fg: '#FFFFFF' },
    holidays: { t: 'Happy Holidays', s: 'pill', f: 'elegant', bg: '#1F5A3A', fg: '#F6E7B0' },
    hoho: { t: 'Ho ho ho', s: 'seal', f: 'retro', bg: '#FFFFFF', fg: '#B3262E' },
    newyear: { t: 'Happy New Year', s: 'ribbon', f: 'display', bg: '#1C1C2E', fg: '#F2D27A' },
    hello: { t: (d) => `Hello ${Number(d.slice(0, 4)) + (d.slice(5, 7) === '12' ? 1 : 0)}`, s: 'seal', f: 'script', bg: '#F2D27A', fg: '#1C1C2E' },
    cheers: { t: 'Cheers!', s: 'pill', f: 'retro', bg: '#FFFFFF', fg: '#B8892B' },
    bemine: { t: 'Be mine', s: 'seal', f: 'script', bg: '#E5466B', fg: '#FFFFFF' },
    loveyou: { t: 'Love you', s: 'pill', f: 'hand', bg: '#FBD3DE', fg: '#A3194A' },
    valentine: { t: "Happy Valentine's", s: 'ribbon', f: 'script', bg: '#F28CA8', fg: '#5A0E25' },
    july4: { t: 'Happy 4th of July', s: 'ribbon', f: 'display', bg: '#1F3A93', fg: '#FFFFFF' },
    usa: { t: 'Fireworks!', s: 'pill', f: 'retro', bg: '#C8102E', fg: '#FFFFFF' },
    bday: { t: 'Happy Birthday', s: 'ribbon', f: 'retro', bg: '#F7A8C8', fg: '#5A1033' },
    anniv: { t: 'Happy Anniversary', s: 'pill', f: 'script', bg: '#FFFFFF', fg: '#9B2C4C' },
    grad: { t: 'Graduation day', s: 'ribbon', f: 'elegant', bg: '#1E2A44', fg: '#F2D27A' },
    first: { t: 'First day', s: 'tag', f: 'typewriter', bg: '#BFD8B8', fg: '#22402B' },
    trip: { t: 'Trip!', s: 'seal', f: 'retro', bg: '#B9D6EE', fg: '#16324A' },
    proud: { t: 'Proud moment', s: 'pill', f: 'hand', bg: '#FFD36B', fg: '#5A3A00' },
    newhome: { t: 'New home', s: 'tag', f: 'hand', bg: '#E3D3BC', fg: '#3B2A1A' },
  };
  const badgeText = (id, date) => { const b = BADGES[id]; return typeof b.t === 'function' ? b.t(date) : b.t; };
  const thanksgiving = (y) => { const d = new Date(y, 10, 1); const first = (4 - d.getDay() + 7) % 7 + 1; return new Date(y, 10, first + 21); };
  const EID_FITR = ['2024-04-10', '2025-03-30', '2026-03-20', '2027-03-10', '2028-02-27', '2029-02-14', '2030-02-05'];
  const EID_ADHA = ['2024-06-16', '2025-06-06', '2026-05-27', '2027-05-16', '2028-05-05', '2029-04-24', '2030-04-13'];
  const RAMADAN = ['2024-03-11', '2025-03-01', '2026-02-18', '2027-02-08', '2028-01-28', '2029-01-16', '2030-01-06'];
  const daysBetween = (a, b) => Math.round((D.parse(a) - D.parse(b)) / 86400000);
  const nearFixed = (date, mmdd, before, after) => {
    const y = Number(date.slice(0, 4));
    return [y - 1, y, y + 1].some((yy) => { const d = daysBetween(date, `${yy}-${mmdd}`); return d >= -before && d <= after; });
  };
  const STICKER_TABS = [
    { id: 'nature', name: 'Nature', items: TAB_ITEMS('🌸 🌼 🌻 🌷 🌹 🌺 💐 🍀 🌿 🌱 🌵 🌴 🍂 🍁 🍄 🌾 🪴 🌳 🍃 🪷') },
    { id: 'sky', name: 'Weather', items: TAB_ITEMS('☀️ 🌤️ ⛅ 🌧️ ⛈️ 🌈 ❄️ ☃️ 🌙 ⭐ 🌟 ✨ ☁️ 🌊 🔥 💧 🌪️ 🌅 🌄 🌌') },
    { id: 'food', name: 'Food', items: TAB_ITEMS('☕ 🍵 🧋 🍰 🧁 🍩 🍪 🍫 🍕 🍔 🍜 🍣 🍓 🍉 🍋 🥐 🍝 🥗 🍦 🍿 🥭 🍛') },
    { id: 'love', name: 'Love', items: TAB_ITEMS('❤️ 🧡 💛 💚 💙 💜 🤍 🖤 💕 💖 💗 💞 💌 💝 😍 🥰 😘 🫶') },
    { id: 'fun', name: 'Fun', items: TAB_ITEMS('🎉 🎊 🎈 🎁 🎂 🎵 🎶 🎧 🎮 🎨 📷 🎬 🎤 🪩 🎯 🧩 🎀 🪁') },
    { id: 'travel', name: 'Travel', items: TAB_ITEMS('✈️ 🚗 🚆 🚲 🗺️ 🧭 🏖️ ⛰️ 🏕️ 🗽 🗼 🏰 🌍 🧳 📍 🚢 🏞️ 🎡') },
    { id: 'school', name: 'Study', items: TAB_ITEMS('📚 📖 ✏️ 🖊️ 📝 📎 📌 💻 🎓 🧠 🔬 📊 🗂️ ⏰ 📅 🏫 🧪 📐') },
    { id: 'animals', name: 'Animals', items: TAB_ITEMS('🐱 🐶 🐰 🐻 🐼 🦊 🐨 🐸 🐥 🦋 🐝 🐞 🐢 🐠 🦄 🐾 🦢 🐈') },
    { id: 'faces', name: 'Faces', items: TAB_ITEMS('😊 😄 😂 🥹 😍 🤩 😎 🥳 😴 🤔 😭 😤 🙃 😇 🤗 👍 ✌️ 👏') },
    { id: 'symbols', name: 'Symbols', items: TAB_ITEMS('⭐ ✨ 💫 ✔️ ❗ ❓ 💯 🔖 🏷️ 💡 🔔 👑 💎 🎗️ ♾️ ☮️ 🌀 🔆') },
    { id: 'words', name: 'Words', items: ['b:best', 'b:memories', 'b:today', 'b:love', 'b:grateful', 'b:yay', 'b:oops', 'b:self', 'b:weekend', 'b:adventure'] },
    { id: 'eid', name: 'Eid & Ramadan', holiday: true, items: ['b:eid1', 'b:eid2', 'b:eidadha', 'b:ramadan', 'b:iftar', 'b:chand', ...TAB_ITEMS('🌙 ⭐ 🕌 🏮 🤲 🕋 📿 🍲 🍬 🎁 💚 ✨ 🐐 🐄 🍯 🌟')],
      when: (d) => EID_FITR.concat(EID_ADHA).some((x) => Math.abs(daysBetween(d, x)) <= 3) || RAMADAN.some((r, i) => { const k = daysBetween(d, r); return k >= -1 && k < daysBetween(EID_FITR[i], r); }) },
    { id: 'halloween', name: 'Halloween', holiday: true, items: ['b:halloween', 'b:boo', 'b:trick', ...TAB_ITEMS('🎃 👻 🦇 🕷️ 🕸️ 🍬 🍭 🧙 💀 🌕 🧹 🐈‍⬛')], when: (d) => nearFixed(d, '10-31', 10, 1) },
    { id: 'thanksgiving', name: 'Thanksgiving', holiday: true, items: ['b:thanks', 'b:thankful', 'b:gather', ...TAB_ITEMS('🦃 🥧 🍂 🍁 🌽 🍠 🥖 🙏 🍗 🥘 🕯️ 🌾')],
      when: (d) => { const y = Number(d.slice(0, 4)); return Math.abs(daysBetween(d, D.fmt(thanksgiving(y)))) <= 3; } },
    { id: 'christmas', name: 'Christmas', holiday: true, items: ['b:xmas', 'b:holidays', 'b:hoho', ...TAB_ITEMS('🎄 🎅 ⛄ ❄️ 🎁 🔔 🦌 🍪 🕯️ 🧦 ⭐ 🤶')], when: (d) => nearFixed(d, '12-25', 10, 2) },
    { id: 'newyear', name: 'New Year', holiday: true, items: ['b:newyear', 'b:hello', 'b:cheers', ...TAB_ITEMS('🎆 🎇 🥂 🍾 🎉 🕛 ✨ 🎊 🪅 📅')], when: (d) => nearFixed(d, '01-01', 2, 3) },
    { id: 'valentine', name: "Valentine's", holiday: true, items: ['b:valentine', 'b:bemine', 'b:loveyou', ...TAB_ITEMS('💘 💝 💌 🌹 🍫 💕 💞 💋 🧸 💐')], when: (d) => nearFixed(d, '02-14', 3, 1) },
    { id: 'july4', name: 'July 4th', holiday: true, items: ['b:july4', 'b:usa', ...TAB_ITEMS('🎆 🇺🇸 🗽 🍔 🌭 🎇 ⭐ 🍉 🦅 🎉')], when: (d) => nearFixed(d, '07-04', 2, 1) },
    { id: 'milestones', name: 'Milestones', holiday: true, items: ['b:bday', 'b:anniv', 'b:grad', 'b:first', 'b:trip', 'b:proud', 'b:newhome', ...TAB_ITEMS('🎂 🎈 🎓 💍 🏆 🥇 ✈️ 🧳 🏡 🎒 🌟 👶 🔑 🎉')] },
  ];
  function stickerTabsFor(date) {
    const near = STICKER_TABS.filter((t) => t.when && t.when(date));
    return [...near, ...STICKER_TABS.filter((t) => !near.includes(t))].map((t) => ({ ...t, near: near.includes(t) }));
  }
  const TAPES = [
    ['stripe-sky', 'Sky stripes'], ['stripe-rose', 'Rose stripes'], ['stripe-mint', 'Mint stripes'], ['dots-red', 'Red dots'],
    ['dots-navy', 'Navy dots'], ['gingham', 'Gingham'], ['grid', 'Grid'], ['check', 'Checks'],
    ['butter', 'Butter'], ['lilac', 'Lilac'], ['sage', 'Sage'], ['peach', 'Peach'],
    ['kraft', 'Kraft paper'], ['gold', 'Gold foil'], ['hearts', 'Hearts'], ['stars', 'Stars'], ['flowers', 'Flowers'], ['zigzag', 'Zigzag'],
  ];
  const NOTE_STYLES = [['card', 'Note card'], ['sticky', 'Sticky note'], ['label', 'Handwritten'], ['tag', 'Kraft tag']];

  // ---------- Journal page: layout ----------
  // Every movable thing on a page is an item with x, y and width in "page units":
  // 100 units = the page width, so the page looks the same on a phone and a PC, just smaller.
  const photoAR = new Map(), mediaKind = new Map(), mediaDur = new Map();
  async function loadDims(ids) {
    const need = ids.filter((id) => !photoAR.has(id));
    await Promise.all(need.map(async (id) => {
      try {
        const r = await DB.getPhoto(id);
        photoAR.set(id, r && r.w && r.h ? r.w / r.h : 4 / 3);
        if (r && r.kind) { mediaKind.set(id, r.kind); mediaDur.set(id, r.dur || 0); }
      } catch (_) { photoAR.set(id, 4 / 3); }
    }));
  }
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (a, b) => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return a + ((h >>> 0) % 10000) / 10000 * (b - a); };
  }
  const defaultFrame = () => (settings.frame !== 'none' ? settings.frame : 'print');
  const itemBottom = (it) => {
    switch (it.type) {
      case 'photo': return it.y + it.w / ((it.crop && it.crop.ar) || it.ar || 1.33) + it.w * (it.frame === 'polaroid' ? 0.22 : it.frame === 'print' ? 0.09 : 0);
      case 'audio': return it.y + it.w * 0.62;
      case 'video': return it.y + it.w / (it.ar || 1.6) + it.w * 0.09;
      case 'song': return it.y + it.w * 0.42;
      case 'ink': return it.y + it.w / (it.ar || 1);
      case 'png': return it.y + it.w / (it.ar || 1);
      case 'tape': return it.y + (it.h || 4.2);
      case 'sticker': return it.y + it.w;
      case 'badge': return it.y + it.w * (BADGES[it.b] && BADGES[it.b].s === 'seal' ? 1 : 0.32);
      case 'note': return it.y + it.w * 0.45;
      default: return it.y + 10;
    }
  };
  const layoutBottom = (items) => items.reduce((m, it) => Math.max(m, itemBottom(it)), 0);
  function placePhotos(pids, startY, R) {
    const items = [];
    let y = startY, i = 0;
    const tapeFor = (p) => {
      const w = clamp(p.w * 0.38, 9, 20);
      items.push({ id: uid(), type: 'tape', style: TAPES[Math.floor(R(0, TAPES.length))][0], x: +(p.x + p.w / 2 - w / 2 + R(-5, 5)).toFixed(2), y: +(p.y - 2).toFixed(2), w: +w.toFixed(2), h: 4.2, r: +R(-14, 14).toFixed(1) });
    };
    while (i < pids.length) {
      const left = pids.length - i;
      if (left === 1) {
        const ar = photoAR.get(pids[i]) || 4 / 3;
        const w = pids.length === 1 ? (ar >= 1 ? 74 : 54) : (ar >= 1 ? 60 : 46);
        const p = { id: uid(), type: 'photo', pid: pids[i], ar, frame: defaultFrame(), x: +((100 - w) / 2 + R(-3, 3)).toFixed(2), y: +(y + 3).toFixed(2), w, r: +R(-2.5, 2.5).toFixed(1) };
        items.push(p); tapeFor(p);
        y = itemBottom(p) + 4; i++;
      } else {
        let rowBottom = y;
        for (let k = 0; k < 2; k++) {
          const ar = photoAR.get(pids[i]) || 4 / 3;
          const w = ar >= 1 ? 45 : 38;
          const p = { id: uid(), type: 'photo', pid: pids[i], ar, frame: defaultFrame(), x: +(k === 0 ? R(2, 6) : 100 - w - R(2, 6)).toFixed(2), y: +(y + 3 + (k ? R(3, 9) : R(0, 3))).toFixed(2), w, r: +R(-3.5, 3.5).toFixed(1) };
          items.push(p); tapeFor(p);
          rowBottom = Math.max(rowBottom, itemBottom(p)); i++;
        }
        y = rowBottom + 3;
      }
    }
    return items;
  }
  function defaultLayout(e) {
    const R = seeded(e.id);
    const items = placePhotos(e.photoIds, 0, R);
    // Stickers placed with v0.3's Decorate keep roughly the same spot
    const h = Math.max(layoutBottom(items), 30);
    (e.stickers || []).forEach((st) => items.push({ id: st.id || uid(), type: 'sticker', e: st.e, x: clamp(st.x - 5, 0, 90), y: +(clamp(st.y, 0, 100) / 100 * h).toFixed(2), w: +(10 * (st.s || 1)).toFixed(2), r: st.r || 0 }));
    const L = { v: 1, textPos: 'below', items, hidden: [], bg: '' };
    addMediaItems(e, L);
    return L;
  }
  // Voice notes, videos and the song of the day get a spot on the page automatically
  function addMediaItems(e, L) {
    const has = (type, mid) => L.items.some((it) => it.type === type && (!mid || it.mid === mid));
    let y = layoutBottom(L.items) + 3, x = 4;
    for (const mid of e.mediaIds || []) {
      const kind = mediaKind.get(mid);
      if (!kind || has(kind, mid) || (L.hidden || []).includes(mid)) continue;
      const it = kind === 'audio' ? { id: uid(), type: 'audio', mid, w: 36, x, y, r: -2 } : { id: uid(), type: 'video', mid, ar: photoAR.get(mid) || 16 / 9, w: 52, x, y, r: 1.5 };
      L.items.push(it);
      x = x + it.w + 6 > 96 ? 4 : x + it.w + 6;
      if (x === 4) y = layoutBottom(L.items) + 3;
    }
    if (e.song && e.song.title && !has('song') && !(L.hidden || []).includes('song')) L.items.push({ id: uid(), type: 'song', w: 40, x: 56, y: layoutBottom(L.items) + 3, r: 2 });
  }
  // Keep a saved layout in step with the entry: drop deleted photos, add new ones at the bottom
  function reconcile(e, layout) {
    const media = e.mediaIds || [];
    const L = { v: 1, textPos: layout.textPos || 'below', bg: layout.bg || '', hidden: (layout.hidden || []).filter((id) => e.photoIds.includes(id) || media.includes(id) || id === 'song'), items: [] };
    const assets = e.assetIds || [];
    L.items = (layout.items || []).filter((it) => (it.type === 'photo' ? e.photoIds.includes(it.pid) : it.type === 'png' ? assets.includes(it.pid)
      : it.type === 'audio' || it.type === 'video' ? media.includes(it.mid) : it.type === 'song' ? !!(e.song && e.song.title) : true)).map((it) => ({ ...it }));
    const onPage = new Set(L.items.filter((it) => it.type === 'photo').map((it) => it.pid));
    const missing = e.photoIds.filter((id) => !onPage.has(id) && !L.hidden.includes(id));
    if (missing.length) L.items.push(...placePhotos(missing, layoutBottom(L.items) + 1, seeded(e.id + missing.join(''))));
    addMediaItems(e, L);
    return L;
  }
  async function pageLayout(e) {
    await loadDims([...e.photoIds, ...(e.mediaIds || [])]);
    return e.layout && Array.isArray(e.layout.items) ? reconcile(e, e.layout) : defaultLayout(e);
  }

  const HANDLES = `<span class="h-rot" data-h="rot" aria-hidden="true"></span><span class="h-size" data-h="size" aria-hidden="true"></span><button type="button" class="h-del" data-h="del" aria-label="Remove">${ICON.x}</button>`;
  function itemClass(it) {
    const b = BADGES[it.b] || {};
    return 'it it-' + it.type + (it.type === 'photo' ? ' fr-' + (it.frame || 'none') + (it.crop && it.crop.round ? ' round' : '') : it.type === 'video' ? ' fr-print' : it.type === 'tape' ? ' tape-' + it.style : it.type === 'note' ? ' note-' + (it.style || 'card') : it.type === 'badge' ? ` bdg-${b.s} tf-${b.f}` : '');
  }
  function itemHTML(it, e, opts = {}) {
    const st = `--x:${it.x};--y:${it.y};--w:${it.w};--r:${it.r || 0}${it.h ? `;--h:${it.h}` : ''}${it.fs ? `;--fs:${it.fs}` : ''}`;
    const sel = opts.sel === it.id ? ' sel' : '';
    const handles = sel ? HANDLES : '';
    const pending = opts.pending || {};
    const img = (pid, kind) => pending[pid] ? `<img src="${pending[pid]}" class="loaded" alt="">` : imgTag(pid, kind);
    switch (it.type) {
      case 'photo': {
        const idx = e.photoIds.indexOf(it.pid);
        const view = !opts.edit && idx >= 0 ? ` data-action="photo" data-entry="${e.id}" data-index="${idx}" role="button" tabindex="0" aria-label="Open photo"` : '';
        const c = it.crop || {};
        const ar = c.ar || it.ar || 1.33;
        const imgStyle = `${it.fx && FILTERS[it.fx] ? `filter:${FILTERS[it.fx][1]};` : ''}${c.z && c.z !== 1 ? `transform:scale(${c.z});` : ''}object-position:${c.px ?? 50}% ${c.py ?? 50}%;transform-origin:${c.px ?? 50}% ${c.py ?? 50}%`;
        return `<div class="it it-photo fr-${it.frame || 'none'}${c.round ? ' round' : ''}${sel}" data-iid="${it.id}" style="${st}"${view}><div class="it-img" style="aspect-ratio:${(+ar).toFixed(4)}">${img(it.pid, 'md').replace('<img ', `<img style="${imgStyle}" `)}</div>${handles}</div>`;
      }
      case 'audio': {
        const dur = mediaDur.get(it.mid) || 0;
        const act = opts.edit ? '' : ` data-action="play-audio" data-mid="${it.mid}"`;
        return `<div class="it it-audio${sel}" data-iid="${it.id}" style="${st}"><div class="cassette"><span class="cs-label">Voice note · ${fmtDur(dur)}</span><span class="cs-reels"><i></i><i></i></span><button type="button" class="cs-play"${act} aria-label="Play voice note">▶</button></div>${handles}</div>`;
      }
      case 'video': {
        const act = opts.edit ? '' : ` data-action="play-video" data-mid="${it.mid}" role="button" tabindex="0" aria-label="Play video"`;
        return `<div class="it it-video fr-print${sel}" data-iid="${it.id}" style="${st}"${act}><div class="it-img" style="aspect-ratio:${(it.ar || 1.6).toFixed(4)}">${pending[it.mid] ? `<img src="${pending[it.mid]}" class="loaded" alt="">` : imgTag(it.mid, 'thumb')}<span class="vid-play">▶</span><span class="vid-dur">${fmtDur(mediaDur.get(it.mid) || 0)}</span></div>${handles}</div>`;
      }
      case 'song': {
        const sg = e.song || {};
        const act = !opts.edit && sg.link ? ` data-action="open-song" data-link="${esc(sg.link)}" role="link" tabindex="0"` : '';
        return `<div class="it it-song${sel}" data-iid="${it.id}" style="${st}"${act}><span class="vinyl"><i></i></span><span class="song-label"><small>Song of the day</small><b>${esc(sg.title || '')}</b>${sg.artist ? `<em>${esc(sg.artist)}</em>` : ''}</span>${handles}</div>`;
      }
      case 'ink': return `<div class="it it-ink${sel}" data-iid="${it.id}" style="${st}"><svg viewBox="0 0 ${it.vb[0]} ${it.vb[1]}" preserveAspectRatio="none" style="aspect-ratio:${(it.ar || 1).toFixed(4)}">${it.paths.map((p) => `<path d="${p.d}" stroke="${p.c}" stroke-width="${p.s}" stroke-opacity="${p.o || 1}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>${handles}</div>`;
      case 'png': return `<div class="it it-png${sel}" data-iid="${it.id}" style="${st}"><div class="it-img" style="aspect-ratio:${(it.ar || 1).toFixed(4)}">${img(it.pid, 'full')}</div>${handles}</div>`;
      case 'tape': return `<div class="it it-tape tape-${it.style}${sel}" data-iid="${it.id}" style="${st}">${handles}</div>`;
      case 'sticker': return `<div class="it it-sticker${sel}" data-iid="${it.id}" style="${st}"><span class="emo">${esc(it.e)}</span>${handles}</div>`;
      case 'badge': {
        const b = BADGES[it.b]; if (!b) return '';
        return `<div class="it it-badge bdg-${b.s} tf-${b.f}${sel}" data-iid="${it.id}" style="${st};--bg:${b.bg};--fg:${b.fg}"><span class="title-text">${esc(badgeText(it.b, e.date))}</span>${handles}</div>`;
      }
      case 'note': return `<div class="it it-note note-${it.style || 'card'}${sel}" data-iid="${it.id}" style="${st}"><div class="nt">${esc(it.text || '').replace(/\n/g, '<br>') || '&nbsp;'}</div>${handles}</div>`;
      default: return '';
    }
  }
  const canvasStyle = (items, extra = 0) => `aspect-ratio:100/${Math.max(+(layoutBottom(items) + 3 + extra).toFixed(2), 12)}`;
  function canvasHTML(e, layout, opts = {}) {
    if (!layout.items.length && !opts.edit) return '';
    return `<div class="pcanvas${opts.edit ? ' editing' : ''}" data-entry="${e.id}" style="${canvasStyle(layout.items, opts.edit ? 30 : 0)}">${layout.items.map((it) => itemHTML(it, e, opts)).join('')}</div>`;
  }
  // After drawing, measure the real height of notes and badges and size the page to fit
  function fitCanvas(cv, extra = 0) {
    if (!cv || !cv.clientWidth) return;
    const W = cv.clientWidth, top = cv.getBoundingClientRect().top;
    let bottom = 0;
    $$('.it', cv).forEach((el) => { bottom = Math.max(bottom, (el.getBoundingClientRect().bottom - top) / W * 100); });
    cv.style.aspectRatio = `100/${Math.max(+(bottom + 3 + extra).toFixed(2), 12)}`;
  }
  const fitAll = (root = view) => $$('.pcanvas', root).forEach((cv) => fitCanvas(cv, cv.classList.contains('editing') ? 30 : 0));

  // ---------- Day & single entry ----------
  function paragraphs(text) {
    return (text || '').trim().split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  }
  function entryHTML(e, layout, headingTag = 'h1', single = false) {
    const ppl = e.peopleIds.map(personById).filter(Boolean);
    const pl = placeById(e.placeId);
    const tg = e.tags.map(tagById).filter(Boolean);
    const meta = (moodOf(e.mood) || ppl.length || pl || tg.length) ? `<div class="entry-meta">${moodBadge(e)}
        ${tg.map((t) => tagChip(t)).join('')}
        ${ppl.map((p) => `<a class="pill" href="#/person/${p.id}">${avatarHTML(p)}${esc(p.name)}</a>`).join('')}
        ${pl ? `<a class="pill" href="#/place/${pl.id}"><span class="pin">${ICON.pin}</span>${esc(pl.name)}</a>` : ''}</div>` : '';
    const text = e.text ? `<div class="entry-text">${paragraphs(e.text)}</div>` : '';
    const canvas = `<div class="canvas-slot">${canvasHTML(e, layout)}</div>`;
    return `<article class="entry-full${tfClass(e)}" data-id="${e.id}">
      <div class="sheet${tintCls(e)}${layout.bg ? ' bg-' + layout.bg : ''}"${tintStyle(e)}>
        <header class="entry-head">${stamp(e.date, 'stamp-paper stamp-lg')}
          ${e.capsule ? `<p class="capsule-badge">📬 Time capsule · written ${esc(D.long(e.date))}, opened ${esc(D.long(e.capsule))}</p>` : ''}
          ${e.title ? titleHTML(e, headingTag) : ''}
          ${meta}
        </header>
        ${layout.textPos === 'above' ? text + canvas : canvas + text}
        ${pl ? `<div class="entry-place"><p><span>${esc(pl.name)}</span><a class="link" href="${esc(mapLink(pl))}" target="_blank" rel="noopener">Open in Google Maps</a></p><div class="map-box">${mapEmbed(pl)}</div></div>` : ''}
      </div>
      <div class="entry-actions">
        <button class="btn btn-line" data-action="edit" data-id="${e.id}">Edit entry</button>
        ${single ? `<button class="btn btn-line" data-action="edit-page" data-id="${e.id}">Edit page</button>` : ''}
        <button class="btn btn-line" data-action="share-page" data-id="${e.id}">Share as image</button>
        <button class="btn btn-line" data-action="fav" data-id="${e.id}" aria-pressed="${e.fav}">${e.fav ? '★ Favorite' : '☆ Favorite'}</button>
        <button class="btn btn-line" data-action="pin" data-id="${e.id}" aria-pressed="${e.pinned}">${e.pinned ? 'Unpin from Home' : 'Pin to Home'}</button>
        <button class="btn btn-danger" data-action="delete" data-id="${e.id}">Delete</button>
      </div>
    </article>`;
  }
  const backBtn = `<button class="btn btn-ghost back" data-action="back">${ICON.left}Back</button>`;
  async function renderEntry(id) {
    const e = byId(id);
    if (!e) {
      const c = capsules.find((x) => x.id === id);
      view.dataset.title = '';
      view.innerHTML = `<div class="page">${backBtn}<p class="no-results">${c ? `This letter is sealed until ${esc(D.long(c.capsule))}.` : 'This entry no longer exists.'}</p></div>`;
      return;
    }
    view.dataset.title = e.title || D.long(e.date);
    const hash = location.hash;
    const layout = await pageLayout(e);
    if (location.hash !== hash) return;
    view.innerHTML = `<div class="page">${backBtn}${entryHTML(e, layout, 'h1', true)}</div>`;
  }
  async function renderDay(date) {
    if (!D.valid(date)) return renderCalendar(D.ym(D.today()));
    view.dataset.title = D.long(date);
    const hash = location.hash;
    const list = (byDate().get(date) || []);
    const layouts = await Promise.all(list.map(pageLayout));
    if (location.hash !== hash) return;
    view.innerHTML = `<div class="page">${backBtn}
      ${list.length ? list.map((e, i) => entryHTML(e, layouts[i], 'h2')).join('') : `<p class="no-results">Nothing written on ${esc(D.long(date))}.</p>`}
      <div class="day-add"><button class="btn btn-line" data-action="new" data-date="${date}">${list.length ? 'Add another entry for this day' : 'Write an entry for this day'}</button></div>
    </div>`;
  }

  // ---------- Journal page editor ----------
  const tray = $('#tray');
  const pe = { on: false, entry: null, layout: null, sel: null, tab: 'stickers', stab: null, collapsed: false, pendPhotos: [], pendAssets: [], urls: {}, drag: null, art: null };
  const peItem = (id) => pe.layout.items.find((it) => it.id === id);
  const peCanvas = () => pe.art && $('.pcanvas', pe.art);
  async function startPageEdit(e) {
    const art = $(`.entry-full[data-id="${e.id}"]`);
    if (!art || pe.on) return;
    const layout = await pageLayout(e);
    Object.assign(pe, { on: true, entry: e, layout: JSON.parse(JSON.stringify(layout)), sel: null, tab: 'stickers', stab: null, collapsed: false, pendPhotos: [], pendAssets: [], urls: {}, drag: null, art, undo: [], redo: [], ink: null, draw: pe.draw || { tool: 'pen', color: '#1E2A2F', size: 0.8 } });
    art.classList.add('page-editing');
    document.body.classList.add('decor-mode');
    peDraw(); drawPeTray();
    tray.hidden = false;
    $('.canvas-slot', art).scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }
  function endPageEdit() {
    if (!pe.on) return;
    pe.on = false;
    Object.values(pe.urls).forEach((u) => URL.revokeObjectURL(u));
    tray.hidden = true; tray.innerHTML = '';
    document.body.classList.remove('decor-mode');
    if (pe.art) pe.art.classList.remove('page-editing');
    pe.art = null;
  }
  function peDraw() {
    const slot = pe.art && $('.canvas-slot', pe.art);
    if (!slot) return;
    // Text above or below the page items
    const sheet = $('.sheet', pe.art), text = $('.entry-text', sheet);
    if (text) { if (pe.layout.textPos === 'above') slot.before(text); else slot.after(text); }
    sheet.className = sheet.className.replace(/\s*bg-\S+/g, '') + (pe.layout.bg ? ' bg-' + pe.layout.bg : '');
    slot.innerHTML = canvasHTML(pe.entry, pe.layout, { edit: true, sel: pe.sel, pending: pe.urls });
    hydrate(slot); peModeClass();
    requestAnimationFrame(() => fitCanvas(peCanvas(), 30));
  }
  function peMarkSel() {
    const cv = peCanvas(); if (!cv) return;
    $$('.it', cv).forEach((el) => {
      const on = el.dataset.iid === pe.sel;
      el.classList.toggle('sel', on);
      $$('[data-h]', el).forEach((h) => h.remove());
      if (on) el.insertAdjacentHTML('beforeend', HANDLES);
    });
  }
  // Update one item's position, size, angle and style without redrawing its picture
  function peUpdateItem(it) {
    const el = $(`.it[data-iid="${it.id}"]`, peCanvas()); if (!el) return;
    el.className = itemClass(it) + (pe.sel === it.id ? ' sel' : '');
    el.style.setProperty('--x', it.x); el.style.setProperty('--y', it.y); el.style.setProperty('--w', it.w); el.style.setProperty('--r', it.r || 0);
    if (it.h) el.style.setProperty('--h', it.h);
    if (it.fs) el.style.setProperty('--fs', it.fs);
    fitCanvas(peCanvas(), 30);
  }
  function peModeClass() {
    const cv = peCanvas(); if (!cv) return;
    cv.classList.toggle('drawing', pe.tab === 'draw');
    cv.classList.toggle('erasing', pe.tab === 'draw' && pe.draw.tool === 'erase');
  }
  // Change a photo's filter or crop on the page without reloading its picture
  function peUpdatePhotoLook(it) {
    const el = $(`.it[data-iid="${it.id}"]`, peCanvas()); if (!el) return;
    const c = it.crop || {}, img = $('img', el), box = $('.it-img', el);
    el.classList.toggle('round', !!c.round);
    if (box) box.style.aspectRatio = (+(c.ar || it.ar || 1.33)).toFixed(4);
    if (img) {
      img.style.filter = it.fx && FILTERS[it.fx] ? FILTERS[it.fx][1] : '';
      img.style.transform = c.z && c.z !== 1 ? `scale(${c.z})` : '';
      img.style.objectPosition = img.style.transformOrigin = `${c.px ?? 50}% ${c.py ?? 50}%`;
    }
    fitCanvas(peCanvas(), 30);
  }
  function peSelect(id) { pe.sel = id; peMarkSel(); drawPeTray(); }
  function peAdd(it) {
    const cv = peCanvas();
    const rect = cv.getBoundingClientRect();
    // Put it in the middle of the part of the page you can see (above the tools panel)
    const top = Math.max(rect.top, 0), bottom = Math.min(rect.bottom, tray.hidden ? window.innerHeight : tray.getBoundingClientRect().top);
    const midPx = bottom > top ? (top + bottom) / 2 - rect.top : rect.height / 2;
    const h = it.type === 'photo' || it.type === 'png' ? it.w / (it.ar || 1) : it.type === 'tape' ? (it.h || 4.2) : it.w * 0.4;
    const n = pe.layout.items.length;
    it.id = uid();
    const spread = [[0, 0], [-22, -8], [22, 8], [-22, 10], [22, -10], [0, 14], [0, -14], [-30, 0], [30, 0]][n % 9];
    it.x = +(clamp(50 - it.w / 2 + spread[0], 0, 100 - it.w)).toFixed(2);
    it.y = +(Math.max(0, midPx / rect.width * 100 - h / 2 + spread[1])).toFixed(2);
    it.r = it.r ?? +(Math.random() * 14 - 7).toFixed(1);
    peSnap();
    pe.layout.items.push(it);
    pe.sel = it.id; peDraw(); drawPeTray();
  }
  function selToolbar() {
    const it = peItem(pe.sel);
    if (!it) return `<p class="hint">Tap anything on the page to move it, resize it from the corner, or turn it with the top handle.</p>`;
    let extra = '';
    if (it.type === 'photo') {
      const c = it.crop || {}, shape = c.round ? 'round' : c.ar ? String(c.ar) : 'orig';
      extra = `<div class="seg" role="radiogroup" aria-label="Frame">${[['none', 'No frame'], ['print', 'Print'], ['polaroid', 'Polaroid']].map(([v, n]) => `<button type="button" data-pe="frame" data-val="${v}" aria-pressed="${(it.frame || 'none') === v}">${n}</button>`).join('')}</div>
        <div class="pe-group"><span class="muted">Filter</span><div class="fx-row">${Object.entries(FILTERS).map(([k, [n, f]]) => `<button type="button" class="fx-chip" data-pe="fx" data-val="${k}" aria-pressed="${(it.fx || 'none') === k}"><span style="${f ? `filter:${f}` : ''}">${pe.urls[it.pid] ? `<img src="${pe.urls[it.pid]}" alt="">` : imgTag(it.pid, 'thumb')}</span><small>${n}</small></button>`).join('')}</div></div>
        <div class="pe-group"><span class="muted">Crop</span><div class="seg" role="radiogroup" aria-label="Shape">${SHAPES.map(([v, n]) => `<button type="button" data-pe="shape" data-val="${v}" aria-pressed="${shape === v}">${n}</button>`).join('')}</div>
          <label class="pe-range">Zoom <input type="range" min="1" max="3" step="0.05" value="${c.z || 1}" data-crop="z"></label>
          <label class="pe-range">Left–right <input type="range" min="0" max="100" step="1" value="${c.px ?? 50}" data-crop="px"></label>
          <label class="pe-range">Up–down <input type="range" min="0" max="100" step="1" value="${c.py ?? 50}" data-crop="py"></label></div>`;
    }
    if (it.type === 'note') extra = `<textarea class="text-input pe-note" id="peNote" rows="2" placeholder="Write a note">${esc(it.text || '')}</textarea>
      <div class="seg" role="radiogroup" aria-label="Note style">${NOTE_STYLES.map(([v, n]) => `<button type="button" data-pe="nstyle" data-val="${v}" aria-pressed="${it.style === v}">${n}</button>`).join('')}</div>
      <button type="button" class="btn btn-line" data-pe="fs-down" aria-label="Smaller text">A−</button><button type="button" class="btn btn-line" data-pe="fs-up" aria-label="Larger text">A+</button>`;
    if (it.type === 'tape') extra = `<label class="muted">Design <select class="text-input pe-tapesel" id="peTape">${TAPES.map(([v, n]) => `<option value="${v}"${v === it.style ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`;
    return `<div class="pe-sel">
      <button type="button" class="btn btn-line" data-pe="smaller">Smaller</button>
      <button type="button" class="btn btn-line" data-pe="bigger">Bigger</button>
      <button type="button" class="btn btn-line" data-pe="rotl" aria-label="Turn left">↺</button>
      <button type="button" class="btn btn-line" data-pe="rotr" aria-label="Turn right">↻</button>
      <button type="button" class="btn btn-line" data-pe="front">Bring to front</button>
      <button type="button" class="btn btn-line" data-pe="back">Send to back</button>
      <button type="button" class="btn btn-line" data-pe="dup">Duplicate</button>
      <button type="button" class="btn btn-danger" data-pe="del">${it.type === 'photo' ? 'Remove from page' : 'Delete'}</button>
      ${extra}
    </div>`;
  }
  function trayBody() {
    const e = pe.entry;
    if (pe.tab === 'stickers') {
      const tabs = stickerTabsFor(e.date);
      if (!pe.stab || !tabs.some((t) => t.id === pe.stab)) pe.stab = tabs[0].id;
      const cur = tabs.find((t) => t.id === pe.stab);
      return `<div class="stabs" role="tablist" aria-label="Sticker sets">${tabs.map((t) => `<button type="button" role="tab" data-stab="${t.id}" aria-selected="${t.id === pe.stab}">${t.near ? '★ ' : ''}${esc(t.name)}</button>`).join('')}</div>
        <div class="sgrid">${cur.items.map((s) => {
          if (s.startsWith('b:')) { const id = s.slice(2), b = BADGES[id]; return `<button type="button" class="sbadge" data-add-badge="${id}" aria-label="Add ${esc(badgeText(id, e.date))}"><span class="bdg-mini bdg-${b.s} tf-${b.f}" style="--bg:${b.bg};--fg:${b.fg}"><span class="title-text">${esc(badgeText(id, e.date))}</span></span></button>`; }
          return `<button type="button" data-add-sticker="${s}" aria-label="Add sticker ${s}">${s}</button>`;
        }).join('')}</div>`;
    }
    if (pe.tab === 'tape') return `<div class="tgrid">${TAPES.map(([id, name]) => `<button type="button" data-add-tape="${id}" aria-label="Add ${name} tape" title="${name}"><span class="tape-swatch tape-${id}"></span><small>${name}</small></button>`).join('')}</div>`;
    if (pe.tab === 'notes') return `<div class="ngrid">${NOTE_STYLES.map(([id, name]) => `<button type="button" data-add-note="${id}"><span class="note-swatch note-${id}"><span>${name}</span></span></button>`).join('')}</div>
      <div class="row-tight" style="margin-top:12px"><span class="muted">Text on the page:</span><div class="seg" role="radiogroup" aria-label="Text position"><button type="button" data-pe="textpos" data-val="below" aria-pressed="${pe.layout.textPos !== 'above'}">Below the photos</button><button type="button" data-pe="textpos" data-val="above" aria-pressed="${pe.layout.textPos === 'above'}">Above the photos</button></div></div>`;
    if (pe.tab === 'photos') {
      const all = [...e.photoIds, ...pe.pendPhotos.map((p) => p.id)];
      return `<div class="pgrid">${all.map((id) => `<button type="button" data-add-photo="${id}" aria-label="Add this photo to the page"><img ${pe.urls[id] ? `src="${pe.urls[id]}"` : `data-photo="${id}" data-kind="thumb"`} alt=""></button>`).join('')}
        <label class="pgrid-add"><input type="file" accept="image/*" multiple data-pe-file="photo"><span>+ New photos</span></label></div>
        <p class="hint" style="margin-top:8px">Tap a photo to put it on the page. New photos are added to this entry too.</p>`;
    }
    if (pe.tab === 'draw') {
      const d = pe.draw;
      return `<div class="draw-tools">
        <div class="seg" role="radiogroup" aria-label="Drawing tool">${[['pen', '✏️ Pen'], ['hl', '🖍️ Highlighter'], ['erase', '🧽 Eraser']].map(([v, n]) => `<button type="button" data-tool="${v}" aria-pressed="${d.tool === v}">${n}</button>`).join('')}</div>
        <div class="ink-colors" role="radiogroup" aria-label="Color">${INK_COLORS.map((c) => `<button type="button" data-ink="${c}" aria-pressed="${d.color === c}" style="--c:${c}" aria-label="Color ${c}"></button>`).join('')}</div>
        <div class="ink-sizes" role="radiogroup" aria-label="Size">${[0.4, 0.8, 1.4, 2.4].map((z) => `<button type="button" data-isize="${z}" aria-pressed="${d.size === z}" aria-label="Size ${z}"><i style="--z:${z * 6}px"></i></button>`).join('')}</div>
      </div><p class="hint" style="margin-top:8px">${d.tool === 'erase' ? 'Tap a drawing to rub it out.' : 'Draw on the page with your finger, pen or mouse. Each line can be moved later: switch to another tab and tap it.'}</p>`;
    }
    if (pe.tab === 'bg') return `<div class="bg-grid">${BGS.map(([v, n]) => `<button type="button" data-bg="${v}" aria-pressed="${(pe.layout.bg || '') === v}"><span class="bg-sw sheet${v ? ' bg-' + v : ''}"></span><small>${n}</small></button>`).join('')}</div>`;
    if (pe.tab === 'layouts') return `<div class="preset-grid">${PRESETS.map(([v, n, sub]) => `<button type="button" data-preset="${v}"><span class="ps-ic ps-${v}"><i></i><i></i><i></i><i></i></span><b>${n}</b><small>${sub}</small></button>`).join('')}</div>
      <p class="hint" style="margin-top:8px">This rearranges the photos on the page. Notes, stickers and drawings stay. Changed your mind? Use Undo.</p>`;
    if (pe.tab === 'png') {
      const assets = [...(e.assetIds || []), ...pe.pendAssets.map((a) => a.id)];
      return `<div class="pgrid png">${assets.map((id) => `<button type="button" data-add-png="${id}" aria-label="Add this image again"><img ${pe.urls[id] ? `src="${pe.urls[id]}"` : `data-photo="${id}" data-kind="full"`} alt=""></button>`).join('')}
        <label class="pgrid-add"><input type="file" accept="image/png,image/webp,image/gif" multiple data-pe-file="png"><span>+ Upload PNG</span></label></div>
        <p class="hint" style="margin-top:8px">Transparent PNGs (stickers, tape, cut-outs) keep their see-through background. They belong to this entry only.</p>`;
    }
    return '';
  }
  function drawPeTray() {
    const tabs = [['stickers', 'Stickers'], ['tape', 'Washi tape'], ['notes', 'Notes'], ['photos', 'Photos'], ['draw', 'Draw'], ['bg', 'Background'], ['layouts', 'Layouts'], ['png', 'PNG']];
    tray.className = 'tray pe-tray' + (pe.collapsed ? ' collapsed' : '');
    tray.innerHTML = `<div class="tray-top">
        <button type="button" class="btn btn-ghost" data-pe="collapse" aria-expanded="${!pe.collapsed}">${pe.collapsed ? 'Show tools' : 'Hide tools'}</button>
        <button type="button" class="icon-btn" data-pe="undo" aria-label="Undo" title="Undo (Ctrl+Z)"${pe.undo.length ? '' : ' disabled'}>↶</button>
        <button type="button" class="icon-btn" data-pe="redo" aria-label="Redo" title="Redo (Ctrl+Y)"${pe.redo.length ? '' : ' disabled'}>↷</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" data-pe="cancel">Cancel</button>
        <button type="button" class="btn btn-primary" data-pe="done">Done</button>
      </div>
      ${pe.tab === 'draw' ? '' : `<div class="tray-sel">${selToolbar()}</div>`}
      <nav class="tray-tabs" role="tablist" aria-label="Add to page">${tabs.map(([id, n]) => `<button type="button" role="tab" data-ptab="${id}" aria-selected="${pe.tab === id}">${n}</button>`).join('')}</nav>
      <div class="tray-body">${trayBody()}</div>`;
    hydrate(tray);
    const note = $('#peNote', tray);
    if (note) note.addEventListener('focus', () => peSnap(), { once: true });
    if (note) note.addEventListener('input', () => { const it = peItem(pe.sel); if (!it) return; it.text = note.value; const el = $(`.it[data-iid="${it.id}"] .nt`, peCanvas()); if (el) el.innerHTML = esc(it.text).replace(/\n/g, '<br>') || '&nbsp;'; fitCanvas(peCanvas(), 30); });
    const tsel = $('#peTape', tray);
    if (tsel) tsel.addEventListener('change', () => { const it = peItem(pe.sel); if (it) { peSnap(); it.style = tsel.value; peUpdateItem(it); } });
    peModeClass();
    $$('[data-crop]', tray).forEach((inp) => {
      let snapped = false;
      inp.addEventListener('input', () => {
        const it = peItem(pe.sel); if (!it) return;
        if (!snapped) { peSnap(); snapped = true; }
        it.crop = { ...(it.crop || {}), [inp.dataset.crop]: +inp.value };
        peUpdatePhotoLook(it);
      });
      inp.addEventListener('change', () => { snapped = false; });
    });
    $$('[data-pe-file]', tray).forEach((inp) => inp.addEventListener('change', (ev) => { peFiles(ev.target.files, inp.dataset.peFile); ev.target.value = ''; }));
  }
  async function peFiles(files, kind) {
    const list = [...files];
    if (!list.length) return;
    toast(kind === 'png' ? 'Adding images…' : 'Adding photos…');
    for (const f of list) {
      try {
        if (kind === 'png') {
          const img = await decode(f);
          const full = await shrink(img, 1400, 0.92, false, 'image/png');
          const th = await shrink(img, 300, 0.9, false, 'image/png');
          if (img.close) img.close();
          const rec = { id: uid(), png: true, blob: full.blob, thumb: th.blob, w: full.w, h: full.h, addedAt: Date.now() };
          pe.pendAssets.push(rec); pe.urls[rec.id] = URL.createObjectURL(rec.blob); photoAR.set(rec.id, rec.w / rec.h);
          peAdd({ type: 'png', pid: rec.id, ar: rec.w / rec.h, w: 30 });
        } else {
          const rec = await processImage(f);
          pe.pendPhotos.push(rec); pe.urls[rec.id] = URL.createObjectURL(rec.md); photoAR.set(rec.id, rec.w / rec.h);
          peAdd({ type: 'photo', pid: rec.id, ar: rec.w / rec.h, w: rec.w >= rec.h ? 46 : 36, frame: defaultFrame() });
        }
      } catch (_) { toast(`“${f.name}” couldn’t be added. Try a ${kind === 'png' ? 'PNG' : 'JPEG or PNG'} file.`, 3500); }
    }
  }
  async function peSave() {
    const e = pe.entry, L = pe.layout;
    const usedPhotos = new Set(L.items.filter((it) => it.type === 'photo').map((it) => it.pid));
    const usedAssets = new Set(L.items.filter((it) => it.type === 'png').map((it) => it.pid));
    const newPhotos = pe.pendPhotos.filter((p) => usedPhotos.has(p.id));
    const photoIds = [...e.photoIds, ...newPhotos.map((p) => p.id)];
    const keptAssets = (e.assetIds || []).filter((id) => usedAssets.has(id));
    const newAssets = pe.pendAssets.filter((a) => usedAssets.has(a.id));
    const removedAssets = (e.assetIds || []).filter((id) => !usedAssets.has(id));
    const onPageMedia = new Set(L.items.filter((it) => it.mid).map((it) => it.mid));
    const hidden = [...photoIds.filter((id) => !usedPhotos.has(id)), ...(e.mediaIds || []).filter((id) => !onPageMedia.has(id)), ...(e.song && !L.items.some((it) => it.type === 'song') ? ['song'] : [])];
    const layout = { v: 1, textPos: L.textPos, bg: L.bg || '', items: L.items, hidden };
    const next = norm({ ...e, photoIds, assetIds: [...keptAssets, ...newAssets.map((a) => a.id)], layout, stickers: [], updatedAt: Date.now() });
    try { await DB.saveEntry(next, [...newPhotos, ...newAssets], removedAssets); } catch (err) {
      toast(err && err.name === 'QuotaExceededError' ? 'The browser is out of storage space. Export a backup and remove some photos.' : 'The page couldn’t be saved. Try again.', 4000); return;
    }
    removedAssets.forEach(forgetPhoto);
    const i = entries.findIndex((x) => x.id === e.id); if (i >= 0) entries[i] = next;
    endPageEdit();
    toast('Page saved');
    route();
  }
  tray.addEventListener('click', (ev) => {
    if (!pe.on) return;
    const t = ev.target.closest('button, [data-ptab]');
    if (!t) return;
    const d = t.dataset;
    if (d.ptab) { pe.tab = d.ptab; pe.collapsed = false; if (d.ptab === 'draw' && pe.sel) { pe.sel = null; peMarkSel(); } drawPeTray(); return; }
    if (d.tool) { pe.draw.tool = d.tool; drawPeTray(); return; }
    if (d.ink) { pe.draw.color = d.ink; if (pe.draw.tool === 'erase') pe.draw.tool = 'pen'; drawPeTray(); return; }
    if (d.isize) { pe.draw.size = +d.isize; if (pe.draw.tool === 'erase') pe.draw.tool = 'pen'; drawPeTray(); return; }
    if (d.bg !== undefined) { peSnap(); pe.layout.bg = d.bg; peDraw(); drawPeTray(); return; }
    if (d.preset) { peSnap(); applyPreset(d.preset); peDraw(); drawPeTray(); toast('Layout applied. Undo to go back.'); return; }
    if (d.stab) { pe.stab = d.stab; drawPeTray(); return; }
    if (d.addSticker) return peAdd({ type: 'sticker', e: d.addSticker, w: 10 });
    if (d.addBadge) return peAdd({ type: 'badge', b: d.addBadge, w: BADGES[d.addBadge].s === 'seal' ? 16 : 30, r: Math.round(Math.random() * 10 - 5) });
    if (d.addTape) return peAdd({ type: 'tape', style: d.addTape, w: 22, h: 4.2, r: Math.round(Math.random() * 30 - 15) });
    if (d.addNote) return peAdd({ type: 'note', style: d.addNote, text: d.addNote === 'label' ? 'Write something…' : 'Write a note…', w: d.addNote === 'label' ? 34 : 28, fs: 1, r: Math.round(Math.random() * 8 - 4) });
    if (d.addPhoto) {
      pe.layout.hidden = (pe.layout.hidden || []).filter((x) => x !== d.addPhoto);
      const ar = photoAR.get(d.addPhoto) || 4 / 3;
      return peAdd({ type: 'photo', pid: d.addPhoto, ar, w: ar >= 1 ? 46 : 36, frame: defaultFrame() });
    }
    if (d.addPng) return peAdd({ type: 'png', pid: d.addPng, ar: photoAR.get(d.addPng) || 1, w: 30 });
    const it = peItem(pe.sel);
    switch (d.pe) {
      case 'collapse': pe.collapsed = !pe.collapsed; drawPeTray(); return;
      case 'cancel': endPageEdit(); route(); return;
      case 'done': peSave(); return;
      case 'undo': peUndo(); return;
      case 'redo': peRedo(); return;
      case 'textpos': peSnap(); pe.layout.textPos = d.val; peDraw(); drawPeTray(); return;
    }
    if (!it) return;
    const scale = (k) => { it.w = +clamp(it.w * k, 3, 100).toFixed(2); };
    if (['smaller', 'bigger', 'rotl', 'rotr', 'front', 'back', 'dup', 'del', 'frame', 'nstyle', 'fs-down', 'fs-up', 'fx', 'shape'].includes(d.pe)) peSnap();
    switch (d.pe) {
      case 'smaller': scale(1 / 1.12); break;
      case 'bigger': scale(1.12); break;
      case 'rotl': it.r = +(((it.r || 0) - 5)).toFixed(1); break;
      case 'rotr': it.r = +(((it.r || 0) + 5)).toFixed(1); break;
      case 'front': pe.layout.items = [...pe.layout.items.filter((x) => x !== it), it]; break;
      case 'back': pe.layout.items = [it, ...pe.layout.items.filter((x) => x !== it)]; break;
      case 'dup': { const c = { ...it, id: uid(), x: clamp(it.x + 3, 0, 97), y: it.y + 3 }; pe.layout.items.push(c); pe.sel = c.id; break; }
      case 'del': peRemove(it); break;
      case 'fx': it.fx = d.val === 'none' ? undefined : d.val; peUpdatePhotoLook(it); drawPeTray(); return;
      case 'shape': {
        const c = { ...(it.crop || {}) };
        if (d.val === 'orig') { delete c.ar; c.round = false; } else if (d.val === 'round') { c.ar = 1; c.round = true; } else { c.ar = +d.val; c.round = false; }
        it.crop = c; peUpdatePhotoLook(it); drawPeTray(); return;
      }
      case 'frame': it.frame = d.val; break;
      case 'nstyle': it.style = d.val; break;
      case 'fs-down': it.fs = +clamp((it.fs || 1) / 1.12, 0.5, 3).toFixed(2); break;
      case 'fs-up': it.fs = +clamp((it.fs || 1) * 1.12, 0.5, 3).toFixed(2); break;
      default: return;
    }
    if (['front', 'back', 'dup', 'del'].includes(d.pe)) peDraw(); else peUpdateItem(it);
    if (['frame', 'nstyle', 'dup', 'del'].includes(d.pe)) drawPeTray();
  });
  // Dragging, resizing and turning items on the page
  view.addEventListener('pointerdown', (ev) => {
    if (!pe.on) return;
    const cv = ev.target.closest('.pcanvas.editing');
    if (!cv) return;
    if (pe.tab === 'draw') {
      ev.preventDefault();
      if (pe.draw.tool === 'erase') {
        const ink = ev.target.closest('.it-ink'), it2 = ink && peItem(ink.dataset.iid);
        if (it2) { peSnap(); pe.layout.items = pe.layout.items.filter((x) => x !== it2); peDraw(); drawPeTray(); }
        return;
      }
      inkStart(ev, cv); return;
    }
    const el = ev.target.closest('.it');
    const h = ev.target.closest('[data-h]');
    if (!el) { if (pe.sel) peSelect(null); return; }
    const it = peItem(el.dataset.iid);
    if (!it) return;
    ev.preventDefault();
    if (h && h.dataset.h === 'del') return;
    if (pe.sel !== it.id) { pe.sel = it.id; peMarkSel(); drawPeTray(); }
    const node = $(`.it[data-iid="${it.id}"]`, cv);
    const rect = cv.getBoundingClientRect(), W = rect.width;
    const er = node.getBoundingClientRect();
    const cx = er.left + er.width / 2, cy = er.top + er.height / 2;
    pe.drag = { snapped: false, it, node, W, mode: h ? h.dataset.h : 'move', sx: ev.clientX, sy: ev.clientY, x0: it.x, y0: it.y, w0: it.w, r0: it.r || 0, cx, cy,
      d0: Math.hypot(ev.clientX - cx, ev.clientY - cy) || 1, a0: Math.atan2(ev.clientY - cy, ev.clientX - cx) };
    cv.setPointerCapture(ev.pointerId);
  });
  view.addEventListener('pointermove', (ev) => {
    if (pe.ink) { inkMove(ev); return; }
    const d = pe.drag; if (!d) return;
    if (!d.snapped) {
      if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 2) return;
      d.snapped = true; peSnap();
    }
    const { it, node } = d;
    if (d.mode === 'move') {
      it.x = +clamp(d.x0 + (ev.clientX - d.sx) / d.W * 100, -it.w * 0.6, 100 - it.w * 0.4).toFixed(2);
      it.y = +Math.max(-5, d.y0 + (ev.clientY - d.sy) / d.W * 100).toFixed(2);
      node.style.setProperty('--x', it.x); node.style.setProperty('--y', it.y);
    } else if (d.mode === 'size') {
      it.w = +clamp(d.w0 * (Math.hypot(ev.clientX - d.cx, ev.clientY - d.cy) / d.d0), 3, 100).toFixed(2);
      it.x = +(d.x0 + (d.w0 - it.w) / 2).toFixed(2);
      node.style.setProperty('--w', it.w); node.style.setProperty('--x', it.x);
    } else if (d.mode === 'rot') {
      const a = Math.atan2(ev.clientY - d.cy, ev.clientX - d.cx);
      let r = d.r0 + (a - d.a0) * 180 / Math.PI;
      for (const snap of [0, 90, -90, 180, -180]) if (Math.abs(r - snap) < 3) r = snap;
      it.r = +r.toFixed(1);
      node.style.setProperty('--r', it.r);
    }
  });
  const peDrop = () => { if (pe.ink) { inkEnd(); return; } if (pe.drag) { pe.drag = null; fitCanvas(peCanvas(), 30); } };
  view.addEventListener('pointerup', peDrop);
  view.addEventListener('pointercancel', peDrop);
  view.addEventListener('click', (ev) => {
    if (!pe.on) return;
    const del = ev.target.closest('.pcanvas.editing [data-h="del"]');
    if (del) { const it = peItem(pe.sel); if (it) { peSnap(); peRemove(it); peDraw(); drawPeTray(); } }
  });
  document.addEventListener('keydown', (ev) => {
    if (!pe.on || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) peRedo(); else peUndo(); return; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') { ev.preventDefault(); peRedo(); return; }
    const it = peItem(pe.sel);
    if (ev.key === 'Escape') { if (it) peSelect(null); return; }
    if (!it) return;
    const step = ev.shiftKey ? 5 : 1;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[ev.key]) { ev.preventDefault(); if (!ev.repeat) peSnap(); it.x = +(it.x + moves[ev.key][0]).toFixed(2); it.y = +(it.y + moves[ev.key][1]).toFixed(2); peUpdateItem(it); }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); peSnap(); peRemove(it); peDraw(); drawPeTray(); }
  });

  // ---------- Recaps ----------
  function stripHTML(ym, map) {
    const n = D.daysIn(ym);
    let s = '';
    for (let d = 1; d <= n; d++) {
      const list = map.get(`${ym}-${pad(d)}`) || [];
      const hasPhoto = list.some((e) => e.photoIds.length);
      s += `<i class="${list.length ? (hasPhoto ? 'on photo' : 'on') : ''}"></i>`;
    }
    return `<div class="strip" style="--days:${n}" aria-hidden="true">${s}</div>`;
  }
  const moodChips = (counts, unit = 'entries') => `<div class="mood-chips">${counts.map(([m, c]) =>
    `<span class="mood-chip" style="--mc:${m[3]}"><span class="mood-e">${m[1]}</span>${m[2]} <span style="color:var(--ink-2);font-weight:500">${c}</span></span>`).join('')}</div>`;
  function renderRecap(arg) {
    const today = D.today();
    if (arg && /^\d{4}$/.test(arg)) return renderYear(arg, today);
    if (arg && /^w\d{4}-\d{2}-\d{2}$/.test(arg)) return renderWeek(weekStart(arg.slice(1)), today);
    return renderMonth(arg && /^\d{4}-\d{2}$/.test(arg) ? arg : D.ym(today), today);
  }
  function recapHead(mode, prev, next, monthYm, year, wk = null) {
    const wkStart = wk || (monthYm === D.ym(D.today()) ? weekStart(D.today()) : weekStart(monthYm + '-01'));
    return `<header class="recap-head">
      <nav class="seg" aria-label="Recap period">
        <a href="#/recap/w${wkStart}" aria-current="${mode === 'week'}">Week</a>
        <a href="#/recap/${monthYm}" aria-current="${mode === 'month'}">Month</a>
        <a href="#/recap/${year}" aria-current="${mode === 'year'}">Year</a>
      </nav>
      <span class="spacer"></span>
      ${mode !== 'week' ? `<a class="btn btn-line print-btn" href="#/print/${mode === 'year' ? year : monthYm}">Save as PDF</a>` : ''}
      <a class="icon-btn" href="${prev}" aria-label="Previous ${mode}">${ICON.left}</a>
      <a class="icon-btn" href="${next}" aria-label="Next ${mode}">${ICON.right}</a>
    </header>`;
  }
  function renderMonth(ym, today) {
    view.dataset.title = D.monthName(ym) + ' recap';
    const list = entries.filter((e) => e.date.startsWith(ym));
    const s = stats(list), map = byDate();
    const total = D.daysIn(ym);
    const isCurrent = ym === D.ym(today);
    const elapsed = isCurrent ? Number(today.slice(8)) : total;
    const year = ym.slice(0, 4);
    let body;
    if (!list.length) {
      body = `<p class="recap-summary">${ym > D.ym(today) ? 'This month hasn’t happened yet.' : `Nothing written in ${esc(D.monthName(ym, { month: 'long' }))}.`}</p>
        ${ym <= D.ym(today) ? `<div class="recap-section"><button class="btn btn-primary" data-action="new" data-date="${isCurrent ? today : ym + '-01'}">Write an entry</button></div>` : ''}`;
    } else {
      const photos = photosOf([...list].reverse());
      const shown = photos.slice(0, 30);
      const mc = moodCounts(list);
      let sentence = `You wrote on <b>${s.days}</b> of ${isCurrent ? `the ${elapsed} days so far` : `${total} days`}`;
      sentence += s.photos ? `, adding <b>${plural(s.photos, 'photo')}</b> and <b>${plural(s.words, 'word')}</b>.` : ` and wrote <b>${plural(s.words, 'word')}</b>.`;
      if (s.run > 1) sentence += ` Your longest run was <b>${s.run} days</b> in a row.`;
      if (mc.length) sentence += ` You felt ${mc[0][0][2].toLowerCase()} ${mc[0][0][1]} most often.`;
      body = `<p class="recap-summary">${sentence}</p>
        ${stripHTML(ym, map)}
        <div class="strip-legend"><span class="l-photo">With photos</span><span class="l-on">Text only</span><span>No entry</span></div>
        ${mc.length ? `<section class="recap-section"><h2>Moods</h2>${moodChips(mc)}</section>` : ''}
        ${list.some((e) => e.fav) ? `<section class="recap-section"><h2>Favorites</h2><div class="mem-row">${[...list].reverse().filter((e) => e.fav).map((e) => memCard(e)).join('')}</div></section>` : ''}
        ${shown.length ? `<section class="recap-section"><h2>Photos${photos.length > shown.length ? ` (${shown.length} of ${photos.length})` : ''}</h2>
          <div class="mosaic">${shown.map((p, i) => { const big = i === 0 || (i % 9 === 5 && shown.length > 8); return `<button class="tile ${big ? 'big' : ''}" data-action="mphoto" data-index="${i}" aria-label="Open photo from ${esc(D.long(p.date))}">${imgTag(p.id, big ? 'md' : 'thumb')}${stamp(p.date)}</button>`; }).join('')}</div>
        </section>` : ''}
        <section class="recap-section"><h2>Entries</h2>
          <ul class="entry-rows">${[...list].reverse().map((e) => `<li><a href="#/entry/${e.id}">
            <span class="dnum">${Number(e.date.slice(8))}<small>${esc(D.parse(e.date).toLocaleDateString(undefined, { weekday: 'short' }))}</small></span>
            <span>${titleHTML(e, 'span', 'rt', e.title || excerpt(e.text, 60) || 'Untitled')}${e.title && e.text ? `<span class="rx">${moodOf(e.mood) ? moodOf(e.mood)[1] + ' ' : ''}${esc(excerpt(e.text, 120))}</span>` : ''}</span>
            ${e.photoIds[0] ? `<span class="rthumb ph">${imgTag(e.photoIds[0])}</span>` : '<span></span>'}
          </a></li>`).join('')}</ul>
        </section>`;
      state.recapPhotos = shown.map((p) => p.id);
    }
    view.innerHTML = `<div class="page-wide">
      ${recapHead('month', `#/recap/${D.addMonths(ym, -1)}`, `#/recap/${D.addMonths(ym, 1)}`, ym, year)}
      <h1 class="recap-title">${esc(D.monthName(ym))}</h1>
      ${body}</div>`;
  }
  function renderYear(year, today) {
    view.dataset.title = year + ' recap';
    const list = entries.filter((e) => e.date.startsWith(year));
    const s = stats(list), map = byDate();
    const monthYm = year === today.slice(0, 4) ? D.ym(today) : `${year}-01`;
    let summary, moodsHTML = '';
    if (!list.length) {
      summary = `<p class="recap-summary">${year > today.slice(0, 4) ? 'This year hasn’t happened yet.' : `Nothing written in ${year}.`}</p>`;
    } else {
      const perMonth = Array.from({ length: 12 }, (_, i) => list.filter((e) => e.date.slice(5, 7) === pad(i + 1)).length);
      const best = perMonth.indexOf(Math.max(...perMonth));
      let sentence = `In ${year} you wrote on <b>${plural(s.days, 'day')}</b>, with <b>${plural(s.entries, 'entry', 'entries')}</b>, <b>${plural(s.photos, 'photo')}</b> and <b>${plural(s.words, 'word')}</b> in all.`;
      if (s.entries > 1) sentence += ` ${esc(D.monthName(`${year}-${pad(best + 1)}`, { month: 'long' }))} was your busiest month.`;
      if (s.run > 1) sentence += ` Your longest run was <b>${s.run} days</b> in a row.`;
      summary = `<p class="recap-summary">${sentence}</p>`;
      // Year in moods: one square per day, colored by that day's mood
      const days = new Map();
      for (const [date, dl] of map) if (date.startsWith(year)) { const m = dayMood(dl); if (m) days.set(date, m); }
      if (days.size) {
        const counts = new Map();
        days.forEach((m) => counts.set(m[0], (counts.get(m[0]) || 0) + 1));
        const sorted = [...counts].sort((a, b) => b[1] - a[1]).map(([id, n]) => [moodOf(id), n]);
        const top = sorted[0];
        let grid = '';
        for (let mo = 1; mo <= 12; mo++) {
          const ym = `${year}-${pad(mo)}`, dim = D.daysIn(ym);
          grid += `<span class="ml">${esc(D.monthName(ym, { month: 'short' }))}</span>`;
          for (let d = 1; d <= 31; d++) {
            if (d > dim) { grid += '<i class="x"></i>'; continue; }
            const m = days.get(`${ym}-${pad(d)}`);
            grid += m ? `<i class="m" style="--mc:${m[3]}" title="${esc(D.long(`${ym}-${pad(d)}`))}: ${m[2]}"></i>` : '<i></i>';
          }
        }
        moodsHTML = `<section class="recap-section"><h2>Year in moods</h2>
          <p class="recap-sub">You recorded a mood on ${plural(days.size, 'day')}. ${top[0][1]} ${top[0][2]} was the most common, on ${plural(top[1], 'day')}.</p>
          <div class="mood-bar" aria-hidden="true">${sorted.map(([m, c]) => `<span style="--mc:${m[3]};flex:${c}"></span>`).join('')}</div>
          ${moodChips(sorted)}
          <div class="pixels" role="img" aria-label="Mood for each day of ${year}">${grid}</div>
        </section>`;
      }
    }
    const tiles = Array.from({ length: 12 }, (_, i) => {
      const ym = `${year}-${pad(i + 1)}`;
      const ml = list.filter((e) => e.date.startsWith(ym));
      const cover = [...ml].reverse().map((e) => e.photoIds[0]).find(Boolean);
      const ms = stats(ml);
      const future = ym > D.ym(today);
      const top = moodCounts(ml)[0];
      return `<a class="mtile ${ml.length ? '' : 'quiet'}" href="#/recap/${ym}">
        ${cover ? `<div class="cover ph">${imgTag(cover, 'md')}</div>` : `<div class="cover none">${future ? 'Still to come' : (ml.length ? 'No photos' : '')}</div>`}
        <div class="mt-body"><h3>${esc(D.monthName(ym, { month: 'long' }))} ${top ? `<span class="mood-e" title="Most common mood: ${top[0][2]}">${top[0][1]}</span>` : ''}</h3>
          <p class="mt-meta">${ml.length ? plural(ms.entries, 'entry', 'entries') + (ms.photos ? `, ${plural(ms.photos, 'photo')}` : '') : 'No entries'}</p>
          ${stripHTML(ym, map)}
        </div></a>`;
    }).join('');
    view.innerHTML = `<div class="page-wide">
      ${recapHead('year', `#/recap/${Number(year) - 1}`, `#/recap/${Number(year) + 1}`, monthYm, year)}
      <h1 class="recap-title">${year}</h1>
      ${summary}
      ${list.length ? `<div class="recap-section" style="margin-top:22px"><button class="btn btn-primary" data-action="story" data-year="${year}">▶ Play your ${year} in review</button></div>` : ''}
      ${moodsHTML}
      ${list.length ? `<section class="recap-section"><h2>Best of ${year}</h2>${list.some((e) => e.fav) ? `<div class="mem-row">${[...list].reverse().filter((e) => e.fav).map((e) => memCard(e)).join('')}</div>` : '<p class="recap-sub">Star your favorite entries (☆ Favorite on an entry) and they’ll be collected here.</p>'}</section>` : ''}
      <section class="recap-section"><h2>Month by month</h2><div class="months">${tiles}</div></section>
    </div>`;
  }

  // ---------- People & places pages ----------
  function renderPeople() {
    view.dataset.title = 'People, places & tags';
    const ppl = [...people].sort((a, b) => personEntries(b.id).length - personEntries(a.id).length || a.name.localeCompare(b.name));
    const pls = [...places].sort((a, b) => placeEntries(b.id).length - placeEntries(a.id).length || a.name.localeCompare(b.name));
    view.innerHTML = `<div class="page-wide">
      <header class="page-head"><h1>People, places &amp; tags</h1></header>
      <div class="sec-head"><h2>People</h2><button class="btn btn-line" data-action="add-person">Add person</button></div>
      <div class="people-grid">
        ${ppl.map((p) => { const n = personEntries(p.id).length; return `<a class="pcard" href="#/person/${p.id}">${avatarHTML(p, 'lg')}<b>${esc(p.name)}</b><small>${n ? plural(n, 'memory', 'memories') : 'No memories yet'}</small></a>`; }).join('')}
        <button class="pcard add" data-action="add-person">${ppl.length ? 'Add someone' : 'Add a friend or family member, with their photo. Then tag them in entries.'}</button>
      </div>
      <div class="sec-head"><h2>Places</h2><div class="row-tight"><a class="btn btn-line" href="#/map">${ICON.pin}Map of memories</a><button class="btn btn-line" data-action="add-place">Add place</button></div></div>
      ${pls.length ? `<ul class="plist">${pls.map((pl) => { const n = placeEntries(pl.id).length; return `<li><a href="#/place/${pl.id}"><span class="pin">${ICON.pin}</span><span><b>${esc(pl.name)}</b><small>${esc(placeSub(pl))}</small></span><span class="count">${n ? plural(n, 'memory', 'memories') : ''}</span></a></li>`; }).join('')}</ul>`
        : `<div class="note"><p>Save the places that matter (home, the library, a favorite café) with an address or a Google Maps link. Entries tagged with a place show a map.</p><button class="btn btn-primary" data-action="add-place">Add a place</button></div>`}
      ${tagsSectionHTML()}
    </div>`;
  }
  function renderPerson(id) {
    const p = personById(id);
    if (!p) { view.dataset.title = ''; view.innerHTML = `<div class="page">${backBtn}<p class="no-results">This person is no longer in your journal.</p></div>`; return; }
    view.dataset.title = p.name;
    const list = personEntries(id);
    view.innerHTML = `<div class="page-wide">${backBtn}
      <header class="prof-head">${avatarHTML(p, 'xl')}<div><h1>${esc(p.name)}</h1><p>${list.length ? plural(list.length, 'memory', 'memories') + ` together, since ${esc(D.medium(list[list.length - 1].date))}` : 'No memories yet'}</p></div>
        <span class="spacer"></span><button class="btn btn-line" data-action="edit-person" data-id="${p.id}">Edit</button></header>
      ${list.length ? `<div class="tiles size-m">${list.map((e) => tileHTML(e, 'm')).join('')}</div>` : `<div class="note"><p>Tag ${esc(p.name)} in an entry under “Who was there” and it will show up here.</p></div>`}
    </div>`;
  }
  function renderPlace(id) {
    const pl = placeById(id);
    if (!pl) { view.dataset.title = ''; view.innerHTML = `<div class="page">${backBtn}<p class="no-results">This place is no longer in your journal.</p></div>`; return; }
    view.dataset.title = pl.name;
    const list = placeEntries(id);
    view.innerHTML = `<div class="page-wide">${backBtn}
      <header class="prof-head"><span class="avatar lg" style="color:var(--sea)">${ICON.pin}</span><div><h1>${esc(pl.name)}</h1><p>${esc(placeSub(pl))}${list.length ? ` · ${plural(list.length, 'memory', 'memories')}` : ''}</p></div>
        <span class="spacer"></span><a class="btn btn-line" href="${esc(mapLink(pl))}" target="_blank" rel="noopener">Open in Google Maps</a><button class="btn btn-line" data-action="edit-place" data-id="${pl.id}">Edit</button></header>
      <div class="prof-map"><div class="map-box">${mapEmbed(pl)}</div></div>
      ${list.length ? `<div class="tiles size-m">${list.map((e) => tileHTML(e, 'm')).join('')}</div>` : `<div class="note"><p>Pick ${esc(pl.name)} under “Where” when you write an entry and it will show up here.</p></div>`}
    </div>`;
  }

  // Person dialog
  const personDlg = $('#personDlg');
  const pd = { person: null, photo: undefined, url: '', onSave: null };
  function pdPreview() {
    const el = $('#pdAvatar');
    const u = pd.photo === undefined ? (pd.person ? avatarURL.get(pd.person.id) : '') : pd.url;
    el.innerHTML = u ? `<img src="${u}" alt="">` : esc(initials($('#pdName').value || '?'));
  }
  function openPerson(person = null, onSave = null) {
    pd.person = person; pd.photo = undefined; pd.onSave = onSave;
    if (pd.url) { URL.revokeObjectURL(pd.url); pd.url = ''; }
    $('#pdHeading').textContent = person ? 'Edit person' : 'New person';
    $('#pdName').value = person ? person.name : '';
    $('#pdError').textContent = '';
    $('#pdDanger').hidden = !person;
    pdPreview();
    personDlg.showModal();
    setTimeout(() => $('#pdName').focus(), 30);
  }
  $('#pdName').addEventListener('input', () => { if (!pd.url && !(pd.person && avatarURL.get(pd.person.id) && pd.photo === undefined)) pdPreview(); });
  $('#pdFile').addEventListener('change', async (ev) => {
    const f = ev.target.files[0]; ev.target.value = '';
    if (!f) return;
    try {
      const img = await decode(f);
      const r = await shrink(img, 400, 0.86, true);
      if (img.close) img.close();
      pd.photo = r.blob;
      if (pd.url) URL.revokeObjectURL(pd.url);
      pd.url = URL.createObjectURL(r.blob);
      pdPreview();
    } catch (_) { $('#pdError').textContent = 'That photo couldn’t be opened. Try a JPEG or PNG.'; }
  });
  $('#personForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = $('#pdName').value.trim();
    if (!name) { $('#pdError').textContent = 'Add a name.'; return; }
    const rec = { id: pd.person ? pd.person.id : uid(), name, photo: pd.photo !== undefined ? pd.photo : (pd.person ? pd.person.photo : null), createdAt: pd.person ? pd.person.createdAt : Date.now() };
    try { await DB.put('people', rec); } catch (_) { $('#pdError').textContent = 'This person couldn’t be saved. Try again.'; return; }
    const i = people.findIndex((p) => p.id === rec.id);
    if (i >= 0) people[i] = rec; else people.push(rec);
    setAvatar(rec);
    personDlg.close();
    toast(pd.person ? 'Person updated' : `${name} added`);
    if (pd.onSave) pd.onSave(rec); else route();
  });
  personDlg.addEventListener('click', async (ev) => {
    if (ev.target.closest('[data-close]')) personDlg.close();
    if (ev.target.closest('[data-pd="delete"]') && pd.person) {
      if (!confirm(`Remove ${pd.person.name}? Your entries stay; they just won’t be tagged with this person.`)) return;
      const id = pd.person.id;
      const changed = entries.filter((e) => e.peopleIds.includes(id)).map((e) => ({ ...e, peopleIds: e.peopleIds.filter((x) => x !== id) }));
      await DB.putEntries(changed); await DB.del('people', id);
      changed.forEach((c) => { const i = entries.findIndex((e) => e.id === c.id); entries[i] = c; });
      people = people.filter((p) => p.id !== id);
      personDlg.close(); toast('Person removed');
      if (/^#\/person\//.test(location.hash)) go('#/people'); else route();
    }
  });

  // Place dialog
  const placeDlg = $('#placeDlg');
  const pdl = { place: null, lat: null, lng: null, onSave: null };
  function plCurrent() {
    const parsed = parseAddr($('#plAddr').value);
    return { name: $('#plName').value.trim(), addr: parsed.addr, link: parsed.link, lat: parsed.lat ?? pdl.lat, lng: parsed.lng ?? pdl.lng };
  }
  function plMap() {
    const c = plCurrent();
    $('#plMap').innerHTML = (c.name || c.addr || c.lat != null) ? mapEmbed({ ...c, name: c.name || c.addr || 'Place' }) : '';
  }
  function openPlace(place = null, onSave = null, prefill = null) {
    pdl.place = place; pdl.onSave = onSave;
    pdl.lat = place ? place.lat : null; pdl.lng = place ? place.lng : null;
    $('#plHeading').textContent = place ? 'Edit place' : 'New place';
    $('#plName').value = place ? place.name : '';
    $('#plAddr').value = place ? (place.link || place.addr || (place.lat != null ? `${place.lat}, ${place.lng}` : '')) : '';
    $('#plStatus').textContent = ''; $('#plError').textContent = '';
    $('#plDanger').hidden = !place;
    $('#plMap').innerHTML = place ? mapEmbed(place) : '';
    if (prefill && prefill.lat != null) {
      pdl.lat = prefill.lat; pdl.lng = prefill.lng;
      $('#plAddr').value = `${prefill.lat}, ${prefill.lng}`;
      $('#plStatus').textContent = 'Location from your photo.';
      $('#plMap').innerHTML = mapEmbed({ name: 'Photo location', lat: prefill.lat, lng: prefill.lng });
    }
    placeDlg.showModal();
    setTimeout(() => $('#plName').focus(), 30);
  }
  $('#plAddr').addEventListener('input', () => { pdl.lat = null; pdl.lng = null; });
  $('#plAddr').addEventListener('change', plMap);
  $('#plName').addEventListener('change', () => { if (!$('#plAddr').value.trim()) plMap(); });
  $('#placeForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const c = plCurrent();
    if (!c.name) { $('#plError').textContent = 'Add a name for this place.'; return; }
    const rec = { id: pdl.place ? pdl.place.id : uid(), name: c.name, addr: c.addr, link: c.link, lat: c.lat, lng: c.lng, createdAt: pdl.place ? pdl.place.createdAt : Date.now() };
    try { await DB.put('places', rec); } catch (_) { $('#plError').textContent = 'This place couldn’t be saved. Try again.'; return; }
    const i = places.findIndex((p) => p.id === rec.id);
    if (i >= 0) places[i] = rec; else places.push(rec);
    placeDlg.close();
    toast(pdl.place ? 'Place updated' : `${rec.name} added`);
    if (pdl.onSave) pdl.onSave(rec); else route();
  });
  placeDlg.addEventListener('click', async (ev) => {
    if (ev.target.closest('[data-close]')) placeDlg.close();
    if (ev.target.closest('[data-pl="locate"]')) {
      if (!navigator.geolocation) { $('#plStatus').textContent = 'This browser can’t share your location.'; return; }
      $('#plStatus').textContent = 'Finding you…';
      navigator.geolocation.getCurrentPosition((pos) => {
        pdl.lat = +pos.coords.latitude.toFixed(6); pdl.lng = +pos.coords.longitude.toFixed(6);
        $('#plAddr').value = `${pdl.lat}, ${pdl.lng}`;
        $('#plStatus').textContent = 'Location added.';
        plMap();
      }, (err) => {
        $('#plStatus').textContent = err.code === 1 ? 'Location permission was denied. Type an address or paste a Google Maps link instead.' : 'Your location couldn’t be found. Type an address or paste a Google Maps link instead.';
      }, { enableHighAccuracy: true, timeout: 12000 });
    }
    if (ev.target.closest('[data-pl="delete"]') && pdl.place) {
      if (!confirm(`Remove ${pdl.place.name}? Your entries stay; they just won’t be tagged with this place.`)) return;
      const id = pdl.place.id;
      const changed = entries.filter((e) => e.placeId === id).map((e) => ({ ...e, placeId: '' }));
      await DB.putEntries(changed); await DB.del('places', id);
      changed.forEach((c) => { const i = entries.findIndex((e) => e.id === c.id); entries[i] = c; });
      places = places.filter((p) => p.id !== id);
      placeDlg.close(); toast('Place removed');
      if (/^#\/place\//.test(location.hash)) go('#/people'); else route();
    }
  });

  // ---------- Settings ----------
  function segHTML(key, label, opts) {
    return `<div class="seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, name]) =>
      `<button type="button" role="radio" data-set="${key}" data-val="${v}" aria-pressed="${String(settings[key]) === String(v)}" aria-checked="${String(settings[key]) === String(v)}">${name}</button>`).join('')}</div>`;
  }
  async function renderSettings() {
    view.dataset.title = 'Settings';
    const s = stats(entries);
    const sample = (entries.find((e) => e.title) || {}).title || 'Evening by the lake';
    const now = season();
    view.innerHTML = `<div class="page">
      <header class="page-head"><h1>Settings</h1><a class="btn btn-line" href="#/help">📘 Tutorials</a></header>
      <section class="panel">
        <h2>Your name</h2>
        <p>Used in the greeting on the home page.</p>
        <div class="row"><input class="text-input" id="setName" type="text" maxlength="40" placeholder="Your name" value="${esc(settings.name)}" autocomplete="given-name"></div>
      </section>
      <section class="panel" id="security">
        <h2>Privacy &amp; security</h2>
        ${lockOn() ? `<p>Your journal is locked with a passcode and encrypted on this device. Without the passcode, entries and photos can’t be read, even by someone with technical tools.</p>
          <div class="look"><div class="look-row"><b>Lock automatically after</b>${segHTML('autolock', 'Auto-lock', [[1, '1 minute'], [5, '5 minutes'], [15, '15 minutes'], [60, '1 hour'], [0, 'Only when I close it']])}</div></div>
          <div class="row"><button class="btn btn-primary" data-action="lock-now">${ICON.lock}Lock now</button><button class="btn btn-line" data-action="change-pass">Change passcode</button><button class="btn btn-danger" data-action="off-pass">Turn off passcode</button></div>`
        : `<p>Set a passcode to lock your journal. Everything (entries, photos, people, places and tags) gets encrypted on this device, and the journal locks itself when you step away.</p>
          <p style="margin-top:8px"><b>Make a backup first.</b> If you forget the passcode, the journal can’t be opened; only a backup file can bring it back.</p>
          <div class="row"><button class="btn btn-line" data-action="export">Export a backup</button><button class="btn btn-primary" data-action="set-pass">${ICON.lock}Set a passcode</button></div>`}
      </section>
      <section class="panel">
        <h2>Theme</h2>
        <p>Colors for the whole journal. Your photos are never tinted. Seasonal switches by itself through the year, with snow on the home page in winter and falling leaves in autumn.</p>
        <div class="themes" role="radiogroup" aria-label="Theme">${THEMES.map(([id, name]) => `
          <button type="button" class="swatch${id === 'auto' ? ' sw-auto' : ''}" role="radio" data-theme="${id === 'seasonal' ? now : id === 'auto' ? resolveName(settings.autoLight) : id}" data-set-theme="${id}" aria-checked="${settings.theme === id}">
            <span class="sw-art"><span class="sw-card"><span class="sw-line"></span><span class="sw-line"></span></span><span class="sw-dot"></span></span>
            <span class="sw-name">${name}${id === 'seasonal' ? `<br><small style="font-weight:500;color:var(--ink-2)">Now: ${now[0].toUpperCase() + now.slice(1)}</small>` : id === 'auto' ? `<br><small style="font-weight:500;color:var(--ink-2)">Follows your device</small>` : ''}</span>
          </button>`).join('')}</div>
        <div class="auto-pick" ${settings.theme === 'auto' ? '' : 'hidden'}>
          <label class="field"><span>Daytime theme</span><select class="text-input" id="autoLight">${THEMES.filter(([id]) => !['auto', 'midnight', 'charcoal', 'plum'].includes(id)).map(([id, n]) => `<option value="${id}"${settings.autoLight === id ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="field"><span>Night theme</span><select class="text-input" id="autoDark">${[['midnight', 'Midnight'], ['charcoal', 'Charcoal'], ['plum', 'Plum night']].map(([id, n]) => `<option value="${id}"${settings.autoDark === id ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        </div>
      </section>
      <section class="panel">
        <h2>Title font</h2>
        <p>The default style for entry titles. You can also pick a different font for a single entry while writing it.</p>
        <div class="fonts" role="radiogroup" aria-label="Title font">${FONTS.map(([id, name]) => `
          <button type="button" class="font-opt" role="radio" data-set-font="${id}" aria-checked="${settings.titleFont === id}">
            <span class="title-text tf-${id}">${esc(sample)}</span><small>${name}</small>
          </button>`).join('')}</div>
      </section>
      <section class="panel">
        <h2>Journal look</h2>
        <p>How entries look when you open them.</p>
        <div class="look">
          <div class="look-row"><b>Paper</b>${segHTML('paper', 'Paper', [['plain', 'Plain'], ['dotted', 'Dotted'], ['lined', 'Lined'], ['grid', 'Grid'], ['grain', 'Grain']])}</div>
          <div class="look-row"><b>Photo frames</b>${segHTML('frame', 'Photo frames', [['none', 'None'], ['print', 'White print'], ['polaroid', 'Polaroid']])}</div>
          <div class="look-row"><b>Date stamp</b>${segHTML('stamp', 'Date stamp', [['film', 'Film camera'], ['rubber', 'Rubber stamp'], ['hand', 'Handwritten']])}
            <span class="stamp-demo">${stamp(D.today(), 'stamp-paper')}</span></div>
          <div class="look-row"><b>Drop caps</b>${segHTML('dropcap', 'Drop caps', [[true, 'On'], [false, 'Off']])}</div>
        </div>
        <p style="margin-top:14px;font-size:13.5px">To arrange photos, washi tape, stickers, notes and your own PNGs on a page, open an entry and choose Edit page. Photo frames here also set the frame for photos you add to a page.</p>
      </section>
      <section class="panel">
        <h2>Home slideshow</h2>
        <p>How long each memory stays on screen before the next one.</p>
        <div class="row">${segHTML('interval', 'Slide length', [[5, '5 seconds'], [8, '8 seconds'], [12, '12 seconds'], [20, '20 seconds']])}</div>
      </section>
      ${phonePanelHTML()}
      ${photosPanelHTML()}
      <section class="panel" id="backup">
        <h2>Backup</h2>
        <p>Your journal is stored in this browser on this device. Keep backups: export one now and then, or turn on automatic backup below, and always make one before clearing browser data or switching browsers. The backup includes people, places and tags.${lockOn() ? ' While a passcode is set, backups are encrypted too and need that passcode to import.' : ''}</p>
        <p style="margin-top:8px">${settings.lastBackup ? `Last backup: <b>${esc(new Date(settings.lastBackup).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }))}</b>.` : 'You haven’t made a backup yet.'}</p>
        <div class="facts">
          <span><b>${num(s.entries)}</b> ${s.entries === 1 ? 'entry' : 'entries'}</span>
          <span><b>${num(s.photos)}</b> ${s.photos === 1 ? 'photo' : 'photos'}</span>
          <span><b>${num(people.length)}</b> ${people.length === 1 ? 'person' : 'people'}</span>
          <span><b>${num(places.length)}</b> ${places.length === 1 ? 'place' : 'places'}</span>
          <span id="usage"></span>
        </div>
        <div class="row">
          <button class="btn btn-primary" data-action="export">Export backup</button>
          <button class="btn btn-line" data-action="import-photos">Import photos</button>
          <label class="btn btn-line file-btn">Import backup<input type="file" id="importFile" accept=".json,application/json"></label>
        </div>
        ${autoBackupHTML()}
        <div class="look" style="margin-top:16px"><div class="look-row"><b>Remind me to back up</b>${segHTML('backupEvery', 'Backup reminder', [[7, 'Every week'], [14, 'Every 2 weeks'], [30, 'Every month'], [0, 'Never']])}</div></div>
        <p style="margin-top:12px;font-size:13.5px">Importing adds the entries from a backup file. Entries you already have are kept; matching ones are replaced by the version in the file.</p>
      </section>
    </div>`;
    $('#setName').addEventListener('input', (ev) => saveSettings({ name: ev.target.value.trim() }));
    $('#autoLight').addEventListener('change', (ev) => { saveSettings({ autoLight: ev.target.value }); const sw = $('.sw-auto'); if (sw) sw.dataset.theme = resolveName(settings.autoLight); });
    $('#autoDark').addEventListener('change', (ev) => saveSettings({ autoDark: ev.target.value }));
    view.querySelector('.themes').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-set-theme]'); if (!b) return;
      saveSettings({ theme: b.dataset.setTheme });
      $$('[data-set-theme]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      $('.auto-pick').hidden = settings.theme !== 'auto';
    });
    view.querySelector('.fonts').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-set-font]'); if (!b) return;
      saveSettings({ titleFont: b.dataset.setFont });
      $$('[data-set-font]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    });
    $('#importFile').addEventListener('change', async (ev) => {
      const f = ev.target.files[0]; ev.target.value = '';
      if (f) await importBackup(f);
    });
    const bkF = $('#bkFolder'), bkD = $('#bkDrive');
    if (bkF) bkF.addEventListener('change', () => { if (bkF.checked && !bk.dir) { bkF.checked = false; chooseBackupDir(); } else saveSettings({ backupToFolder: bkF.checked }); });
    if (bkD) bkD.addEventListener('change', () => { saveSettings({ backupToDrive: bkD.checked }); if (bkD.checked && !DJ.drive.token()) toast('Choose Connect Google Drive in “Phone app & Google Drive” so backups can go there.', 4500); });
    drawPhoneQR(); refreshSyncUI();
    const sec = (location.hash.match(/^#\/settings\/(\w+)/) || [])[1];
    if (sec && $('#' + sec)) requestAnimationFrame(() => $('#' + sec).scrollIntoView({ block: 'start' }));
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const el = $('#usage');
        if (el && est.usage != null) el.innerHTML = `<b>${(est.usage / 1048576).toFixed(1)} MB</b> used`;
        const u2 = $('#usage2'); if (u2 && est.usage != null) u2.textContent = `The journal uses ${(est.usage / 1048576).toFixed(1)} MB in this browser.`;
      } catch (_) { /* ignore */ }
    }
  }
  function settingsSegClick(ev) {
    const b = ev.target.closest('[data-set]');
    if (!b || !/^#\/(settings|backup)/.test(location.hash)) return;
    const key = b.dataset.set, raw = b.dataset.val;
    const val = raw === 'true' ? true : raw === 'false' ? false : /^\d+$/.test(raw) ? Number(raw) : raw;
    saveSettings({ [key]: val });
    $$(`[data-set="${key}"]`).forEach((x) => { const on = x === b; x.setAttribute('aria-pressed', String(on)); x.setAttribute('aria-checked', String(on)); });
    if (key === 'autoBackup' && val) runAutoBackup();
    if (key === 'stamp') { const demo = $('.stamp-demo'); if (demo) demo.innerHTML = stamp(D.today(), 'stamp-paper'); }
  }

  view.addEventListener('click', settingsSegClick);

  // ---------- Backup ----------
  const blobToDataURL = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
  function dataURLToBlob(u) {
    const [head, b64] = u.split(',');
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function exportBackup() {
    toast('Preparing backup…');
    const { blob, count } = await makeBackup();
    download(blob, `journal-backup-${D.today()}.json`);
    saveSettings({ lastBackup: Date.now(), backupSnooze: 0 });
    toast(`Backup exported: ${plural(count, 'entry', 'entries')}${lockOn() ? ' (encrypted)' : ''}`);
  }
  async function makeBackup() {
    const [ents, ppl, pls, tgs] = await Promise.all([DB.allEntries(), DB.allPeople(), DB.allPlaces(), DB.allTags()]);
    const pplOut = [];
    for (const p of ppl) pplOut.push({ id: p.id, name: p.name, createdAt: p.createdAt, photo: p.photo ? await blobToDataURL(p.photo) : null });
    const parts = [`{"app":"digital-journal","version":3,"exportedAt":"${new Date().toISOString()}","entries":${JSON.stringify(ents)},"people":${JSON.stringify(pplOut)},"places":${JSON.stringify(pls)},"tags":${JSON.stringify(tgs)},"photos":[`];
    // Photos one at a time (decrypting each if the journal is locked), skipping unsaved draft photos
    let first = true;
    for (const id of await DB.keys('photos')) {
      const p = await DB.getPhoto(id);
      if (!p || p.entryId === '__draft__') continue;
      parts.push((first ? '' : ',') + JSON.stringify({ id: p.id, entryId: p.entryId, w: p.w, h: p.h, addedAt: p.addedAt, png: !!p.png, kind: p.kind || '', dur: p.dur || 0,
        full: await blobToDataURL(p.blob), thumb: p.thumb ? await blobToDataURL(p.thumb) : '' }));
      first = false;
    }
    parts.push(']}');
    let out = new Blob(parts, { type: 'application/json' });
    if (lockOn() && CRYPT.key) {
      // Encrypted backup: the data key travels inside, wrapped by your passcode, like on this device
      const enc = await encBytes(new Uint8Array(await out.arrayBuffer()));
      out = new Blob([JSON.stringify({ app: 'digital-journal', version: 3, encrypted: true, exportedAt: new Date().toISOString(), lock: lockInfo(), data: b64(enc) })], { type: 'application/json' });
    }
    return { blob: out, count: ents.length };
  }
  async function importBackup(file) {
    try {
      toast('Importing…');
      let data = JSON.parse(await file.text());
      if (data && data.app === 'digital-journal' && data.encrypted) {
        const pass = await openPass('backup');
        if (pass == null) { toast('Import cancelled'); return; }
        let key;
        try { ({ key } = await unwrapKey(pass, data.lock)); } catch (_) { throw new Error('That passcode doesn’t open this backup.'); }
        toast('Importing…', 60000);
        data = JSON.parse(td.decode(await decBytes(unb64(data.data), key)));
      }
      if (!data || data.app !== 'digital-journal' || !Array.isArray(data.entries)) throw new Error('This file isn’t a Digital Journal backup.');
      const fontIds = FONTS.map((f) => f[0]);
      const ents = data.entries.filter((e) => e && e.id && D.valid(e.date)).map((e) => norm({
        ...e, titleFont: fontIds.includes(e.titleFont) ? e.titleFont : '', mood: moodOf(e.mood) ? e.mood : '',
        tint: TINTS.some((t) => t[0] === e.tint) ? e.tint : 'mood', createdAt: e.createdAt || Date.now(), updatedAt: e.updatedAt || Date.now(),
      }));
      const photos = (data.photos || []).filter((p) => p && p.id && p.full).map((p) => ({
        id: p.id, entryId: p.entryId, w: p.w, h: p.h, addedAt: p.addedAt || Date.now(), png: !!p.png, ...(p.kind ? { kind: p.kind, dur: p.dur || 0 } : {}),
        blob: dataURLToBlob(p.full), thumb: p.thumb ? dataURLToBlob(p.thumb) : (p.kind ? null : dataURLToBlob(p.full)),
      }));
      const tgs = (data.tags || []).filter((t) => t && t.id && t.name).map((t) => ({ id: t.id, name: String(t.name).slice(0, 40), color: t.color || TAG_COLORS[0], createdAt: t.createdAt || Date.now() }));
      const ppl = (data.people || []).filter((p) => p && p.id && p.name).map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt || Date.now(), photo: p.photo ? dataURLToBlob(p.photo) : null }));
      const pls = (data.places || []).filter((p) => p && p.id && p.name).map((p) => ({ id: p.id, name: p.name, addr: p.addr || '', link: p.link || '', lat: p.lat ?? null, lng: p.lng ?? null, createdAt: p.createdAt || Date.now() }));
      // Tags with the same name as one you already have are merged into it
      const byName = new Map(tags.map((t) => [t.name.toLowerCase(), t.id]));
      const remap = new Map();
      const newTags = [];
      for (const t of tgs) { const ex = byName.get(t.name.toLowerCase()); if (ex && ex !== t.id) remap.set(t.id, ex); else { newTags.push(t); byName.set(t.name.toLowerCase(), t.id); } }
      if (remap.size) ents.forEach((e) => { e.tags = [...new Set(e.tags.map((id) => remap.get(id) || id))]; });
      await DB.putMany({ entries: ents, photos, people: ppl, places: pls, tags: newTags });
      photos.forEach((p) => forgetPhoto(p.id));
      await loadAll();
      toast(`Imported ${plural(ents.length, 'entry', 'entries')}`);
      route();
    } catch (err) {
      toast(err instanceof SyntaxError ? 'This file couldn’t be read as a backup.' : (err.message || 'Import failed.'), 4200);
    }
  }

  // ---------- Editor ----------
  const editor = $('#editor');
  const ed = { entry: null, photos: [], removed: [], dirty: false, busy: 0, titleFont: '', mood: '', peopleIds: [], placeId: '', tint: 'mood', tags: [], fav: false, dateTouched: false, spot: null, media: [], removedMedia: [] };
  const edPhotos = $('#edPhotos');

  function renderEdPhotos() {
    edPhotos.innerHTML = ed.photos.map((p, i) => `
      <div class="ed-ph ${p.pending ? 'pending' : ''}" data-id="${p.id}">
        ${p.url ? `<img src="${p.url}" alt="">` : ''}
        ${p.pending ? '' : `<button type="button" class="x" data-ed="remove" data-id="${p.id}" aria-label="Remove photo">${ICON.x}</button>`}
        ${i === 0 && !p.pending ? '<span class="badge">Cover</span>' : ''}
        ${i > 0 && !p.pending ? `<button type="button" class="cv" data-ed="cover" data-id="${p.id}" aria-label="Use as cover photo">${ICON.star}</button>` : ''}
      </div>`).join('');
  }
  function renderEdFonts() {
    $('#edTitleWrap').className = 'ed-title-wrap' + (ed.titleFont ? ' tf-' + ed.titleFont : '');
    $('#edFonts').innerHTML = [['', `Default (${fontName(settings.titleFont)})`], ...FONTS].map(([id, name]) =>
      `<button type="button" role="radio" data-ed="font" data-font="${id}" aria-checked="${ed.titleFont === id}"><span class="title-text ${id ? 'tf-' + id : ''}">${esc(name)}</span></button>`).join('');
  }
  function renderEdMoods() {
    const m = moodOf(ed.mood);
    $('#edMoodName').textContent = m ? `· ${m[2]}` : '';
    $('#edMoods').innerHTML = MOODS.map(([id, e, name, c]) =>
      `<button type="button" role="radio" data-ed="mood" data-mood="${id}" aria-checked="${ed.mood === id}" aria-label="${name}" title="${name}" style="--mc:${c}">${e}</button>`).join('');
  }
  function renderEdPeople() {
    $('#edPeople').innerHTML = people.map((p) =>
      `<button type="button" class="chip" data-ed="person" data-id="${p.id}" aria-pressed="${ed.peopleIds.includes(p.id)}">${avatarHTML(p)}${esc(p.name)}</button>`).join('')
      + `<button type="button" class="chip add" data-ed="new-person">+ New person</button>`;
  }
  function renderEdPlace() {
    $('#edPlace').innerHTML = `<option value="">No place</option>` + [...places].sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => `<option value="${p.id}"${p.id === ed.placeId ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  }
  function renderEdTints() {
    const auto = moodOf(ed.mood);
    $('#edTints').innerHTML = TINTS.map(([id, name, c]) => {
      const sw = id === 'mood' ? (auto ? auto[3] : '') : c;
      const inner = id === 'mood' ? (auto ? auto[1] : '☺') : id === 'none' ? '∅' : '';
      return `<button type="button" role="radio" data-ed="tint" data-tint="${id}" aria-checked="${ed.tint === id}" aria-label="${name}" title="${name}"${sw ? ` style="--sw:${sw}"` : ''}>${inner}</button>`;
    }).join('');
  }
  async function openEditor(entry = null, date = null) {
    ed.entry = entry; ed.removed = []; ed.dirty = false; ed.busy = 0;
    ed.titleFont = entry ? entry.titleFont : '';
    ed.mood = entry ? entry.mood : '';
    ed.peopleIds = entry ? [...entry.peopleIds] : [];
    ed.placeId = entry ? entry.placeId : '';
    ed.tint = entry ? entry.tint : 'mood';
    ed.tags = entry ? [...entry.tags] : (/^#\/tag\//.test(location.hash) && tagById(location.hash.split('/')[2]) ? [location.hash.split('/')[2]] : []);
    ed.fav = entry ? entry.fav : false;
    ed.dateTouched = !!entry || D.valid(date); ed.spot = null;
    $('#edAuto').hidden = true; $('#edDraft').hidden = true;
    ed.photos = entry ? entry.photoIds.map((id) => ({ id, url: '', isNew: false })) : [];
    $('#edHeading').textContent = entry ? 'Edit entry' : 'New entry';
    $('#edDate').value = entry ? entry.date : (D.valid(date) ? date : D.today());
    $('#edTitle').value = entry ? entry.title : '';
    $('#edText').value = entry ? entry.text : '';
    $('#edSongTitle').value = entry && entry.song ? entry.song.title : '';
    $('#edSongArtist').value = entry && entry.song ? entry.song.artist : '';
    $('#edSongLink').value = entry && entry.song ? entry.song.link : '';
    ed.media = []; ed.removedMedia = [];
    $('#edError').textContent = '';
    $('#edDanger').hidden = !entry;
    $('#edSave').disabled = false;
    renderEdPhotos(); renderEdFonts(); renderEdMoods(); renderEdPeople(); renderEdPlace(); renderEdTints(); renderEdTags(); renderEdFav(); renderEdPrompts(true); renderEdMedia();
    editor.showModal();
    $('#edBody').scrollTop = 0;
    if (!entry) setTimeout(() => $('#edText').focus(), 30);
    offerDraft();
    loadEdMedia(entry);
    for (const p of ed.photos) { p.url = await photoURL(p.id, 'thumb'); }
    renderEdPhotos();
  }
  async function addFiles(files) {
    const imgs = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif|avif)$/i.test(f.name));
    if (!imgs.length) return;
    ed.dirty = true;
    $('#edError').textContent = '';
    const exifs = [];
    await Promise.all(imgs.map(async (file) => {
      const temp = { id: 'tmp-' + uid(), pending: true, isNew: true, url: '' };
      ed.photos.push(temp); ed.busy++; renderEdPhotos();
      try {
        const [rec, exif] = await Promise.all([processImage(file), readExif(file)]);
        if (exif) exifs.push(exif);
        Object.assign(temp, { id: rec.id, pending: false, rec, url: URL.createObjectURL(rec.thumb) });
        DB.putPhoto({ ...rec, entryId: '__draft__' }).catch(() => {}); // kept safe in case the editor closes by accident
      } catch (err) {
        ed.photos = ed.photos.filter((p) => p !== temp);
        $('#edError').textContent = `“${file.name}” couldn’t be added. ${/heic|heif/i.test(file.name) ? 'HEIC photos only open in Safari; export as JPEG and try again.' : 'Try a JPEG or PNG.'}`;
      } finally { ed.busy--; renderEdPhotos(); }
    }));
    applyPhotoInfo(exifs);
    scheduleDraft();
  }
  // Use the date and location stored in the photos, for new entries
  function applyPhotoInfo(exifs) {
    const notes = [];
    const dates = exifs.map((x) => x.date).filter(Boolean).sort();
    if (!ed.entry && !ed.dateTouched && dates.length && dates[0] !== $('#edDate').value) {
      $('#edDate').value = dates[0];
      notes.push(`Date set to ${esc(D.long(dates[0]))} from your photo.`);
    }
    const gps = exifs.find((x) => x.lat != null);
    let spotBtn = '';
    if (gps && !ed.placeId) {
      const near = nearPlace(gps.lat, gps.lng);
      if (near) { ed.placeId = near.id; renderEdPlace(); notes.push(`Place set to ${esc(near.name)} from your photo.`); }
      else { ed.spot = gps; spotBtn = ' <button type="button" class="linkbtn" data-ed="save-spot">Save where this photo was taken as a place</button>'; }
    }
    if (notes.length || spotBtn) { $('#edAuto').innerHTML = (notes.join(' ') || 'This photo has a location.') + spotBtn; $('#edAuto').hidden = false; }
  }
  function closeEditor(force = false) {
    if (!force && ed.dirty) {
      if (!confirm('Discard your changes to this entry?')) return;
      clearDraft(draftKey(), true);
      ed.photos.filter((p) => p.isNew && !p.pending).forEach((p) => DB.del('photos', p.id).catch(() => {}));
      ed.media.filter((m) => m.isNew).forEach((m) => DB.del('photos', m.id).catch(() => {}));
    }
    if (rec.mr) { rec.mr.onstop = null; rec.mr.stop(); clearInterval(rec.timer); rec.stream.getTracks().forEach((t) => t.stop()); rec.mr = null; }
    clearTimeout(draftTimer);
    ed.photos.filter((p) => p.isNew && p.url).forEach((p) => URL.revokeObjectURL(p.url));
    ed.media.forEach((m) => { if (m.url) URL.revokeObjectURL(m.url); if (m.thumbUrl) URL.revokeObjectURL(m.thumbUrl); });
    editor.close();
  }
  async function saveEditor() {
    const date = $('#edDate').value, title = $('#edTitle').value.trim(), text = $('#edText').value.replace(/\s+$/, '');
    const err = $('#edError');
    if (ed.busy) { err.textContent = 'Photos are still being added. Try again in a moment.'; return; }
    if (rec.mr) { err.textContent = 'Stop the voice recording first.'; return; }
    if (!D.valid(date)) { err.textContent = 'Choose a date for this entry.'; return; }
    const song = songFromInputs();
    if (!title && !text.trim() && !ed.photos.length && !ed.media.length && !song) { err.textContent = 'Add a photo or write something before saving.'; return; }
    const now = Date.now();
    const entry = norm({
      id: ed.entry ? ed.entry.id : uid(),
      date, title, text, titleFont: ed.titleFont, mood: ed.mood, tint: ed.tint,
      peopleIds: ed.peopleIds.filter((id) => personById(id)), placeId: placeById(ed.placeId) ? ed.placeId : '',
      stickers: ed.entry ? ed.entry.stickers : [],
      tags: ed.tags.filter((id) => tagById(id)), fav: ed.fav, pinned: ed.entry ? ed.entry.pinned : false,
      layout: ed.entry && ed.entry.layout ? { ...ed.entry.layout, hidden: (ed.entry.layout.hidden || []).filter((id) => id !== 'song' || !song || (ed.entry.song && ed.entry.song.title === song.title)) } : null, assetIds: ed.entry ? ed.entry.assetIds : [],
      photoIds: ed.photos.map((p) => p.id), mediaIds: ed.media.map((m) => m.id), song,
      createdAt: ed.entry ? ed.entry.createdAt : now,
      updatedAt: now,
    });
    const newPhotos = [...ed.photos.filter((p) => p.isNew).map((p) => p.rec), ...ed.media.filter((m) => m.isNew).map((m) => m.rec)];
    $('#edSave').disabled = true;
    try {
      await DB.saveEntry(entry, newPhotos, [...ed.removed, ...ed.removedMedia]);
    } catch (e) {
      $('#edSave').disabled = false;
      err.textContent = e && e.name === 'QuotaExceededError'
        ? 'The browser is out of storage space. Export a backup and remove some photos, then try again.'
        : 'The entry couldn’t be saved. Try again.';
      return;
    }
    [...ed.removed, ...ed.removedMedia].forEach(forgetPhoto);
    clearDraft(draftKey());
    const i = entries.findIndex((e) => e.id === entry.id);
    if (i >= 0) entries[i] = entry; else entries.push(entry);
    sortEntries();
    const wasNew = !ed.entry;
    closeEditor(true);
    toast(wasNew ? 'Entry saved' : 'Changes saved');
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    route();
  }
  async function deleteEntry(entry) {
    if (!entry || !confirm('Delete this entry and its photos? This can’t be undone.')) return false;
    await DB.deleteEntry(entry);
    entry.photoIds.forEach(forgetPhoto);
    entries = entries.filter((e) => e.id !== entry.id);
    toast('Entry deleted');
    return true;
  }

  $('#editorForm').addEventListener('submit', (ev) => { ev.preventDefault(); saveEditor(); });
  $('#edFile').addEventListener('change', (ev) => { addFiles(ev.target.files); ev.target.value = ''; });
  $('#edVideo').addEventListener('change', (ev) => { addVideo(ev.target.files[0]); ev.target.value = ''; });
  ['input', 'change'].forEach((t) => ['#edDate', '#edTitle', '#edText', '#edSongTitle', '#edSongArtist', '#edSongLink'].forEach((sel) => $(sel).addEventListener(t, () => {
    ed.dirty = true; scheduleDraft();
    if (sel === '#edText' && t === 'input') renderEdPrompts();
    if (sel === '#edDate') ed.dateTouched = true;
  })));
  $('#edPlace').addEventListener('change', (ev) => { ed.placeId = ev.target.value; ed.dirty = true; scheduleDraft(); });
  editor.addEventListener('cancel', (ev) => { ev.preventDefault(); closeEditor(); });
  editor.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-ed]');
    if (!b) return;
    const act = b.dataset.ed;
    if (act === 'cancel') closeEditor();
    if (act === 'record') toggleRecord();
    if (act === 'del-media') {
      const m = ed.media.find((x) => x.id === b.dataset.id);
      if (m) { if (m.isNew) DB.del('photos', m.id).catch(() => {}); else ed.removedMedia.push(m.id); ed.media = ed.media.filter((x) => x !== m); ed.dirty = true; renderEdMedia(); }
    }
    if (act === 'font') { ed.titleFont = b.dataset.font; ed.dirty = true; renderEdFonts(); }
    if (act === 'mood') { ed.mood = ed.mood === b.dataset.mood ? '' : b.dataset.mood; ed.dirty = true; renderEdMoods(); renderEdTints(); }
    if (act === 'tint') { ed.tint = b.dataset.tint; ed.dirty = true; renderEdTints(); }
    if (act === 'person') {
      const id = b.dataset.id;
      ed.peopleIds = ed.peopleIds.includes(id) ? ed.peopleIds.filter((x) => x !== id) : [...ed.peopleIds, id];
      ed.dirty = true; b.setAttribute('aria-pressed', String(ed.peopleIds.includes(id)));
    }
    if (act === 'new-person') openPerson(null, (rec) => { ed.peopleIds.push(rec.id); ed.dirty = true; renderEdPeople(); });
    if (act === 'new-place') openPlace(null, (rec) => { ed.placeId = rec.id; ed.dirty = true; renderEdPlace(); });
    if (act === 'remove') {
      const p = ed.photos.find((x) => x.id === b.dataset.id);
      if (!p) return;
      if (p.isNew) URL.revokeObjectURL(p.url); else ed.removed.push(p.id);
      ed.photos = ed.photos.filter((x) => x !== p); ed.dirty = true; renderEdPhotos();
    }
    if (act === 'cover') {
      const i = ed.photos.findIndex((x) => x.id === b.dataset.id);
      if (i > 0) { ed.photos.unshift(...ed.photos.splice(i, 1)); ed.dirty = true; renderEdPhotos(); }
    }
    if (act === 'delete') {
      if (await deleteEntry(ed.entry)) { clearDraft(draftKey()); closeEditor(true); if (/^#\/entry\//.test(location.hash)) go('#/journal'); else route(); }
      return;
    }
    if (act === 'tag') { const id = b.dataset.id; ed.tags = ed.tags.includes(id) ? ed.tags.filter((x) => x !== id) : [...ed.tags, id]; ed.dirty = true; b.setAttribute('aria-pressed', String(ed.tags.includes(id))); }
    if (act === 'new-tag') openTag(null, (rec) => { ed.tags.push(rec.id); ed.dirty = true; renderEdTags(); scheduleDraft(); });
    if (act === 'fav') { ed.fav = !ed.fav; ed.dirty = true; renderEdFav(); }
    if (act === 'prompt') { const t = $('#edText'); t.value = b.textContent + '\n'; t.focus(); t.setSelectionRange(t.value.length, t.value.length); ed.dirty = true; renderEdPrompts(); }
    if (act === 'more-prompts') renderEdPrompts(true);
    if (act === 'draft-restore') restoreDraft();
    if (act === 'draft-discard') { clearDraft($('#edDraft').dataset.key, true); $('#edDraft').hidden = true; }
    if (act === 'save-spot' && ed.spot) openPlace(null, (rec) => { ed.placeId = rec.id; ed.dirty = true; renderEdPlace(); $('#edAuto').hidden = true; scheduleDraft(); }, ed.spot);
    if (ed.dirty) scheduleDraft();
  });
  const edBody = $('#edBody');
  edBody.addEventListener('dragover', (ev) => { if ([...ev.dataTransfer.types].includes('Files')) { ev.preventDefault(); edBody.classList.add('drag'); } });
  edBody.addEventListener('dragleave', (ev) => { if (!edBody.contains(ev.relatedTarget)) edBody.classList.remove('drag'); });
  edBody.addEventListener('drop', (ev) => { ev.preventDefault(); edBody.classList.remove('drag'); addFiles(ev.dataTransfer.files); });
  editor.addEventListener('paste', (ev) => { const files = ev.clipboardData && ev.clipboardData.files; if (files && files.length) { ev.preventDefault(); addFiles(files); } });

  // ---------- Lightbox ----------
  const lb = $('#lightbox');
  const lbState = { ids: [], i: 0 };
  async function showLb() {
    const img = $('#lbImg');
    img.removeAttribute('src');
    $('#lbCount').textContent = `${lbState.i + 1} of ${lbState.ids.length}`;
    const id = lbState.ids[lbState.i];
    const u = await photoURL(id, 'full');
    if (lbState.ids[lbState.i] === id) img.src = u;
  }
  function openLb(ids, i) {
    lbState.ids = ids; lbState.i = i;
    lb.classList.toggle('single', ids.length < 2);
    lb.showModal(); showLb();
  }
  const lbStep = (d) => { if (lbState.ids.length < 2) return; lbState.i = (lbState.i + d + lbState.ids.length) % lbState.ids.length; showLb(); };
  lb.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-lb]');
    if (b) { const a = b.dataset.lb; if (a === 'close') lb.close(); if (a === 'prev') lbStep(-1); if (a === 'next') lbStep(1); return; }
    if (ev.target === lb) lb.close();
  });
  lb.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowLeft') lbStep(-1); if (ev.key === 'ArrowRight') lbStep(1); });
  let touchX = null;
  lb.addEventListener('touchstart', (ev) => { touchX = ev.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (ev) => {
    if (touchX == null) return;
    const dx = ev.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
  });

  // ---------- Tags ----------
  const TAG_COLORS = ['#E5697E', '#F29E4C', '#E8B931', '#7DBE6E', '#3FA79C', '#5B8DD6', '#8E7CC3', '#B98B6E', '#7D8B94'];
  const PRESET_TAGS = [['Date', '#E5697E'], ['School', '#5B8DD6'], ['Friends', '#E8B931'], ['Family', '#7DBE6E'], ['Work', '#7D8B94'], ['Travel', '#3FA79C'], ['Food', '#F29E4C'], ['Celebration', '#8E7CC3']];
  let tags = [];
  const tagById = (id) => tags.find((t) => t.id === id);
  const tagEntries = (id) => entries.filter((e) => e.tags.includes(id));
  const sortedTags = () => [...tags].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  function tagChip(t, link = true) {
    return link ? `<a class="tag-chip" href="#/tag/${t.id}" style="--tc:${t.color}">#${esc(t.name)}</a>` : `<span class="tag-chip" style="--tc:${t.color}">#${esc(t.name)}</span>`;
  }
  async function seedTags() {
    if (tags.length || settings.tagsSeeded) return;
    const now = Date.now();
    tags = PRESET_TAGS.map(([name, color], i) => ({ id: uid(), name, color, createdAt: now + i }));
    for (const t of tags) await DB.put('tags', t);
    saveSettings({ tagsSeeded: true });
  }
  const tagDlg = $('#tagDlg');
  const tg = { tag: null, color: TAG_COLORS[0], onSave: null };
  function drawTagColors() {
    $('#tgColors').innerHTML = TAG_COLORS.map((c) => `<button type="button" role="radio" data-tgc="${c}" aria-checked="${tg.color === c}" aria-label="Color" style="--sw:${c}"></button>`).join('');
  }
  function openTag(tag = null, onSave = null) {
    tg.tag = tag; tg.onSave = onSave;
    tg.color = tag ? tag.color : TAG_COLORS[tags.length % TAG_COLORS.length];
    $('#tgHeading').textContent = tag ? 'Edit tag' : 'New tag';
    $('#tgName').value = tag ? tag.name : '';
    $('#tgError').textContent = '';
    $('#tgDanger').hidden = !tag;
    drawTagColors();
    tagDlg.showModal();
    setTimeout(() => $('#tgName').focus(), 30);
  }
  $('#tagForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = $('#tgName').value.trim().replace(/^#/, '');
    if (!name) { $('#tgError').textContent = 'Give the tag a name.'; return; }
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase() && (!tg.tag || t.id !== tg.tag.id))) { $('#tgError').textContent = 'You already have a tag with that name.'; return; }
    const rec = { id: tg.tag ? tg.tag.id : uid(), name, color: tg.color, createdAt: tg.tag ? tg.tag.createdAt : Date.now() };
    try { await DB.put('tags', rec); } catch (_) { $('#tgError').textContent = 'This tag couldn’t be saved. Try again.'; return; }
    const i = tags.findIndex((t) => t.id === rec.id);
    if (i >= 0) tags[i] = rec; else tags.push(rec);
    tagDlg.close();
    toast(tg.tag ? 'Tag updated' : `#${name} added`);
    if (tg.onSave) tg.onSave(rec); else route();
  });
  tagDlg.addEventListener('click', async (ev) => {
    if (ev.target.closest('[data-close]')) tagDlg.close();
    const c = ev.target.closest('[data-tgc]');
    if (c) { tg.color = c.dataset.tgc; drawTagColors(); }
    if (ev.target.closest('[data-tg="delete"]') && tg.tag) {
      if (!confirm(`Delete #${tg.tag.name}? Your entries stay; they just lose this tag.`)) return;
      const id = tg.tag.id;
      const changed = entries.filter((e) => e.tags.includes(id)).map((e) => ({ ...e, tags: e.tags.filter((x) => x !== id) }));
      await DB.putEntries(changed); await DB.del('tags', id);
      changed.forEach((c2) => { const i = entries.findIndex((e) => e.id === c2.id); entries[i] = c2; });
      tags = tags.filter((t) => t.id !== id);
      state.filters.tags = state.filters.tags.filter((x) => x !== id);
      tagDlg.close(); toast('Tag deleted');
      if (/^#\/tag\//.test(location.hash)) go('#/people'); else route();
    }
  });
  function renderTag(id) {
    const t = tagById(id);
    if (!t) { view.dataset.title = ''; view.innerHTML = `<div class="page">${backBtn}<p class="no-results">This tag no longer exists.</p></div>`; return; }
    view.dataset.title = '#' + t.name;
    const list = tagEntries(id);
    view.innerHTML = `<div class="page-wide">${backBtn}
      <header class="prof-head"><span class="tag-big" style="--tc:${t.color}">#</span><div><h1>${esc(t.name)}</h1><p>${list.length ? plural(list.length, 'memory', 'memories') + ` since ${esc(D.medium(list[list.length - 1].date))}` : 'No memories yet'}</p></div>
        <span class="spacer"></span>
        ${list.length ? `<button class="btn btn-line" data-action="filter-tag" data-id="${t.id}">Filter the journal</button>` : ''}
        <button class="btn btn-line" data-action="edit-tag" data-id="${t.id}">Edit</button></header>
      ${list.length ? `<div class="tiles size-m">${list.map((e) => tileHTML(e, 'm')).join('')}</div>` : `<div class="note"><p>Add #${esc(t.name)} to an entry under “Tags” and it will show up here.</p></div>`}
    </div>`;
  }
  function tagsSectionHTML() {
    const list = sortedTags();
    return `<div class="sec-head"><h2>Tags &amp; albums</h2><button class="btn btn-line" data-action="add-tag">Add tag</button></div>
      <div class="tag-grid">${list.map((t) => {
        const es = tagEntries(t.id), cover = es.map((e) => e.photoIds[0]).find(Boolean);
        return `<a class="tag-card" href="#/tag/${t.id}" style="--tc:${t.color}">
          <span class="tc-cover ph">${cover ? imgTag(cover, 'md') : ''}</span>
          <span class="tc-body"><b>#${esc(t.name)}</b><small>${es.length ? plural(es.length, 'memory', 'memories') : 'No memories yet'}</small></span></a>`;
      }).join('')}</div>`;
  }

  // ---------- Filters (journal) ----------
  const emptyFilters = () => ({ tags: [], moods: [], people: [], place: '', photos: false, fav: false, from: '', to: '' });
  state.filters = emptyFilters();
  state.showFilters = false;
  function filterCount() {
    const f = state.filters;
    return f.tags.length + f.moods.length + f.people.length + (f.place ? 1 : 0) + (f.photos ? 1 : 0) + (f.fav ? 1 : 0) + (f.from || f.to ? 1 : 0);
  }
  function applyFilters(list) {
    const f = state.filters;
    return list.filter((e) => (!f.tags.length || f.tags.some((t) => e.tags.includes(t)))
      && (!f.moods.length || f.moods.includes(e.mood))
      && (!f.people.length || f.people.some((p) => e.peopleIds.includes(p)))
      && (!f.place || e.placeId === f.place)
      && (!f.photos || e.photoIds.length)
      && (!f.fav || e.fav)
      && (!f.from || e.date >= f.from) && (!f.to || e.date <= f.to));
  }
  function filterPanelHTML() {
    const f = state.filters;
    const on = (x) => `aria-pressed="${!!x}"`;
    return `<div class="filters">
      <div class="f-row"><b>Tags</b><div class="f-chips">${sortedTags().map((t) => `<button type="button" class="tag-chip f-tag" data-f="tag" data-v="${t.id}" ${on(f.tags.includes(t.id))} style="--tc:${t.color}">#${esc(t.name)}</button>`).join('') || '<span class="muted">No tags yet</span>'}</div></div>
      <div class="f-row"><b>Mood</b><div class="f-chips">${MOODS.map(([id, e, name]) => `<button type="button" class="f-mood" data-f="mood" data-v="${id}" ${on(f.moods.includes(id))} title="${name}" aria-label="${name}">${e}</button>`).join('')}</div></div>
      ${people.length ? `<div class="f-row"><b>People</b><div class="f-chips">${people.map((p) => `<button type="button" class="chip" data-f="person" data-v="${p.id}" ${on(f.people.includes(p.id))}>${avatarHTML(p)}${esc(p.name)}</button>`).join('')}</div></div>` : ''}
      <div class="f-row"><b>More</b><div class="f-chips">
        ${places.length ? `<select class="text-input f-place" data-f="place" aria-label="Place"><option value="">Any place</option>${places.map((p) => `<option value="${p.id}"${f.place === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : ''}
        <button type="button" class="chip f-flag" data-f="photos" ${on(f.photos)}>With photos</button>
        <button type="button" class="chip f-flag" data-f="fav" ${on(f.fav)}>★ Favorites</button>
      </div></div>
      <div class="f-row"><b>Dates</b><div class="f-chips"><label class="muted">From <input type="date" class="text-input f-date" data-f="from" value="${f.from}"></label><label class="muted">To <input type="date" class="text-input f-date" data-f="to" value="${f.to}"></label></div></div>
      <div class="f-foot"><button type="button" class="linkbtn" data-f="clear">Clear all filters</button><button type="button" class="btn btn-primary" data-f="close">Show ${plural(applyFilters(entries).length, 'entry', 'entries')}</button></div>
    </div>`;
  }
  function activeFiltersHTML() {
    const f = state.filters;
    if (!filterCount()) return '';
    const bits = [
      ...f.tags.map((id) => tagById(id)).filter(Boolean).map((t) => `<button type="button" class="tag-chip" data-f="tag" data-v="${t.id}" style="--tc:${t.color}">#${esc(t.name)} ×</button>`),
      ...f.moods.map((id) => moodOf(id)).filter(Boolean).map((m) => `<button type="button" class="chip" data-f="mood" data-v="${m[0]}">${m[1]} ${m[2]} ×</button>`),
      ...f.people.map(personById).filter(Boolean).map((p) => `<button type="button" class="chip" data-f="person" data-v="${p.id}">${avatarHTML(p)}${esc(p.name)} ×</button>`),
      f.place && placeById(f.place) ? `<button type="button" class="chip" data-f="place-x">${esc(placeById(f.place).name)} ×</button>` : '',
      f.photos ? `<button type="button" class="chip" data-f="photos">With photos ×</button>` : '',
      f.fav ? `<button type="button" class="chip" data-f="fav">★ Favorites ×</button>` : '',
      f.from || f.to ? `<button type="button" class="chip" data-f="dates-x">${esc(f.from ? D.medium(f.from) : '…')} – ${esc(f.to ? D.medium(f.to) : '…')} ×</button>` : '',
    ];
    return `<div class="f-active">${bits.join('')}<button type="button" class="linkbtn" data-f="clear">Clear all</button></div>`;
  }
  function onFilterEvent(ev) {
    const b = ev.target.closest('[data-f]');
    if (!b || !$('#journalPage')) return;
    const f = state.filters, k = b.dataset.f, v = b.dataset.v;
    const toggle = (arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    if (ev.type === 'change') {
      if (k === 'place') f.place = b.value;
      else if (k === 'from' || k === 'to') f[k] = b.value;
      else return;
    } else {
      if (b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
      switch (k) {
        case 'tag': f.tags = toggle(f.tags); break;
        case 'mood': f.moods = toggle(f.moods); break;
        case 'person': f.people = toggle(f.people); break;
        case 'photos': f.photos = !f.photos; break;
        case 'fav': f.fav = !f.fav; break;
        case 'place-x': f.place = ''; break;
        case 'dates-x': f.from = ''; f.to = ''; break;
        case 'clear': state.filters = emptyFilters(); break;
        case 'close': state.showFilters = false; break;
        case 'toggle': state.showFilters = !state.showFilters; break;
        default: return;
      }
    }
    refreshFeed();
  }
  function refreshFeed() {
    const panel = $('#filterPanel'), act = $('#filterActive'), btn = $('[data-f="toggle"]');
    if (panel) { panel.innerHTML = state.showFilters ? filterPanelHTML() : ''; panel.hidden = !state.showFilters; }
    if (act) act.innerHTML = state.showFilters ? '' : activeFiltersHTML();
    if (btn) { const n = filterCount(); btn.innerHTML = `${ICON.filter}Filters${n ? ` <span class="f-count">${n}</span>` : ''}`; btn.setAttribute('aria-expanded', String(state.showFilters)); }
    const feed = $('#feed'); if (feed) { feed.innerHTML = feedHTML(); hydrate(feed); }
  }
  view.addEventListener('click', onFilterEvent);
  view.addEventListener('change', onFilterEvent);

  // ---------- Favorites & pins ----------
  async function toggleFlag(id, flag) {
    const e = byId(id); if (!e) return;
    const next = { ...e, [flag]: !e[flag], updatedAt: Date.now() };
    try { await DB.putEntries([next]); } catch (_) { toast('That couldn’t be saved. Try again.'); return; }
    entries[entries.findIndex((x) => x.id === id)] = next;
    toast(flag === 'fav' ? (next.fav ? 'Added to favorites' : 'Removed from favorites') : (next.pinned ? 'Pinned to Home' : 'Unpinned'));
    route();
  }

  // ---------- Writing prompts ----------
  const PROMPTS = [
    'What made you smile today?', 'Three things you’re grateful for today:', 'What’s one thing you learned today?', 'Who did you talk to today, and what about?',
    'Describe today in three words.', 'What was the best moment of the day?', 'What was hard today, and how did you handle it?', 'What are you looking forward to this week?',
    'What did you eat today that was worth remembering?', 'Where did you spend most of the day? What did it look like?', 'What would you tell yourself from a year ago?',
    'What’s something small that went right?', 'What song was stuck in your head today?', 'What surprised you today?', 'What did you do just for yourself today?',
    'Who are you thankful for right now, and why?', 'What’s on your mind tonight?', 'What did the weather feel like today?', 'What’s a conversation you want to remember?',
    'What did you finish today?', 'What would make tomorrow great?', 'What made you laugh today?', 'What’s something you want to remember about this season of life?',
    'If today were a photo, what would be in it?', 'What did you notice on the way somewhere today?', 'What’s a worry you can let go of?', 'What are you proud of this week?',
    'Write a short letter to someone you miss.', 'What’s one thing you’d do differently today?', 'What are you reading, watching or listening to?', 'What smell or sound stood out today?',
    'What did home feel like today?', 'What’s a goal you moved closer to?', 'What made today different from yesterday?', 'Describe a person you saw today.',
  ];
  let promptSet = [];
  function renderEdPrompts(reshuffle = false) {
    const box = $('#edPrompts');
    if ($('#edText').value.trim()) { box.innerHTML = ''; return; }
    if (reshuffle || !promptSet.length) promptSet = shuffle(PROMPTS).slice(0, 3);
    box.innerHTML = `<span class="muted">Need an idea?</span>${promptSet.map((p) => `<button type="button" class="prompt" data-ed="prompt">${esc(p)}</button>`).join('')}<button type="button" class="linkbtn" data-ed="more-prompts">More ideas</button>`;
  }

  // ---------- Photo date and place (EXIF) ----------
  const readExif = DJ.readExif;
  const nearPlace = (lat, lng, maxM = 300) => DJ.nearPlace(places, lat, lng, maxM);

  // ---------- Auto-saved drafts ----------
  const DRAFT_PREFIX = 'dj-draft:';
  const draftKey = () => DRAFT_PREFIX + (ed.entry ? ed.entry.id : 'new');
  let draftTimer = null;
  function scheduleDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 600); }
  function draftData() {
    return {
      date: $('#edDate').value, title: $('#edTitle').value, text: $('#edText').value, titleFont: ed.titleFont, mood: ed.mood,
      peopleIds: ed.peopleIds, placeId: ed.placeId, tint: ed.tint, tags: ed.tags, fav: ed.fav,
      newPhotos: ed.photos.filter((p) => p.isNew && !p.pending).map((p) => p.id), order: ed.photos.filter((p) => !p.pending).map((p) => p.id),
      removed: ed.removed, savedAt: Date.now(),
      song: { title: $('#edSongTitle').value, artist: $('#edSongArtist').value, link: $('#edSongLink').value },
      newMedia: ed.media.filter((m) => m.isNew).map((m) => m.id), mediaOrder: ed.media.map((m) => m.id), removedMedia: ed.removedMedia,
    };
  }
  async function saveDraft() {
    if (!editor.open || !ed.dirty) return;
    try {
      const d = draftData();
      const payload = CRYPT.key ? { enc: b64(await encJSON(d)) } : d;
      localStorage.setItem(draftKey(), JSON.stringify(payload));
    } catch (_) { /* storage full or blocked: drafts are best-effort */ }
  }
  async function readDraft(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      if (!v) return null;
      if (v.enc) return CRYPT.key ? await decJSON(unb64(v.enc)) : null;
      return v;
    } catch (_) { return null; }
  }
  async function clearDraft(key, deletePhotos = false) {
    clearTimeout(draftTimer);
    if (deletePhotos) {
      const d = await readDraft(key);
      if (d) for (const id of [...(d.newPhotos || []), ...(d.newMedia || [])]) { DB.del('photos', id).catch(() => {}); forgetPhoto(id); }
    }
    localStorage.removeItem(key);
  }
  const draftKeys = () => Object.keys(localStorage).filter((k) => k.startsWith(DRAFT_PREFIX));
  async function cleanupDraftPhotos() {
    try {
      const ids = await DB.draftPhotoIds();
      if (!ids.length) return;
      const keep = new Set();
      for (const k of draftKeys()) { const d = await readDraft(k); [...(d && d.newPhotos || []), ...(d && d.newMedia || [])].forEach((id) => keep.add(id)); }
      for (const id of ids) if (!keep.has(id)) await DB.del('photos', id);
    } catch (_) { /* best-effort */ }
  }
  async function offerDraft() {
    const key = draftKey();
    const d = await readDraft(key);
    const box = $('#edDraft');
    if (!d || (ed.entry && d.savedAt <= (ed.entry.updatedAt || 0))) { box.hidden = true; return; }
    const when = new Date(d.savedAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    box.innerHTML = `<span>You have unsaved changes from ${esc(when)}.</span><button type="button" class="btn btn-primary" data-ed="draft-restore">Restore</button><button type="button" class="btn btn-ghost" data-ed="draft-discard">Discard</button>`;
    box.hidden = false;
    box.dataset.key = key;
  }
  async function restoreDraft() {
    const key = $('#edDraft').dataset.key, d = await readDraft(key);
    $('#edDraft').hidden = true;
    if (!d) return;
    $('#edDate').value = d.date || $('#edDate').value; $('#edTitle').value = d.title || ''; $('#edText').value = d.text || '';
    Object.assign(ed, { titleFont: d.titleFont || '', mood: d.mood || '', peopleIds: d.peopleIds || [], placeId: d.placeId || '', tint: d.tint || 'mood', tags: d.tags || [], fav: !!d.fav, removed: d.removed || [], dirty: true });
    const existing = new Map(ed.photos.map((p) => [p.id, p]));
    const restored = [];
    for (const id of d.order || []) {
      if (existing.has(id)) { restored.push(existing.get(id)); continue; }
      if ((d.newPhotos || []).includes(id)) {
        const rec = await DB.getPhoto(id).catch(() => null);
        if (rec) restored.push({ id, isNew: true, rec, url: URL.createObjectURL(rec.thumb) });
      }
    }
    ed.photos = restored;
    if (d.song) { $('#edSongTitle').value = d.song.title || ''; $('#edSongArtist').value = d.song.artist || ''; $('#edSongLink').value = d.song.link || ''; }
    if (d.mediaOrder) {
      const had = new Map(ed.media.map((m) => [m.id, m])), media = [];
      for (const id of d.mediaOrder) {
        if (had.has(id)) { media.push(had.get(id)); continue; }
        if (!(d.newMedia || []).includes(id)) continue;
        const r = await DB.getPhoto(id).catch(() => null);
        if (r) media.push({ id, kind: r.kind, isNew: true, rec: r, url: r.kind === 'audio' ? URL.createObjectURL(r.blob) : '', thumbUrl: r.thumb ? URL.createObjectURL(r.thumb) : '', dur: r.dur || 0 });
      }
      ed.media = media; ed.removedMedia = d.removedMedia || [];
      renderEdMedia();
    }
    renderEdPhotos(); renderEdFonts(); renderEdMoods(); renderEdPeople(); renderEdPlace(); renderEdTints(); renderEdTags(); renderEdFav(); renderEdPrompts();
    toast('Draft restored');
  }

  // ---------- Editor: tags and favorite ----------
  function renderEdTags() {
    $('#edTags').innerHTML = sortedTags().map((t) => `<button type="button" class="tag-chip ed-tag" data-ed="tag" data-id="${t.id}" aria-pressed="${ed.tags.includes(t.id)}" style="--tc:${t.color}">#${esc(t.name)}</button>`).join('')
      + `<button type="button" class="chip add" data-ed="new-tag">+ New tag</button>`;
  }
  function renderEdFav() {
    const b = $('#edFav');
    b.setAttribute('aria-pressed', String(!!ed.fav));
    b.textContent = ed.fav ? '★ Favorite' : '☆ Favorite';
  }

  // ---------- Snap & save (quick capture) ----------
  const quickDlg = $('#quickDlg');
  const qc = { rec: null, exif: null, mood: '', url: '' };
  function qcDraw() {
    const box = $('#qcPhoto');
    if (qc.url) box.innerHTML = `<img src="${qc.url}" alt="" class="qc-img"><button type="button" class="btn btn-line qc-change" data-qc="change">Change photo</button>`;
    else box.innerHTML = `<label class="btn btn-line"><input type="file" data-qc-file accept="image/*" capture="environment" hidden>Take photo</label>
      <label class="btn btn-line"><input type="file" data-qc-file accept="image/*" hidden>Choose photo</label>`;
    $('#qcMoods').innerHTML = MOODS.map(([id, e, name, c]) => `<button type="button" role="radio" data-qc-mood="${id}" aria-checked="${qc.mood === id}" aria-label="${name}" title="${name}" style="--mc:${c}">${e}</button>`).join('');
    const date = (qc.exif && qc.exif.date) || D.today();
    const pl = qc.exif && qc.exif.lat != null ? nearPlace(qc.exif.lat, qc.exif.lng) : null;
    $('#qcInfo').textContent = qc.rec ? `Saving to ${D.long(date)}${qc.exif && qc.exif.date ? ' (from the photo)' : ''}${pl ? ` at ${pl.name}` : ''}.` : 'Saved to today. You can add more to it later.';
  }
  function openQuick() {
    if (qc.url) URL.revokeObjectURL(qc.url);
    Object.assign(qc, { rec: null, exif: null, mood: '', url: '' });
    $('#qcLine').value = ''; $('#qcError').textContent = ''; $('#qcSave').disabled = false;
    qcDraw();
    quickDlg.showModal();
  }
  quickDlg.addEventListener('change', async (ev) => {
    const inp = ev.target.closest('[data-qc-file]'); if (!inp || !inp.files[0]) return;
    const f = inp.files[0];
    $('#qcPhoto').innerHTML = '<div class="qc-wait">Getting your photo ready…</div>';
    try {
      const [rec, exif] = await Promise.all([processImage(f), readExif(f)]);
      if (qc.url) URL.revokeObjectURL(qc.url);
      Object.assign(qc, { rec, exif, url: URL.createObjectURL(rec.md) });
    } catch (_) { $('#qcError').textContent = 'That photo couldn’t be opened. Try a JPEG or PNG.'; }
    qcDraw();
    setTimeout(() => $('#qcLine').focus(), 30);
  });
  quickDlg.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-close]')) quickDlg.close();
    if (ev.target.closest('[data-qc="change"]')) { if (qc.url) URL.revokeObjectURL(qc.url); Object.assign(qc, { rec: null, exif: null, url: '' }); qcDraw(); }
    const m = ev.target.closest('[data-qc-mood]');
    if (m) { qc.mood = qc.mood === m.dataset.qcMood ? '' : m.dataset.qcMood; qcDraw(); }
  });
  $('#quickForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const line = $('#qcLine').value.trim();
    if (!qc.rec && !line) { $('#qcError').textContent = 'Add a photo or write a line.'; return; }
    const now = Date.now();
    const pl = qc.exif && qc.exif.lat != null ? nearPlace(qc.exif.lat, qc.exif.lng) : null;
    const entry = norm({ id: uid(), date: (qc.exif && qc.exif.date) || D.today(), title: line, text: '', mood: qc.mood, photoIds: qc.rec ? [qc.rec.id] : [], placeId: pl ? pl.id : '', createdAt: now, updatedAt: now });
    $('#qcSave').disabled = true;
    try { await DB.saveEntry(entry, qc.rec ? [qc.rec] : [], []); } catch (_) { $('#qcSave').disabled = false; $('#qcError').textContent = 'It couldn’t be saved. Try again.'; return; }
    entries.push(entry); sortEntries();
    quickDlg.close();
    toast('Saved. Open it any time to add more.');
    route();
  });

  // ---------- Passcode: set, change, turn off, unlock ----------
  const passDlg = $('#passDlg');
  let passMode = 'set', passResolve = null;
  function openPass(mode) {
    passMode = mode;
    const H = { set: 'Set a passcode', change: 'Change passcode', off: 'Turn off passcode', backup: 'Unlock backup file' };
    $('#psHeading').textContent = H[mode];
    $('#psSave').textContent = mode === 'off' ? 'Turn off' : mode === 'backup' ? 'Unlock' : 'Save';
    const f = (id, label, ac = 'new-password') => `<label class="field"><span>${label}</span><input id="${id}" class="text-input" type="password" autocomplete="${ac}" minlength="4"></label>`;
    let body = '';
    if (mode === 'set') body = `<p class="muted">Use at least 4 characters. A 4- to 6-digit PIN works, or a longer password for more safety. Your journal will be encrypted on this device.</p>
      ${f('psNew', 'Passcode')}${f('psConfirm', 'Type it again')}
      <label class="check"><input type="checkbox" id="psAgree"> <span>I understand that if I forget this passcode, my journal can only be restored from a backup file.</span></label>`;
    if (mode === 'change') body = `${f('psCur', 'Current passcode', 'current-password')}${f('psNew', 'New passcode')}${f('psConfirm', 'Type the new passcode again')}`;
    if (mode === 'off') body = `<p class="muted">Your journal will be decrypted and open without a passcode on this device.</p>${f('psCur', 'Current passcode', 'current-password')}`;
    if (mode === 'backup') body = `<p class="muted">This backup was made while your journal had a passcode. Enter the passcode it had then.</p>${f('psCur', 'Passcode', 'current-password')}`;
    $('#psBody').innerHTML = body + '<p class="ed-error" id="psError" role="alert"></p>';
    $('#psSave').disabled = false;
    passDlg.showModal();
    setTimeout(() => { const i = $('#psBody input'); if (i) i.focus(); }, 30);
    return new Promise((res) => { passResolve = res; });
  }
  passDlg.addEventListener('click', (ev) => { if (ev.target.closest('[data-close]')) { passDlg.close(); if (passResolve) passResolve(null); passResolve = null; } });
  passDlg.addEventListener('cancel', () => { if (passResolve) passResolve(null); passResolve = null; });
  async function convertDrafts(toKey) {
    const fromKey = CRYPT.key;
    await syncRewrap(fromKey, toKey).catch(() => {});
    for (const k of draftKeys()) {
      CRYPT.key = fromKey; const d = await readDraft(k);
      CRYPT.key = toKey;
      if (d) localStorage.setItem(k, JSON.stringify(toKey ? { enc: b64(await encJSON(d)) } : d)); else localStorage.removeItem(k);
    }
    CRYPT.key = toKey;
  }
  $('#passForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = $('#psError'), val = (id) => ($('#' + id) || {}).value || '';
    const busy = (msg) => { $('#psSave').disabled = true; err.textContent = ''; if (msg) toast(msg, 60000); };
    try {
      if (passMode === 'backup') { const p = val('psCur'); passDlg.close(); if (passResolve) passResolve(p); passResolve = null; return; }
      if (passMode === 'set' || passMode === 'change') {
        if (val('psNew').length < 4) { err.textContent = 'Use at least 4 characters.'; return; }
        if (val('psNew') !== val('psConfirm')) { err.textContent = 'The two passcodes don’t match.'; return; }
      }
      if (passMode === 'set') {
        if (!$('#psAgree').checked) { err.textContent = 'Tick the box to confirm you understand.'; return; }
        busy('Encrypting your journal…');
        const raw = crypto.getRandomValues(new Uint8Array(32));
        const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
        localStorage.setItem(LOCK_KEY, JSON.stringify(await wrapKey(val('psNew'), raw)));
        await recryptAll(key, (i, n) => toast(`Encrypting photos… ${i} of ${n}`, 60000));
        await convertDrafts(key);
        toast('Passcode set. Your journal is now encrypted.');
      } else if (passMode === 'change') {
        let raw;
        try { ({ raw } = await unwrapKey(val('psCur'), lockInfo())); } catch (_) { err.textContent = 'The current passcode isn’t right.'; return; }
        busy();
        localStorage.setItem(LOCK_KEY, JSON.stringify(await wrapKey(val('psNew'), raw)));
        toast('Passcode changed');
      } else if (passMode === 'off') {
        try { await unwrapKey(val('psCur'), lockInfo()); } catch (_) { err.textContent = 'That passcode isn’t right.'; return; }
        busy('Decrypting your journal…');
        const k = CRYPT.key;
        await convertDrafts(null);
        CRYPT.key = k;
        await recryptAll(null, (i, n) => toast(`Decrypting photos… ${i} of ${n}`, 60000));
        localStorage.removeItem(LOCK_KEY);
        toast('Passcode turned off');
      }
      passDlg.close();
      applySettings();
      route();
    } catch (e) {
      $('#psSave').disabled = false;
      err.textContent = 'Something went wrong. Your journal hasn’t changed; try again.';
    }
  });

  const lockEl = $('#lockScreen');
  let lockFails = 0, lockWaitUntil = 0;
  function showLock() {
    document.documentElement.classList.add('is-locked');
    lockEl.hidden = false;
    $('#lockHello').textContent = settings.name ? `Welcome back, ${settings.name}` : 'Welcome back';
    $('#lockPass').value = ''; $('#lockError').textContent = ''; $('#lockForgotBox').hidden = true;
    setTimeout(() => $('#lockPass').focus(), 60);
  }
  function lockNow() {
    if (!lockOn() || !CRYPT.key) return;
    [editor, personDlg, placeDlg, lb, passDlg, quickDlg, tagDlg].forEach((d) => { if (d.open) d.close(); });
    endPageEdit(); stopHero();
    CRYPT.key = null; sync.pcKey = null;
    entries = []; people = []; places = []; tags = []; capsules = [];
    [capsuleDlg, importDlg].forEach((d) => { if (d.open) d.close(); });
    if (!storyEl.hidden) closeStory();
    urlCache.forEach((p) => p.then((u) => u && URL.revokeObjectURL(u))); urlCache.clear();
    avatarURL.forEach((u) => URL.revokeObjectURL(u)); avatarURL.clear();
    view.innerHTML = '';
    if (fxEl) { fxEl.remove(); fxEl = null; }
    showLock();
  }
  $('#lockForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = $('#lockError');
    if (Date.now() < lockWaitUntil) { err.textContent = `Too many tries. Wait ${Math.ceil((lockWaitUntil - Date.now()) / 1000)} seconds.`; return; }
    $('#lockBtn').disabled = true; err.textContent = '';
    try {
      const { key } = await unwrapKey($('#lockPass').value, lockInfo());
      CRYPT.key = key; lockFails = 0;
      lockEl.hidden = true;
      document.documentElement.classList.remove('is-locked');
      await afterUnlock();
    } catch (_) {
      lockFails++;
      if (lockFails >= 5) lockWaitUntil = Date.now() + 30000 * Math.pow(2, lockFails - 5);
      err.textContent = lockFails >= 5 ? 'That passcode isn’t right. Wait 30 seconds before trying again.' : 'That passcode isn’t right.';
      $('#lockPass').select();
    } finally { $('#lockBtn').disabled = false; }
  });
  $('#lockForgot').addEventListener('click', () => { $('#lockForgotBox').hidden = !$('#lockForgotBox').hidden; });
  $('#lockEraseBtn').addEventListener('click', async () => {
    if ($('#lockErase').value.trim() !== 'ERASE') { $('#lockError').textContent = 'Type ERASE in capital letters to confirm.'; return; }
    await DB.close();
    await new Promise((res) => { const r = indexedDB.deleteDatabase('digital-journal'); r.onsuccess = r.onerror = r.onblocked = () => res(); });
    localStorage.removeItem(LOCK_KEY); draftKeys().forEach((k) => localStorage.removeItem(k));
    location.reload();
  });
  // Auto-lock after a period without activity, or when you come back after being away
  let lastActive = Date.now(), hiddenAt = 0;
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => document.addEventListener(t, () => { lastActive = Date.now(); }, { passive: true, capture: true }));
  const autoLockDue = (since) => CRYPT.key && lockOn() && settings.autolock > 0 && Date.now() - since > settings.autolock * 60000;
  setInterval(() => { if (autoLockDue(lastActive)) lockNow(); }, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); if (editor.open) saveDraft(); }
    else if (hiddenAt && autoLockDue(hiddenAt)) lockNow();
  });

  // ---------- Backup reminders ----------
  function backupDue() {
    if (!entries.length || !settings.backupEvery) return false;
    const last = settings.lastBackup || settings.firstUse || Date.now();
    return Date.now() - last > settings.backupEvery * 86400000 && Date.now() > (settings.backupSnooze || 0);
  }
  function backupBannerHTML() {
    if (!backupDue()) return '';
    const days = Math.floor((Date.now() - (settings.lastBackup || settings.firstUse)) / 86400000);
    return `<div class="note backup-note"><p>${settings.lastBackup ? `It’s been ${plural(days, 'day')} since your last backup.` : 'You haven’t made a backup yet.'} A backup file keeps your journal safe if this browser’s data is ever cleared.</p>
      <div class="row-tight"><button class="btn btn-primary" data-action="export">Export backup</button><button class="btn btn-ghost" data-action="snooze-backup">Remind me later</button></div></div>`;
  }

  // ---------- Weekly recap ----------
  const weekStart = (date) => { const d = D.parse(date); d.setDate(d.getDate() - d.getDay()); return D.fmt(d); }; // weeks run Sunday to Saturday
  const addDays = (date, n) => { const d = D.parse(date); d.setDate(d.getDate() + n); return D.fmt(d); };
  const weekLabel = (start) => `${D.tiny(start)} – ${D.tiny(addDays(start, 6))}`;
  function weekData(start) {
    const end = addDays(start, 6);
    const list = entries.filter((e) => e.date >= start && e.date <= end);
    const pc = new Map(), plc = new Map();
    list.forEach((e) => { e.peopleIds.forEach((id) => pc.set(id, (pc.get(id) || 0) + 1)); if (e.placeId) plc.set(e.placeId, (plc.get(e.placeId) || 0) + 1); });
    return {
      start, end, list, s: stats(list),
      people: [...pc].sort((a, b) => b[1] - a[1]).map(([id]) => personById(id)).filter(Boolean),
      places: [...plc].sort((a, b) => b[1] - a[1]).map(([id]) => placeById(id)).filter(Boolean),
      moods: moodCounts(list),
    };
  }
  function weekSentence(w) {
    if (!w.list.length) return 'Nothing written this week.';
    let t = `You wrote on <b>${w.s.days}</b> of 7 days${w.s.photos ? ` and added <b>${plural(w.s.photos, 'photo')}</b>` : ''}.`;
    if (w.people.length) t += ` You spent time with ${w.people.slice(0, 3).map((p) => `<b>${esc(p.name)}</b>`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`;
    if (w.moods.length) t += ` Mostly ${w.moods[0][0][2].toLowerCase()} ${w.moods[0][0][1]}.`;
    return t;
  }
  function renderWeek(start, today) {
    view.dataset.title = 'Week of ' + D.tiny(start);
    const w = weekData(start), map = byDate();
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const photos = photosOf([...w.list].reverse()).slice(0, 18);
    state.recapPhotos = photos.map((p) => p.id);
    view.innerHTML = `<div class="page-wide">
      ${recapHead('week', `#/recap/w${addDays(start, -7)}`, `#/recap/w${addDays(start, 7)}`, D.ym(start), start.slice(0, 4), start)}
      <h1 class="recap-title">${esc(weekLabel(start))}</h1>
      <p class="recap-summary">${weekSentence(w)}</p>
      <div class="week-days">${days.map((d) => {
        const list = map.get(d) || [], m = dayMood(list), cover = list.map((e) => e.photoIds[0]).find(Boolean);
        return `<a class="wday ${list.length ? 'on' : ''} ${d > today ? 'future' : ''}" href="${list.length ? (list.length === 1 ? `#/entry/${list[0].id}` : `#/day/${d}`) : '#/recap/w' + start}"${m ? ` style="--mc:${m[3]}"` : ''}>
          <span class="wd-name">${esc(D.parse(d).toLocaleDateString(undefined, { weekday: 'short' }))}</span><span class="wd-num">${Number(d.slice(8))}</span>
          <span class="wd-pic ph">${cover ? imgTag(cover) : (m ? `<span class="wd-mood">${m[1]}</span>` : '')}</span></a>`;
      }).join('')}</div>
      ${w.people.length ? `<section class="recap-section"><h2>People this week</h2><div class="row-tight">${w.people.map((p) => `<a class="pill" href="#/person/${p.id}">${avatarHTML(p)}${esc(p.name)}</a>`).join('')}</div></section>` : ''}
      ${w.places.length ? `<section class="recap-section"><h2>Places</h2><div class="row-tight">${w.places.map((p) => `<a class="pill" href="#/place/${p.id}"><span class="pin">${ICON.pin}</span>${esc(p.name)}</a>`).join('')}</div></section>` : ''}
      ${photos.length ? `<section class="recap-section"><h2>Photos</h2><div class="mosaic">${photos.map((p, i) => `<button class="tile ${i === 0 ? 'big' : ''}" data-action="mphoto" data-index="${i}" aria-label="Open photo">${imgTag(p.id, i === 0 ? 'md' : 'thumb')}${stamp(p.date)}</button>`).join('')}</div></section>` : ''}
      ${w.list.length ? `<section class="recap-section"><h2>Entries</h2><div class="mem-row">${[...w.list].reverse().map((e) => memCard(e)).join('')}</div></section>` : ''}
    </div>`;
  }
  // On Sundays and Mondays, Home shows the week that just ended
  function weekCardHTML() {
    const dow = new Date().getDay();
    if (dow !== 0 && dow !== 1) return '';
    const start = weekStart(addDays(D.today(), -(dow + 1)));
    const w = weekData(start);
    if (!w.list.length) return '';
    const pics = photosOf([...w.list].reverse()).slice(0, 4);
    return `<a class="week-card" href="#/recap/w${start}">
      <span class="wc-pics">${pics.map((p) => `<span class="ph">${imgTag(p.id)}</span>`).join('')}</span>
      <span class="wc-body"><small>Your week</small><b>${esc(weekLabel(start))}</b><span>${weekSentence(w)}</span><span class="link">See your week</span></span></a>`;
  }

  // ---------- Year in review story ----------
  const storyEl = document.createElement('div');
  storyEl.className = 'story'; storyEl.hidden = true; storyEl.setAttribute('role', 'dialog'); storyEl.setAttribute('aria-label', 'Year in review');
  document.body.appendChild(storyEl);
  const story = { slides: [], i: 0, timer: null, year: '' };
  function storyData(year) {
    const list = entries.filter((e) => e.date.startsWith(year));
    const s = stats(list);
    const pc = new Map(), plc = new Map(), mc = new Map();
    list.forEach((e) => { e.peopleIds.forEach((id) => pc.set(id, (pc.get(id) || 0) + 1)); if (e.placeId) plc.set(e.placeId, (plc.get(e.placeId) || 0) + 1); });
    for (const [date, dl] of byDate()) if (date.startsWith(year)) { const m = dayMood(dl); if (m) mc.set(m[0], (mc.get(m[0]) || 0) + 1); }
    const perMonth = Array.from({ length: 12 }, (_, i) => list.filter((e) => e.date.slice(5, 7) === pad(i + 1)));
    const bestIdx = perMonth.reduce((bi, m, i, a) => (m.length > a[bi].length ? i : bi), 0);
    const tops = [...list.filter((e) => e.fav && e.photoIds.length), ...list.filter((e) => !e.fav && e.photoIds.length).sort((a, b) => b.photoIds.length - a.photoIds.length)].slice(0, 3);
    return {
      year, list, s, tops,
      people: [...pc].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => [personById(id), n]).filter((x) => x[0]),
      places: [...plc].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => [placeById(id), n]).filter((x) => x[0]),
      moods: [...mc].sort((a, b) => b[1] - a[1]).map(([id, n]) => [moodOf(id), n]),
      best: { ym: `${year}-${pad(bestIdx + 1)}`, list: perMonth[bestIdx] },
    };
  }
  function buildStory(year) {
    const d = storyData(year);
    const S = [];
    S.push({ kind: 'intro', bg: '#1E2A2F', title: `Your ${year}`, sub: 'A look back at your journal', photo: d.tops[0] && d.tops[0].photoIds[0] });
    S.push({ kind: 'numbers', bg: '#2F6F73', title: 'You showed up', nums: [[d.s.days, d.s.days === 1 ? 'day written' : 'days written'], [d.s.entries, d.s.entries === 1 ? 'entry' : 'entries'], [d.s.photos, d.s.photos === 1 ? 'photo' : 'photos'], [d.s.words, d.s.words === 1 ? 'word' : 'words']] });
    d.tops.forEach((e, i) => S.push({ kind: 'moment', bg: '#111', title: e.title || excerpt(e.text, 60) || 'A moment', sub: D.long(e.date), photo: e.photoIds[0], label: i === 0 ? 'Top moments' : '', entry: e.id }));
    if (d.moods.length) S.push({ kind: 'mood', bg: d.moods[0][0][3], title: `Mostly ${d.moods[0][0][2].toLowerCase()}`, emoji: d.moods[0][0][1], sub: `${d.moods[0][0][2]} on ${plural(d.moods[0][1], 'day')}`, bar: d.moods });
    if (d.people.length) S.push({ kind: 'people', bg: '#8E5B7A', title: 'Your people', people: d.people });
    if (d.places.length) S.push({ kind: 'places', bg: '#3B6E8F', title: 'Your places', places: d.places });
    if (d.best.list.length) S.push({ kind: 'month', bg: '#B5562A', title: D.monthName(d.best.ym, { month: 'long' }), sub: `Your busiest month, with ${plural(d.best.list.length, 'entry', 'entries')}`, photo: d.best.list.map((e) => e.photoIds[0]).find(Boolean), label: 'Best month' });
    if (d.s.run > 1) S.push({ kind: 'streak', bg: '#5A4FA0', title: `${d.s.run} days in a row`, sub: 'Your longest writing streak' });
    S.push({ kind: 'outro', bg: '#1E2A2F', title: `Here’s to ${Number(year) + 1}`, sub: 'Thank you for writing it all down.' });
    return S;
  }
  function slideHTML2(sl, i) {
    const pic = sl.photo ? `<img class="st-bg" data-photo="${sl.photo}" data-kind="full" alt="">` : '';
    let body = '';
    switch (sl.kind) {
      case 'numbers': body = `<div class="st-nums">${sl.nums.map(([n, l]) => `<div><b>${num(n)}</b><span>${l}</span></div>`).join('')}</div>`; break;
      case 'mood': body = `<div class="st-emoji">${sl.emoji}</div><div class="st-bar">${sl.bar.map(([m, c]) => `<span style="flex:${c};background:${m[3]}" title="${m[2]}"></span>`).join('')}</div>`; break;
      case 'people': body = `<div class="st-list">${sl.people.map(([p, n]) => `<div class="st-row">${avatarHTML(p, 'lg')}<span><b>${esc(p.name)}</b><small>${plural(n, 'memory', 'memories')}</small></span></div>`).join('')}</div>`; break;
      case 'places': body = `<div class="st-list">${sl.places.map(([p, n]) => `<div class="st-row"><span class="avatar lg st-pin">${ICON.pin}</span><span><b>${esc(p.name)}</b><small>${plural(n, 'visit')}</small></span></div>`).join('')}</div>`; break;
    }
    return `<section class="st-slide st-${sl.kind}" data-i="${i}" style="--sbg:${sl.bg}">${pic}<div class="st-shade"></div>
      <div class="st-content">${sl.label ? `<p class="st-label">${esc(sl.label)}</p>` : ''}<h2>${esc(sl.title)}</h2>${sl.sub ? `<p class="st-sub">${esc(sl.sub)}</p>` : ''}${body}
      ${sl.entry ? `<a class="st-open" href="#/entry/${sl.entry}" data-story="close-go">Open this entry</a>` : ''}</div></section>`;
  }
  function openStory(year) {
    story.year = year; story.slides = buildStory(year); story.i = 0;
    storyEl.innerHTML = `<div class="st-frame">
      <div class="st-bars">${story.slides.map(() => '<span><i></i></span>').join('')}</div>
      <div class="st-top"><button type="button" data-story="video" class="st-btn">Save as video</button><button type="button" data-story="close" class="st-btn st-x" aria-label="Close">${ICON.x}</button></div>
      ${story.slides.map(slideHTML2).join('')}
      <button type="button" class="st-nav st-prev" data-story="prev" aria-label="Previous"></button><button type="button" class="st-nav st-next" data-story="next" aria-label="Next"></button>
      <p class="st-status" id="stStatus" role="status"></p>
    </div>`;
    storyEl.hidden = false; document.body.classList.add('story-open');
    hydrate(storyEl);
    storyShow(0);
  }
  function storyShow(i) {
    clearTimeout(story.timer);
    if (i >= story.slides.length) { closeStory(); return; }
    story.i = Math.max(0, i);
    $$('.st-slide', storyEl).forEach((s) => s.classList.toggle('on', Number(s.dataset.i) === story.i));
    $$('.st-bars span', storyEl).forEach((b, k) => { b.className = k < story.i ? 'done' : k === story.i ? 'run' : ''; });
    if (!story.recording) story.timer = setTimeout(() => storyShow(story.i + 1), 6000);
  }
  function closeStory() { clearTimeout(story.timer); storyEl.hidden = true; storyEl.innerHTML = ''; document.body.classList.remove('story-open'); }
  storyEl.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-story]'); if (!b) return;
    const a = b.dataset.story;
    if (a === 'next') storyShow(story.i + 1);
    if (a === 'prev') storyShow(story.i - 1);
    if (a === 'close') closeStory();
    if (a === 'close-go') closeStory();
    if (a === 'video') storyVideo();
  });
  document.addEventListener('keydown', (ev) => {
    if (storyEl.hidden) return;
    if (ev.key === 'Escape') closeStory();
    if (ev.key === 'ArrowRight' || ev.key === ' ') { ev.preventDefault(); storyShow(story.i + 1); }
    if (ev.key === 'ArrowLeft') storyShow(story.i - 1);
  });
  // Draws the story on a canvas, slide by slide, and records it as a video file
  async function storyVideo() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast('This browser can’t make videos. Try Chrome or Edge.', 4000); return; }
    const status = $('#stStatus');
    clearTimeout(story.timer); story.recording = true;
    status.textContent = 'Getting photos ready…';
    try {
      await Promise.all(['600 72px Literata', '600 40px Manrope', '400 36px Literata'].map((f) => document.fonts.load(f)));
      const W = 720, H = 1280, FPS = 30, PER = 3.2;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const imgs = {};
      for (const sl of story.slides) {
        if (sl.photo && !imgs[sl.photo]) { const r = await DB.getPhoto(sl.photo); if (r) imgs[sl.photo] = await createImageBitmap(r.md || r.blob); }
        for (const [p] of sl.people || []) if (p.photo && !imgs['p' + p.id]) imgs['p' + p.id] = await createImageBitmap(p.photo);
      }
      const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const rec = new MediaRecorder(c.captureStream(FPS), mime ? { mimeType: mime, videoBitsPerSecond: 5e6 } : {});
      const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise((res) => { rec.onstop = res; });
      const wrap = (text, x, y, maxW, lh) => { const words2 = String(text).split(' '); let line = ''; for (const w of words2) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t; } if (line) g.fillText(line, x, y); return y; };
      const cover = (bmp) => { const s = Math.max(W / bmp.width, H / bmp.height); const w = bmp.width * s, h = bmp.height * s; g.drawImage(bmp, (W - w) / 2, (H - h) / 2, w, h); };
      const drawSlide = (sl, t) => {
        g.globalAlpha = 1; g.fillStyle = sl.bg; g.fillRect(0, 0, W, H);
        if (sl.photo && imgs[sl.photo]) {
          g.save(); const z = 1 + 0.05 * t; g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2); cover(imgs[sl.photo]); g.restore();
          const grd = g.createLinearGradient(0, H * 0.35, 0, H); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.8)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
        }
        g.fillStyle = '#FFFFFF'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        let y = sl.photo ? H - 330 : 420;
        if (sl.label) { g.font = '600 30px Manrope'; g.globalAlpha = .85; g.fillText(sl.label, 64, y - 70); g.globalAlpha = 1; }
        g.font = '600 76px Literata'; y = wrap(sl.title, 64, y, W - 128, 88);
        if (sl.sub) { g.font = '400 36px Literata'; g.globalAlpha = .9; wrap(sl.sub, 64, y + 64, W - 128, 46); g.globalAlpha = 1; }
        if (sl.kind === 'numbers') { sl.nums.forEach(([n, l], i) => { g.font = '600 92px Literata'; g.fillText(num(Math.round(n * Math.min(1, t * 1.6))), 64, 640 + i * 150); g.font = '600 32px Manrope'; g.fillText(l, 64, 690 + i * 150); }); }
        if (sl.kind === 'mood') { g.font = '220px serif'; g.fillText(sl.emoji, 64, 760); let x = 64; const tot = sl.bar.reduce((a, b) => a + b[1], 0); sl.bar.forEach(([m, n]) => { const w = (W - 128) * n / tot; g.fillStyle = m[3]; g.fillRect(x, 860, w, 34); x += w; }); g.fillStyle = '#FFFFFF'; }
        if (sl.kind === 'people' || sl.kind === 'places') {
          (sl.people || sl.places).forEach(([p, n], i) => {
            const yy = 600 + i * 170;
            g.save(); g.beginPath(); g.arc(124, yy, 60, 0, Math.PI * 2); g.closePath(); g.fillStyle = 'rgba(255,255,255,.2)'; g.fill();
            if (imgs['p' + p.id]) { g.clip(); g.drawImage(imgs['p' + p.id], 64, yy - 60, 120, 120); }
            g.restore(); g.fillStyle = '#FFFFFF';
            g.font = '600 46px Manrope'; g.fillText(p.name, 220, yy - 4); g.font = '400 30px Manrope'; g.fillText(sl.people ? plural(n, 'memory', 'memories') : plural(n, 'visit'), 220, yy + 40);
          });
        }
        g.globalAlpha = .7; g.font = '600 26px Manrope'; g.fillText('Digital Journal', 64, H - 64); g.globalAlpha = 1;
      };
      rec.start();
      const total = story.slides.length * PER;
      const t0 = performance.now();
      await new Promise((res) => {
        const tick = () => {
          const el = (performance.now() - t0) / 1000;
          if (el >= total) { res(); return; }
          const i = Math.min(story.slides.length - 1, Math.floor(el / PER)), t = (el - i * PER) / PER;
          drawSlide(story.slides[i], t);
          if (t > 0.88 && i + 1 < story.slides.length) { g.globalAlpha = (t - 0.88) / 0.12; drawSlide(story.slides[i + 1], 0); g.globalAlpha = 1; }
          status.textContent = `Making your video… ${Math.round(el / total * 100)}%`;
          requestAnimationFrame(tick);
        };
        tick();
      });
      rec.stop(); await done;
      Object.values(imgs).forEach((b) => b.close && b.close());
      const ext = (mime || 'video/webm').includes('mp4') ? 'mp4' : 'webm';
      download(new Blob(chunks, { type: mime || 'video/webm' }), `my-${story.year}-in-review.${ext}`);
      status.textContent = 'Video saved to your downloads.';
    } catch (_) { status.textContent = 'The video couldn’t be made.'; }
    story.recording = false;
    setTimeout(() => { if (!storyEl.hidden) storyShow(story.i); }, 1500);
  }
  function storyCardHTML() {
    const m = new Date().getMonth();
    const year = m === 11 ? D.today().slice(0, 4) : m === 0 ? String(Number(D.today().slice(0, 4)) - 1) : null;
    if (!year || !entries.some((e) => e.date.startsWith(year))) return '';
    return `<button class="story-card" data-action="story" data-year="${year}"><span class="sc-big">${year}</span><span><b>Your ${year} in review</b><small>Tap through your year: top moments, moods, people and places.</small></span></button>`;
  }

  // ---------- Time capsules ----------
  let capsules = [];
  const capsuleDlg = document.createElement('dialog');
  capsuleDlg.className = 'mini'; capsuleDlg.setAttribute('aria-labelledby', 'cpHeading');
  capsuleDlg.innerHTML = `<form id="capsuleForm" novalidate>
      <header class="ed-head"><button type="button" class="btn btn-ghost" data-close>Cancel</button><h2 id="cpHeading">Write to future me</h2><button type="submit" class="btn btn-primary">Seal</button></header>
      <div class="mini-body">
        <p class="muted">Your letter stays sealed until the day you choose. Then it shows up on your Home page.</p>
        <div class="field"><span>Open on</span><div class="row-tight" id="cpPresets"></div><input type="date" id="cpDate" class="text-input" style="width:auto"></div>
        <input id="cpTitle" class="text-input" type="text" maxlength="120" placeholder="Title (optional)">
        <textarea id="cpText" class="text-input cp-text" rows="9" placeholder="Dear future me,"></textarea>
        <p class="ed-error" id="cpError" role="alert"></p>
      </div></form>`;
  document.body.appendChild(capsuleDlg);
  function openCapsule() {
    const t = D.today();
    const presets = [['1 month', addDays(t, 30)], ['6 months', addDays(t, 182)], ['1 year', `${Number(t.slice(0, 4)) + 1}${t.slice(4)}`], ['5 years', `${Number(t.slice(0, 4)) + 5}${t.slice(4)}`]];
    $('#cpPresets').innerHTML = presets.map(([n, d]) => `<button type="button" class="chip" data-cp="${d}">${n}</button>`).join('');
    $('#cpDate').value = presets[2][1]; $('#cpDate').min = addDays(t, 1);
    $('#cpTitle').value = ''; $('#cpText').value = ''; $('#cpError').textContent = '';
    capsuleDlg.showModal();
    setTimeout(() => $('#cpText').focus(), 30);
  }
  capsuleDlg.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-close]')) capsuleDlg.close();
    const p = ev.target.closest('[data-cp]'); if (p) $('#cpDate').value = p.dataset.cp;
  });
  $('#capsuleForm', capsuleDlg).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const open = $('#cpDate').value, text = $('#cpText').value.trim(), title = $('#cpTitle').value.trim();
    if (!D.valid(open) || open <= D.today()) { $('#cpError').textContent = 'Pick a date in the future.'; return; }
    if (!text) { $('#cpError').textContent = 'Write your letter first.'; return; }
    const now = Date.now();
    const e = norm({ id: uid(), date: D.today(), title: title || 'A letter to future me', text, capsule: open, createdAt: now, updatedAt: now });
    try { await DB.saveEntry(e, [], []); } catch (_) { $('#cpError').textContent = 'The letter couldn’t be saved. Try again.'; return; }
    capsules.push(e);
    capsuleDlg.close();
    toast(`Sealed until ${D.long(open)}`);
    route();
  });
  function arrivedHTML() {
    const today = D.today();
    const arrived = entries.filter((e) => e.capsule && e.capsule <= today && daysBetween(today, e.capsule) <= 14);
    return arrived.length ? `<section class="home-sec arrived-sec">${arrived.map((e) => `<a class="capsule arrived" href="#/entry/${e.id}"><span class="cap-icon">📬</span><span><b>A letter from your past self arrived</b><small>Written ${esc(D.long(e.date))}. Open it.</small></span></a>`).join('')}</section>` : '';
  }
  function capsulesHTML() {
    const today = D.today();
    const arrived = entries.filter((e) => e.capsule && e.capsule <= today && daysBetween(today, e.capsule) <= 14);
    const sealed = [...capsules].sort((a, b) => (a.capsule < b.capsule ? -1 : 1));
    const arrivedHTML = arrived.map((e) => `<a class="capsule arrived" href="#/entry/${e.id}"><span class="cap-icon">📬</span><span><b>A letter from your past self arrived</b><small>Written ${esc(D.long(e.date))}</small></span></a>`).join('');
    const sealedHTML = sealed.map((e) => { const n = daysBetween(e.capsule, today); return `<div class="capsule"><span class="cap-icon">✉️</span><span><b>Opens in ${n < 60 ? plural(n, 'day') : n < 350 ? plural(Math.round(n / 30.4), 'month') : plural(Math.round(n / 365.25), 'year')}</b><small>Sealed ${esc(D.medium(e.date))} · opens ${esc(D.medium(e.capsule))}</small></span><button class="linkbtn" data-action="delete-capsule" data-id="${e.id}">Delete</button></div>`; }).join('');
    void arrivedHTML;
    return `<section class="home-sec"><header><h2>Time capsules</h2><button class="linkbtn" data-action="capsule">Write to future me</button></header>
        ${sealedHTML ? `<div class="capsules">${sealedHTML}</div>` : '<div class="note"><p>Write a letter to yourself and choose when it opens: next month, next year, or in five years.</p><button class="btn btn-line" data-action="capsule">Write to future me</button></div>'}
      </section>`;
  }

  // ---------- Map of memories ----------
  let leafletReady = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (!leafletReady) leafletReady = new Promise((res, rej) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'lib/leaflet/leaflet.css'; document.head.appendChild(css);
      const sc = document.createElement('script'); sc.src = 'lib/leaflet/leaflet.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc);
    });
    return leafletReady;
  }
  let mapObj = null;
  async function renderMap() {
    view.dataset.title = 'Map of memories';
    const withCoords = places.filter((p) => p.lat != null && p.lng != null);
    const noCoords = places.filter((p) => (p.lat == null || p.lng == null) && p.addr && !/^https?:/i.test(p.addr));
    view.innerHTML = `<div class="page-wide">${backBtn}
      <header class="page-head"><h1>Map of memories</h1></header>
      <div class="map-wrap"><div id="memMap" class="mem-map" role="region" aria-label="Map of your places"></div></div>
      <p class="muted" style="margin-top:10px">${withCoords.length ? `${plural(withCoords.length, 'place')} on the map. Tap a pin to see what happened there.` : 'Places with a location appear here.'} The map needs an internet connection.</p>
      ${noCoords.length ? `<div class="note" style="margin-top:16px"><p>${plural(noCoords.length, 'place')} only ${noCoords.length === 1 ? 'has' : 'have'} an address (${noCoords.slice(0, 3).map((p) => esc(p.name)).join(', ')}). Look ${noCoords.length === 1 ? 'it' : 'them'} up to put ${noCoords.length === 1 ? 'it' : 'them'} on the map. This sends the address to OpenStreetMap.</p><button class="btn btn-line" data-action="geocode">Find on the map</button></div>` : ''}
      ${!places.length ? `<div class="note" style="margin-top:16px"><p>Add places on the People page, or save a spot from a photo’s location, and they’ll show up here.</p><a class="btn btn-line" href="#/people">Add a place</a></div>` : ''}
    </div>`;
    try { await loadLeaflet(); } catch (_) { $('#memMap').innerHTML = '<p class="muted" style="padding:20px">The map couldn’t load.</p>'; return; }
    if (!$('#memMap')) return;
    if (mapObj) { mapObj.remove(); mapObj = null; }
    mapObj = L.map('memMap', { scrollWheelZoom: true, attributionControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', attribution: '© OpenStreetMap contributors © CARTO' }).addTo(mapObj);
    const pts = [];
    withCoords.forEach((p) => {
      const list = placeEntries(p.id), n = list.length;
      const size = 34 + Math.min(n, 10) * 3;
      const cover = list.map((e) => e.photoIds[0]).find(Boolean);
      const icon = L.divIcon({ className: 'mem-pin', iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: `<span style="width:${size}px;height:${size}px">${n || ''}</span>` });
      const m = L.marker([p.lat, p.lng], { icon, title: p.name }).addTo(mapObj);
      m.bindPopup(() => {
        const div = document.createElement('div'); div.className = 'mem-pop';
        div.innerHTML = `<b>${esc(p.name)}</b><small>${n ? plural(n, 'memory', 'memories') : 'No memories yet'}</small>
          ${list.slice(0, 4).map((e) => `<a href="#/entry/${e.id}">${e.photoIds[0] ? imgTag(e.photoIds[0]) : ''}<span>${esc(e.title || D.medium(e.date))}<small>${esc(D.medium(e.date))}</small></span></a>`).join('')}
          ${n > 4 ? `<a class="more" href="#/place/${p.id}">See all ${n}</a>` : `<a class="more" href="#/place/${p.id}">Open place</a>`}`;
        $$('img[data-photo]', div).forEach((img) => fillImg(img));
        void cover;
        return div;
      }, { maxWidth: 260 });
      pts.push([p.lat, p.lng]);
    });
    if (pts.length) mapObj.fitBounds(pts, { padding: [40, 40], maxZoom: 14 }); else mapObj.setView([20, 0], 2);
  }
  async function geocodePlaces() {
    const list = places.filter((p) => (p.lat == null || p.lng == null) && p.addr && !/^https?:/i.test(p.addr));
    let found = 0;
    for (const p of list) {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(p.addr)}`, { headers: { Accept: 'application/json' } });
        const j = await r.json();
        if (j && j[0]) { const rec = { ...p, lat: +(+j[0].lat).toFixed(6), lng: +(+j[0].lon).toFixed(6) }; await DB.put('places', rec); places[places.findIndex((x) => x.id === p.id)] = rec; found++; }
      } catch (_) { /* offline or blocked */ }
      await new Promise((res) => setTimeout(res, 1100)); // OpenStreetMap asks for at most one lookup per second
    }
    toast(found ? `Found ${plural(found, 'place')} on the map` : 'Those addresses couldn’t be found. Try editing them to be more specific.', 4000);
    route();
  }

  // ---------- Catch-up import ----------
  const importDlg = document.createElement('dialog');
  importDlg.className = 'mini wide'; importDlg.setAttribute('aria-labelledby', 'imHeading');
  importDlg.innerHTML = `<form id="importForm" novalidate>
      <header class="ed-head"><button type="button" class="btn btn-ghost" data-close>Cancel</button><h2 id="imHeading">Import photos</h2><button type="submit" class="btn btn-primary" id="imSave" disabled>Create entries</button></header>
      <div class="mini-body" id="imBody"></div></form>`;
  document.body.appendChild(importDlg);
  const imp = { days: [], tags: [] };
  function drawImport() {
    const body = $('#imBody', importDlg);
    if (!imp.days.length) {
      body.innerHTML = `<p class="muted">Pick lots of photos at once, for example from a trip. They’re grouped by the day they were taken, and each day becomes an entry.</p>
        <label class="ed-add"><input type="file" accept="image/*" multiple data-im-file><span>Choose photos</span></label>`;
      $('#imSave', importDlg).disabled = true;
      return;
    }
    const total = imp.days.filter((d) => d.on).length;
    body.innerHTML = `<p class="muted">${plural(imp.days.reduce((n, d) => n + d.files.length, 0), 'photo')} from ${plural(imp.days.length, 'day')}. Untick days you don’t want, and add a title if you like.</p>
      <div class="field"><span>Add tags to all of them</span><div class="ed-tags">${sortedTags().map((t) => `<button type="button" class="tag-chip" data-im-tag="${t.id}" aria-pressed="${imp.tags.includes(t.id)}" style="--tc:${t.color}">#${esc(t.name)}</button>`).join('')}</div></div>
      <div class="im-days">${imp.days.map((d, i) => `<div class="im-day ${d.on ? '' : 'off'}">
        <label class="im-check"><input type="checkbox" data-im-on="${i}" ${d.on ? 'checked' : ''}><b>${esc(D.long(d.date))}</b><small>${plural(d.files.length, 'photo')}${d.place ? ` · ${esc(d.place.name)}` : ''}${d.guessed ? ' · date from file' : ''}</small></label>
        <input class="text-input im-title" data-im-title="${i}" type="text" maxlength="140" placeholder="Title (optional)" value="${esc(d.title)}">
        <div class="im-thumbs">${d.urls.slice(0, 8).map((u) => `<img src="${u}" alt="">`).join('')}${d.files.length > 8 ? `<span>+${d.files.length - 8}</span>` : ''}</div>
      </div>`).join('')}</div>
      <p class="ed-error" id="imError" role="alert"></p>`;
    const btn = $('#imSave', importDlg);
    btn.disabled = !total; btn.textContent = total ? `Create ${plural(total, 'entry', 'entries')}` : 'Create entries';
  }
  function openImport() { imp.days.forEach((d) => d.urls.forEach((u) => URL.revokeObjectURL(u))); imp.days = []; imp.tags = []; drawImport(); importDlg.showModal(); }
  importDlg.addEventListener('change', async (ev) => {
    const f = ev.target.closest('[data-im-file]');
    if (f && f.files.length) {
      $('#imBody', importDlg).innerHTML = '<p class="muted">Reading your photos…</p>';
      const groups = new Map();
      for (const file of [...f.files].filter((x) => x.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(x.name))) {
        const ex = await readExif(file);
        const date = (ex && ex.date) || D.fmt(new Date(file.lastModified || Date.now()));
        if (!groups.has(date)) groups.set(date, { date, files: [], urls: [], on: true, title: '', gps: null, guessed: !(ex && ex.date) });
        const g2 = groups.get(date); g2.files.push(file); if (g2.urls.length < 8) g2.urls.push(URL.createObjectURL(file));
        if (ex && ex.lat != null && !g2.gps) g2.gps = ex;
        if (ex && ex.date) g2.guessed = false;
      }
      imp.days = [...groups.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
      imp.days.forEach((d) => { d.place = d.gps ? nearPlace(d.gps.lat, d.gps.lng) : null; });
      drawImport();
      return;
    }
    const on = ev.target.closest('[data-im-on]'); if (on) { imp.days[+on.dataset.imOn].on = on.checked; drawImport(); }
  });
  importDlg.addEventListener('input', (ev) => { const t = ev.target.closest('[data-im-title]'); if (t) imp.days[+t.dataset.imTitle].title = t.value; });
  importDlg.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-close]')) importDlg.close();
    const t = ev.target.closest('[data-im-tag]');
    if (t) { const id = t.dataset.imTag; imp.tags = imp.tags.includes(id) ? imp.tags.filter((x) => x !== id) : [...imp.tags, id]; t.setAttribute('aria-pressed', String(imp.tags.includes(id))); }
  });
  $('#importForm', importDlg).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const days = imp.days.filter((d) => d.on);
    if (!days.length) return;
    const btn = $('#imSave', importDlg); btn.disabled = true;
    const totalPhotos = days.reduce((n, d) => n + d.files.length, 0);
    let done = 0, made = 0;
    for (const d of days) {
      const recs = [];
      for (const file of d.files) {
        try { recs.push(await processImage(file)); } catch (_) { /* skip unreadable */ }
        done++; btn.textContent = `Adding photos… ${done} of ${totalPhotos}`;
      }
      if (!recs.length) continue;
      const now = Date.now();
      const e = norm({ id: uid(), date: d.date, title: d.title.trim(), text: '', photoIds: recs.map((r) => r.id), tags: [...imp.tags], placeId: d.place ? d.place.id : '', createdAt: now, updatedAt: now });
      await DB.saveEntry(e, recs, []);
      entries.push(e); made++;
    }
    sortEntries();
    imp.days.forEach((d) => d.urls.forEach((u) => URL.revokeObjectURL(u)));
    importDlg.close();
    toast(`Created ${plural(made, 'entry', 'entries')}`);
    go('#/journal');
  });

  // ---------- Page editor extras: filters, backgrounds, layouts, undo, drawing ----------
  const FILTERS = {
    none: ['Original', ''], film: ['Film', 'contrast(1.08) saturate(.85) sepia(.18) brightness(1.03)'], bw: ['B&W', 'grayscale(1) contrast(1.1)'],
    warm: ['Warm', 'sepia(.22) saturate(1.25) hue-rotate(-8deg)'], cool: ['Cool', 'saturate(1.05) hue-rotate(14deg) brightness(1.03)'],
    fade: ['Faded', 'contrast(.82) brightness(1.1) saturate(.75)'], vivid: ['Vivid', 'saturate(1.5) contrast(1.08)'], sepia: ['Sepia', 'sepia(.8) contrast(1.05)'],
  };
  const SHAPES = [['orig', 'Original'], ['1', 'Square'], ['0.8', '4:5'], ['1.5', '3:2'], ['1.7778', '16:9'], ['round', 'Circle']];
  const BGS = [['', 'Plain'], ['kraft', 'Kraft paper'], ['grid', 'Graph paper'], ['dots', 'Dot grid'], ['lined', 'Notebook'], ['watercolor', 'Watercolor'],
    ['blush', 'Blush'], ['linen', 'Linen'], ['cork', 'Corkboard'], ['chalk', 'Chalkboard'], ['night', 'Night sky']];
  const PRESETS = [['scrapbook', 'Scrapbook', 'Photos in pairs with tape'], ['wall', 'Polaroid wall', 'Pinned polaroids in rows'], ['big', 'Big photo + small ones', 'One hero photo, the rest below'],
    ['grid', 'Collage grid', 'Neat squares, no gaps'], ['rows', 'Neat rows', 'Three across with white borders']];
  const INK_COLORS = ['#1E2A2F', '#C2362B', '#2F6F73', '#3C6E9E', '#E8A317', '#7DBE6E', '#EC7FA9', '#FFFFFF'];
  const fmtDur = (s) => { s = Math.round(s || 0); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };

  function peUndoBtns() {
    const u = $('[data-pe="undo"]', tray), r = $('[data-pe="redo"]', tray);
    if (u) u.disabled = !pe.undo.length;
    if (r) r.disabled = !pe.redo.length;
  }
  function peSnap() { pe.undo.push(JSON.stringify(pe.layout)); if (pe.undo.length > 60) pe.undo.shift(); pe.redo = []; peUndoBtns(); }
  function peUndo() { if (!pe.undo.length) return; pe.redo.push(JSON.stringify(pe.layout)); pe.layout = JSON.parse(pe.undo.pop()); pe.sel = null; peDraw(); drawPeTray(); }
  function peRedo() { if (!pe.redo.length) return; pe.undo.push(JSON.stringify(pe.layout)); pe.layout = JSON.parse(pe.redo.pop()); pe.sel = null; peDraw(); drawPeTray(); }
  function peRemove(it) {
    pe.layout.items = pe.layout.items.filter((x) => x !== it);
    const hide = (id) => { pe.layout.hidden = [...new Set([...(pe.layout.hidden || []), id])]; };
    if (it.type === 'photo' && !pe.layout.items.some((x) => x.type === 'photo' && x.pid === it.pid)) hide(it.pid);
    if ((it.type === 'audio' || it.type === 'video') && !pe.layout.items.some((x) => x.mid === it.mid)) hide(it.mid);
    if (it.type === 'song' && !pe.layout.items.some((x) => x.type === 'song')) hide('song');
    pe.sel = null;
  }
  function applyPreset(id) {
    const photos = pe.layout.items.filter((it) => it.type === 'photo');
    let rest = pe.layout.items.filter((it) => it.type !== 'photo' && it.type !== 'tape' && !(it.type === 'sticker' && it.pin));
    const extra = [];
    if (id === 'scrapbook') {
      const gen = placePhotos(photos.map((p) => p.pid), 0, seeded(String(Date.now())));
      gen.filter((g) => g.type === 'photo').forEach((g, i) => Object.assign(photos[i], { x: g.x, y: g.y, w: g.w, r: g.r, frame: g.frame }));
      extra.push(...gen.filter((g) => g.type === 'tape'));
    } else if (id === 'wall') {
      let y = 2;
      for (let i = 0; i < photos.length; i += 3) {
        let rowB = y;
        photos.slice(i, i + 3).forEach((p, k) => {
          Object.assign(p, { frame: 'polaroid', w: 29, x: 3 + k * 32.5, y: y + (k % 2) * 2, r: +((Math.random() * 10) - 5).toFixed(1) });
          extra.push({ id: uid(), type: 'sticker', e: '📌', pin: true, w: 6, x: p.x + p.w / 2 - 3, y: p.y - 3, r: 0 });
          rowB = Math.max(rowB, itemBottom(p));
        });
        y = rowB + 6;
      }
    } else if (id === 'big') {
      if (photos[0]) Object.assign(photos[0], { frame: 'none', w: 92, x: 4, y: 0, r: 0 });
      let y = photos[0] ? itemBottom(photos[0]) + 3 : 0;
      for (let i = 1; i < photos.length; i += 4) {
        let rowB = y;
        photos.slice(i, i + 4).forEach((p, k) => { Object.assign(p, { frame: 'none', w: 21.5, x: 4 + k * 23.5, y, r: 0, crop: { ...(p.crop || {}), ar: 1, round: false } }); rowB = Math.max(rowB, itemBottom(p)); });
        y = rowB + 2;
      }
    } else if (id === 'grid') {
      photos.forEach((p, i) => Object.assign(p, { frame: 'none', w: 47.5, x: i % 2 ? 50.5 : 2, y: Math.floor(i / 2) * 48.5, r: 0, crop: { ...(p.crop || {}), ar: 1, round: false } }));
    } else if (id === 'rows') {
      let y = 2;
      for (let i = 0; i < photos.length; i += 3) {
        let rowB = y;
        photos.slice(i, i + 3).forEach((p, k) => { Object.assign(p, { frame: 'print', w: 30, x: 3 + k * 32.3, y, r: 0 }); rowB = Math.max(rowB, itemBottom(p)); });
        y = rowB + 4;
      }
    }
    // Keep notes, stickers and the rest below the new photo arrangement if they would overlap
    const top = layoutBottom([...photos, ...extra]) + 3;
    const minY = Math.min(...rest.map((r) => r.y), Infinity);
    if (rest.length && minY < top) rest = rest.map((r) => ({ ...r, y: +(r.y - minY + top).toFixed(2) }));
    pe.layout.items = [...photos, ...extra, ...rest];
    pe.sel = null;
  }
  function smoothPath(pts) {
    const f = (n) => +n.toFixed(2);
    if (pts.length < 3) return `M${f(pts[0][0])} ${f(pts[0][1])}` + pts.slice(1).map((p) => ` L${f(p[0])} ${f(p[1])}`).join('') + (pts.length === 1 ? ` l0.01 0` : '');
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
    }
    const l = pts[pts.length - 1];
    return d + ` L${f(l[0])} ${f(l[1])}`;
  }
  // Drawing with the pointer: each stroke becomes its own movable item
  function inkStart(ev, cv) {
    const rect = cv.getBoundingClientRect(), W = rect.width, H = rect.height / W * 100;
    const toU = (e2) => [(e2.clientX - rect.left) / W * 100, (e2.clientY - rect.top) / W * 100];
    const tool = pe.draw.tool, hl = tool === 'hl';
    const s = hl ? pe.draw.size * 4 : pe.draw.size, c = pe.draw.color, o = hl ? 0.38 : 1;
    const svgNS = 'http://www.w3.org/2000/svg';
    const live = document.createElementNS(svgNS, 'svg');
    live.setAttribute('class', 'ink-live'); live.setAttribute('viewBox', `0 0 100 ${H}`); live.setAttribute('preserveAspectRatio', 'none');
    const path = document.createElementNS(svgNS, 'path');
    Object.entries({ stroke: c, 'stroke-width': s, 'stroke-opacity': o, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }).forEach(([k, v]) => path.setAttribute(k, v));
    live.appendChild(path); cv.appendChild(live);
    const pts = [toU(ev)];
    path.setAttribute('d', smoothPath(pts));
    pe.ink = { cv, live, path, pts, toU, s, c, o };
    cv.setPointerCapture(ev.pointerId);
  }
  function inkMove(ev) {
    const k = pe.ink; if (!k) return;
    const p = k.toU(ev), last = k.pts[k.pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.25) return;
    k.pts.push(p); k.path.setAttribute('d', smoothPath(k.pts));
  }
  function inkEnd() {
    const k = pe.ink; if (!k) return;
    pe.ink = null; k.live.remove();
    const xs = k.pts.map((p) => p[0]), ys = k.pts.map((p) => p[1]);
    const pad2 = k.s, minX = Math.min(...xs) - pad2, minY = Math.min(...ys) - pad2;
    const w = Math.max(Math.max(...xs) - Math.min(...xs) + pad2 * 2, 1), h = Math.max(Math.max(...ys) - Math.min(...ys) + pad2 * 2, 1);
    const rel = k.pts.map((p) => [p[0] - minX, p[1] - minY]);
    peSnap();
    pe.layout.items.push({ id: uid(), type: 'ink', x: +minX.toFixed(2), y: +minY.toFixed(2), w: +w.toFixed(2), ar: +(w / h).toFixed(4), vb: [+w.toFixed(2), +h.toFixed(2)], paths: [{ d: smoothPath(rel), c: k.c, s: k.s, o: k.o }], r: 0 });
    peDraw(); drawPeTray();
  }

  // ---------- Voice notes and videos (editor) ----------
  const rec = { mr: null, chunks: [], t0: 0, timer: null, stream: null };
  function renderEdMedia() {
    $('#edMedia').innerHTML = ed.media.map((m) => `<div class="ed-m">
      ${m.kind === 'audio' ? `<span class="ed-m-ic">🎙️</span><audio controls preload="none" src="${m.url || ''}"></audio>` : `<span class="ed-m-ic">🎬</span>${m.thumbUrl ? `<img src="${m.thumbUrl}" alt="">` : ''}<span class="muted">Video · ${fmtDur(m.dur)}</span>`}
      <button type="button" class="linkbtn" data-ed="del-media" data-id="${m.id}">Remove</button></div>`).join('');
    const b = $('[data-ed="record"]');
    if (b) b.textContent = rec.mr ? `■ Stop recording (${fmtDur((Date.now() - rec.t0) / 1000)})` : '● Record a voice note';
  }
  async function toggleRecord() {
    if (rec.mr) { rec.mr.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('This browser can’t record audio.', 3500); return; }
    try { rec.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (_) { toast('Microphone access was blocked. Allow it in the browser’s site settings and try again.', 5000); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
    rec.mr = new MediaRecorder(rec.stream, mime ? { mimeType: mime } : {});
    rec.chunks = []; rec.t0 = Date.now();
    rec.mr.ondataavailable = (e) => e.data.size && rec.chunks.push(e.data);
    rec.mr.onstop = async () => {
      clearInterval(rec.timer);
      rec.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(rec.chunks, { type: rec.mr.mimeType || 'audio/webm' });
      const dur = (Date.now() - rec.t0) / 1000;
      rec.mr = null;
      const r = { id: uid(), kind: 'audio', blob, dur, addedAt: Date.now() };
      ed.media.push({ id: r.id, kind: 'audio', isNew: true, rec: r, url: URL.createObjectURL(blob), dur });
      ed.dirty = true;
      DB.putPhoto({ ...r, entryId: '__draft__' }).catch(() => {});
      renderEdMedia();
    };
    rec.mr.start(1000);
    rec.timer = setInterval(() => { renderEdMedia(); if (Date.now() - rec.t0 > 5 * 60000 && rec.mr) rec.mr.stop(); }, 500);
    renderEdMedia();
  }
  async function addVideo(file) {
    if (!file) return;
    if (file.size > 150 * 1024 * 1024) { toast('That video is over 150 MB. Trim it or pick a shorter clip.', 4500); return; }
    toast('Adding video…');
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(rej, 15000); });
      v.currentTime = Math.min(0.6, (v.duration || 1) / 3);
      await new Promise((res) => { v.onseeked = res; setTimeout(res, 3000); });
      const cw = v.videoWidth || 640, ch = v.videoHeight || 360, s = Math.min(1, 900 / Math.max(cw, ch));
      const c = document.createElement('canvas'); c.width = Math.round(cw * s); c.height = Math.round(ch * s);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      const thumb = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.84));
      URL.revokeObjectURL(url);
      const r = { id: uid(), kind: 'video', blob: file.slice(0, file.size, file.type || 'video/mp4'), thumb, w: cw, h: ch, dur: v.duration || 0, addedAt: Date.now() };
      ed.media.push({ id: r.id, kind: 'video', isNew: true, rec: r, thumbUrl: URL.createObjectURL(thumb), dur: r.dur });
      ed.dirty = true;
      DB.putPhoto({ ...r, entryId: '__draft__' }).catch(() => {});
      renderEdMedia();
    } catch (_) { toast('That video couldn’t be opened. MP4 and WebM work best.', 4500); }
  }
  async function loadEdMedia(entry) {
    ed.media = []; ed.removedMedia = [];
    for (const id of (entry && entry.mediaIds) || []) {
      const r = await DB.getPhoto(id).catch(() => null);
      if (!r) continue;
      ed.media.push({ id, kind: r.kind, isNew: false, url: r.kind === 'audio' ? URL.createObjectURL(r.blob) : '', thumbUrl: r.thumb ? URL.createObjectURL(r.thumb) : '', dur: r.dur || 0 });
    }
    renderEdMedia();
  }

  // ---------- Playing voice notes and videos on a page ----------
  let playing = null;
  async function playAudio(mid, btn) {
    if (playing && playing.mid === mid) { playing.audio.pause(); playing.btn.textContent = '▶'; playing = null; return; }
    if (playing) { playing.audio.pause(); playing.btn.textContent = '▶'; }
    const url = await photoURL(mid, 'full');
    const audio = new Audio(url);
    playing = { mid, audio, btn };
    btn.textContent = '❚❚';
    audio.onended = () => { btn.textContent = '▶'; playing = null; };
    audio.play().catch(() => { btn.textContent = '▶'; playing = null; });
  }
  async function playVideo(mid) {
    const url = await photoURL(mid, 'full');
    const v = $('#lbVideo');
    lbState.ids = []; lb.classList.add('single', 'video'); $('#lbCount').textContent = '';
    $('#lbImg').removeAttribute('src');
    v.src = url; v.hidden = false;
    lb.showModal();
    v.play().catch(() => {});
  }
  lb.addEventListener('close', () => { const v = $('#lbVideo'); v.pause(); v.removeAttribute('src'); v.hidden = true; lb.classList.remove('video'); });

  // ---------- Book mode ----------
  const book = { pages: [], spread: 0, busy: false, single: false };
  function bookPagesList() { return [{ cover: true }, ...[...entries].reverse().map((e) => ({ e }))]; }
  async function bookPageHTML(pg, side) {
    if (!pg) return `<div class="bk-page bk-${side} bk-blank"></div>`;
    if (pg.cover) {
      const first = entries[entries.length - 1], last = entries[0];
      return `<div class="bk-page bk-${side} bk-cover"><div class="bk-cover-in">${stamp(D.today())}<h2>${esc(settings.name ? `${settings.name}’s Journal` : 'My Journal')}</h2>
        <p>${first ? `${esc(D.monthName(D.ym(first.date)))} – ${esc(D.monthName(D.ym(last.date)))}` : ''}</p><p class="muted">${plural(entries.length, 'entry', 'entries')}</p></div></div>`;
    }
    const e = pg.e, layout = await pageLayout(e);
    const tg = e.tags.map(tagById).filter(Boolean);
    return `<div class="bk-page bk-${side}"><div class="bk-in sheet${tintCls(e)}${layout.bg ? ' bg-' + layout.bg : ''}${tfClass(e)}"${tintStyle(e)}>
      <header class="entry-head">${stamp(e.date, 'stamp-paper')}${e.title ? titleHTML(e, 'h2') : ''}
        ${moodOf(e.mood) || tg.length ? `<div class="entry-meta">${moodBadge(e)}${tg.map((t) => tagChip(t, false)).join('')}</div>` : ''}</header>
      ${layout.textPos === 'above' && e.text ? `<div class="entry-text">${paragraphs(e.text)}</div>` : ''}
      ${canvasHTML(e, layout)}
      ${layout.textPos !== 'above' && e.text ? `<div class="entry-text">${paragraphs(e.text)}</div>` : ''}
    </div><a class="bk-open" href="#/entry/${e.id}">Open</a><span class="bk-num">${book.pages.indexOf(pg)}</span></div>`;
  }
  async function bookSpreadHTML(k) {
    const per = book.single ? 1 : 2;
    const a = book.pages[k * per], b = per === 2 ? book.pages[k * per + 1] : null;
    return per === 2 ? (await bookPageHTML(a, 'left')) + (await bookPageHTML(b, 'right')) : await bookPageHTML(a, 'single');
  }
  const bookSpreads = () => Math.ceil(book.pages.length / (book.single ? 1 : 2));
  async function renderBook() {
    view.dataset.title = 'Book';
    book.pages = bookPagesList();
    book.single = window.innerWidth < 900;
    if (!entries.length) { view.innerHTML = emptyHTML(); return; }
    book.spread = bookSpreads() - 1;
    view.innerHTML = `<div class="book-wrap">
      <div class="bk-bar">${backBtn}<span class="bk-pos" id="bkPos"></span><span class="spacer"></span>
        <button class="icon-btn" data-book="first" aria-label="First page" title="First page">⏮</button>
        <button class="icon-btn" data-book="prev" aria-label="Previous page">${ICON.left}</button>
        <button class="icon-btn" data-book="next" aria-label="Next page">${ICON.right}</button>
        <button class="icon-btn" data-book="last" aria-label="Latest page" title="Latest page">⏭</button></div>
      <div class="book ${book.single ? 'single' : ''}" id="book"><div class="bk-spread" id="bkSpread"></div></div>
    </div>`;
    await bookDraw();
  }
  async function bookDraw() {
    const el = $('#bkSpread'); if (!el) return;
    el.innerHTML = await bookSpreadHTML(book.spread);
    hydrate(el); fitAll(el);
    $('#bkPos').textContent = `${book.spread + 1} of ${bookSpreads()}`;
  }
  async function bookTurn(dir) {
    if (book.busy) return;
    const next = clamp(book.spread + dir, 0, bookSpreads() - 1);
    if (next === book.spread) return;
    book.busy = true;
    const bk = $('#book'), spread = $('#bkSpread');
    if (!reducedMotion() && bk) {
      // A leaf that flips over, showing the next page on its back
      const per = book.single ? 1 : 2;
      const front = $(dir > 0 ? (book.single ? '.bk-single' : '.bk-right') : (book.single ? '.bk-single' : '.bk-left'), spread);
      const backPg = book.pages[dir > 0 ? next * per : next * per + per - 1];
      const leaf = document.createElement('div');
      leaf.className = `bk-leaf ${dir > 0 ? 'fwd' : 'back'}${book.single ? ' single' : ''}`;
      leaf.innerHTML = `<div class="bk-face front">${front ? front.innerHTML : ''}</div><div class="bk-face backside">${await bookPageHTML(backPg, 'x')}</div>`;
      const newHTML = await bookSpreadHTML(next);
      bk.appendChild(leaf);
      hydrate(leaf); fitAll(leaf);
      // Underneath, show the destination pages so they appear as the leaf turns
      const under = document.createElement('div'); under.className = 'bk-spread bk-under'; under.innerHTML = newHTML; bk.insertBefore(under, spread);
      hydrate(under); fitAll(under);
      if (front) front.style.visibility = 'hidden';
      requestAnimationFrame(() => leaf.classList.add('go'));
      await new Promise((res) => setTimeout(res, 720));
      leaf.remove(); spread.remove(); under.classList.remove('bk-under'); under.id = 'bkSpread';
      book.spread = next;
      $('#bkPos').textContent = `${book.spread + 1} of ${bookSpreads()}`;
    } else { book.spread = next; await bookDraw(); }
    book.busy = false;
  }
  view.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-book]'); if (!b || !$('#book')) return;
    const a = b.dataset.book;
    if (a === 'next') bookTurn(1);
    if (a === 'prev') bookTurn(-1);
    if (a === 'first') { book.spread = 0; bookDraw(); }
    if (a === 'last') { book.spread = bookSpreads() - 1; bookDraw(); }
  });
  document.addEventListener('keydown', (ev) => {
    if (!$('#book') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (ev.key === 'ArrowRight') bookTurn(1);
    if (ev.key === 'ArrowLeft') bookTurn(-1);
  });
  let bookTouch = null;
  view.addEventListener('touchstart', (ev) => { if ($('#book')) bookTouch = ev.touches[0].clientX; }, { passive: true });
  view.addEventListener('touchend', (ev) => { if (bookTouch == null || !$('#book')) return; const dx = ev.changedTouches[0].clientX - bookTouch; bookTouch = null; if (Math.abs(dx) > 50) bookTurn(dx < 0 ? 1 : -1); });

  // ---------- Print / save as PDF ----------
  async function renderPrint(arg) {
    const isYear = /^\d{4}$/.test(arg || '');
    const list = [...entries].reverse().filter((e) => (arg ? e.date.startsWith(arg) : true));
    const label = isYear ? arg : arg ? D.monthName(arg) : 'All entries';
    view.dataset.title = 'Print ' + label;
    const layouts = await Promise.all(list.map(pageLayout));
    const s = stats(list);
    view.innerHTML = `<div class="print-wrap">
      <div class="print-bar">${backBtn}<p>${plural(list.length, 'entry', 'entries')}, one per page. In the print window, choose <b>Save as PDF</b> to make a PDF, or pick your printer.</p><button class="btn btn-primary" data-action="do-print">Print or save as PDF</button></div>
      <section class="print-page print-cover"><div>${stamp(list[0] ? list[0].date : D.today(), 'stamp-paper stamp-lg')}<h1>${esc(label)}</h1>
        <p>${s.days} days written · ${plural(s.entries, 'entry', 'entries')} · ${plural(s.photos, 'photo')}</p><p class="muted">${esc(settings.name ? settings.name + '’s journal' : 'My journal')}</p></div></section>
      ${list.map((e, i) => `<section class="print-page">${entryHTML(e, layouts[i], 'h2')}</section>`).join('')}
    </div>`;
    // Load every picture now (not lazily) so the PDF has them all
    $$('img[data-photo]', view).forEach((img) => fillImg(img));
    fitAll();
    if (document.fonts) document.fonts.ready.then(() => fitAll());
  }
  async function doPrint() {
    toast('Getting pictures ready…');
    const imgs = $$('.print-wrap img', view);
    await Promise.all(imgs.map((img) => (img.complete && img.naturalWidth) ? null : new Promise((res) => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); setTimeout(res, 8000); })));
    if (document.fonts) await document.fonts.ready;
    fitAll();
    window.print();
  }

  // ---------- Share a page as an image ----------
  let shareLibs = null;
  function loadShareLibs() {
    if (!shareLibs) shareLibs = Promise.all(['lib/html-to-image.js', 'lib/fonts-embed.js'].map((src) => new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); })));
    return shareLibs;
  }
  async function sharePage(id) {
    const sheet = $(`.entry-full[data-id="${id}"] .sheet`);
    if (!sheet) return;
    toast('Making an image of this page…', 20000);
    try {
      await loadShareLibs();
      $$('img[data-photo]', sheet).forEach((img) => { if (!img.src) fillImg(img); });
      await Promise.all($$('img', sheet).map((img) => (img.complete && img.naturalWidth) ? null : new Promise((res) => { img.onload = img.onerror = res; setTimeout(res, 6000); })));
      const bg = getComputedStyle(sheet).backgroundColor;
      const png = await window.htmlToImage.toBlob(sheet, {
        pixelRatio: 2, backgroundColor: bg, fontEmbedCSS: window.__FONT_CSS,
        filter: (n) => !(n.classList && (n.classList.contains('map-box') || n.classList.contains('entry-place'))),
      });
      const e = byId(id);
      const name = `journal-${e ? e.date : 'page'}.png`;
      const file = new File([png], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: e && e.title ? e.title : 'Journal page' }); toast('Shared'); }
      else { download(png, name); toast('Image saved to your downloads'); }
    } catch (err) { toast('The image couldn’t be made. Try again.', 3500); }
  }
  function songFromInputs() {
    const title = $('#edSongTitle').value.trim(), artist = $('#edSongArtist').value.trim();
    let link = $('#edSongLink').value.trim();
    if (link && !/^https?:\/\//i.test(link)) link = /^[\w-]+(\.[\w-]+)+/.test(link) ? 'https://' + link : '';
    return title ? { title, artist, link } : null;
  }

  // ---------- Phone app & Google Drive ----------
  // The phone sends entries, sealed with this PC's public key, to a hidden app folder in your
  // Google Drive. This PC picks them up, saves them into the journal and deletes them from Drive.
  // Approved phones get a sealed list of your tag, people and place names so they can pick them.
  const SYNC_KEY = 'dj-sync';
  const syncGet = () => { try { return JSON.parse(localStorage.getItem(SYNC_KEY) || 'null') || {}; } catch (_) { return {}; } };
  const syncSet = (patch) => { const s = { ...syncGet(), ...patch }; localStorage.setItem(SYNC_KEY, JSON.stringify(s)); return s; };
  const sync = { busy: false, timer: null, pcKey: null, failed: [] };
  const syncReady = () => DJ.drive.available() && !!DJ.drive.cid();
  const syncSetUp = () => syncReady() && !!syncGet().pub;
  const phoneLink = () => `${DJ.drive.redirectURI()}phone/#cid=${encodeURIComponent(DJ.drive.cid())}`;
  async function storePriv(jwk, key) { return key ? { priv: null, privEnc: b64(await encJSON(jwk, key)) } : { priv: jwk, privEnc: null }; }
  let pcKeyP = null;
  function pcKeys() {
    if (sync.pcKey) return Promise.resolve(sync.pcKey);
    if (!pcKeyP) pcKeyP = makePcKeys().finally(() => { pcKeyP = null; });
    return pcKeyP;
  }
  async function makePcKeys() {
    let s = syncGet();
    if (!s.pub) {
      const kp = await DJ.keys.generate(true);
      const pub = await DJ.keys.exportPub(kp.publicKey), priv = await DJ.keys.exportPriv(kp.privateKey);
      s = syncSet({ pub, fp: await DJ.keys.fingerprint(pub), ...(await storePriv(priv, CRYPT.key)), phones: s.phones || {} });
    }
    const jwk = s.privEnc ? await decJSON(unb64(s.privEnc)) : s.priv;
    sync.pcKey = { pub: s.pub, fp: s.fp, priv: await DJ.keys.importPriv(jwk) };
    return sync.pcKey;
  }
  // When the passcode is turned on or off, this PC's private key is re-locked the same way
  async function syncRewrap(fromKey, toKey) {
    const s = syncGet(); if (!s.pub) return;
    let jwk = s.priv;
    if (s.privEnc) { if (!fromKey) return; jwk = await decJSON(unb64(s.privEnc), fromKey); }
    syncSet(await storePriv(jwk, toKey));
  }
  const sha = async (str) => b64(new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(str))));
  const namesPayload = () => ({
    v: 1,
    tags: sortedTags().map((t) => ({ id: t.id, name: t.name, color: t.color })),
    people: [...people].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ id: p.id, name: p.name })),
    places: [...places].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ id: p.id, name: p.name, addr: p.addr || '', lat: p.lat ?? null, lng: p.lng ?? null })),
  });
  async function importInbox(f, priv) {
    const { manifest: m, blobs } = DJ.unpack(await DJ.open(priv, await DJ.drive.download(f.id)));
    const map = {};
    const sameName = (list, n) => list.find((x) => x.name.trim().toLowerCase() === String(n || '').trim().toLowerCase());
    for (const t of m.newTags || []) {
      const ex = sameName(tags, t.name);
      if (ex) { map[t.id] = ex.id; continue; }
      const rec = { id: t.id, name: t.name.slice(0, 40), color: t.color || TAG_COLORS[tags.length % TAG_COLORS.length], createdAt: Date.now() };
      await DB.put('tags', rec); tags.push(rec);
    }
    for (const p of m.newPeople || []) {
      const ex = sameName(people, p.name);
      if (ex) { map[p.id] = ex.id; continue; }
      const rec = { id: p.id, name: p.name.slice(0, 60), photo: null, createdAt: Date.now() };
      await DB.put('people', rec); people.push(rec);
    }
    for (const p of m.newPlaces || []) {
      const ex = sameName(places, p.name);
      if (ex) { map[p.id] = ex.id; continue; }
      const rec = { id: p.id, name: p.name.slice(0, 80), addr: p.addr || '', link: '', lat: p.lat ?? null, lng: p.lng ?? null, createdAt: Date.now() };
      await DB.put('places', rec); places.push(rec);
    }
    const recs = [];
    for (const ph of m.photos || []) recs.push({ id: ph.id, blob: blobs[ph.parts.blob], md: blobs[ph.parts.md], thumb: blobs[ph.parts.thumb], w: ph.w, h: ph.h, addedAt: ph.addedAt || Date.now() });
    for (const md of m.media || []) recs.push({ id: md.id, kind: md.kind, blob: blobs[md.parts.blob], thumb: md.parts.thumb != null ? blobs[md.parts.thumb] : null, w: md.w || 0, h: md.h || 0, dur: md.dur || 0, addedAt: Date.now() });
    const e = m.entry || {}, mp = (id) => map[id] || id;
    const entry = norm({
      ...e, id: e.id || uid(), date: D.valid(e.date) ? e.date : D.today(),
      tags: (e.tags || []).map(mp).filter((id) => tagById(id)),
      peopleIds: (e.peopleIds || []).map(mp).filter((id) => personById(id)),
      placeId: e.placeId && placeById(mp(e.placeId)) ? mp(e.placeId) : '',
      photoIds: (m.photos || []).map((p) => p.id), mediaIds: (m.media || []).map((x) => x.id),
      layout: null, assetIds: [], fromPhone: true, createdAt: e.createdAt || Date.now(), updatedAt: Date.now(),
    });
    await DB.saveEntry(entry, recs, []);
    await DJ.drive.del(f.id);
  }
  const syncSig = () => { const s = syncGet(); return JSON.stringify([Object.values(s.phones || {}).map((p) => p.id + p.approved), s.otherPc || '', sync.failed.length]); };
  async function syncCheck({ quiet = true } = {}) {
    if (!syncReady() || !DJ.drive.token() || sync.busy || (lockOn() && !CRYPT.key)) return 0;
    sync.busy = true; refreshSyncUI();
    const sig0 = syncSig();
    let got = 0;
    try {
      const me = await pcKeys();
      const files = await DJ.drive.list();
      const byName = (n) => files.find((f) => f.name === n);
      // This PC's public key, so phones can seal entries for it
      const kf = byName('pc-key.json');
      if (!kf) await DJ.drive.uploadJSON('pc-key.json', { v: 1, pub: me.pub, fp: me.fp, createdAt: Date.now() });
      else if (syncGet().pcKeyFile !== kf.id) {
        const j = await DJ.drive.downloadJSON(kf.id).catch(() => ({}));
        if (j.fp !== me.fp) {
          if (quiet || !confirm('Another computer is set up to receive your phone entries. Make this computer the one that receives them?')) { syncSet({ otherPc: j.fp || '?' }); return 0; }
          await DJ.drive.uploadJSON('pc-key.json', { v: 1, pub: me.pub, fp: me.fp, createdAt: Date.now() }, { id: kf.id });
        }
        syncSet({ pcKeyFile: kf.id, otherPc: '' });
      }
      // Phones that asked to connect
      const phones = { ...(syncGet().phones || {}) };
      for (const f of files.filter((x) => /^phone-.+\.json$/.test(x.name))) {
        const id = f.name.slice(6, -5);
        if (phones[id] && phones[id].file === f.id) continue;
        const j = await DJ.drive.downloadJSON(f.id).catch(() => null);
        if (!j || !j.pub) continue;
        const fp = await DJ.keys.fingerprint(j.pub);
        phones[id] = { id, file: f.id, fp, pub: j.pub, name: j.name || 'Android phone', approved: !!(phones[id] && phones[id].approved && phones[id].fp === fp), addedAt: j.createdAt || Date.now() };
      }
      for (const id of Object.keys(phones)) if (!files.some((f) => f.name === `phone-${id}.json`)) delete phones[id];
      // Approved phones get the names list whenever it changes
      const names = namesPayload(), hash = await sha(JSON.stringify(names));
      for (const ph of Object.values(phones).filter((p) => p.approved)) {
        const nf = byName(`names-${ph.id}.djx`);
        if (nf && ph.namesHash === hash) continue;
        const blob = await DJ.sealJSON(await DJ.keys.importPub(ph.pub), { ...names, pcFp: me.fp, sentAt: Date.now() });
        await DJ.drive.upload(`names-${ph.id}.djx`, blob, { id: nf ? nf.id : '' });
        ph.namesHash = hash;
      }
      syncSet({ phones });
      // Entries waiting in the inbox, oldest first
      sync.failed = [];
      for (const f of files.filter((x) => /^inbox-.+\.djx$/.test(x.name))) {
        try { await importInbox(f, me.priv); got++; } catch (e) { if (e.auth) throw e; sync.failed.push(f.id); }
      }
      syncSet({ lastCheck: Date.now() });
      if (got) {
        await loadAll();
        toast(`${plural(got, 'entry', 'entries')} arrived from your phone`, 4000);
        if (!editor.open && !pe.on) route();
      } else if (!quiet) toast(sync.failed.length ? 'An entry from your phone couldn’t be opened. See Settings → Phone app.' : 'No new entries from your phone');
    } catch (e) {
      if (!quiet) toast(e.auth ? 'Google sign-in has expired. Choose Connect Google Drive.' : 'Google Drive couldn’t be reached. Check the internet connection and try again.', 4500);
    } finally {
      sync.busy = false; refreshSyncUI();
      if (!got && syncSig() !== sig0 && !editor.open && !pe.on && /^(#\/?(home|settings.*)?)?$/.test(location.hash)) route();
    }
    return got;
  }
  function startSyncTimer() {
    clearInterval(sync.timer);
    sync.timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (DJ.drive.token()) syncCheck(); else { clearInterval(sync.timer); refreshSyncUI(); if (location.hash.replace(/^#\/?/, '') === '' || /^#\/home/.test(location.hash)) route(); }
    }, 120000);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && syncSetUp() && DJ.drive.token()) syncCheck(); });
  function refreshSyncUI() {
    const st = $('#syncStatus'); if (!st) return;
    const s = syncGet();
    st.textContent = sync.busy ? 'Checking…' : s.lastCheck ? `Last checked ${new Date(s.lastCheck).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : '';
    const btn = $('[data-action="phone-check"]'); if (btn) btn.disabled = sync.busy;
  }
  function syncBannerHTML() {
    if (!syncReady()) return '';
    const s = syncGet();
    const pending = Object.values(s.phones || {}).filter((p) => !p.approved);
    const needDrive = (s.pub && settings.autoCheckPhone !== false) || (settings.backupToDrive && autoBackupDue());
    let out = '';
    if (needDrive && !DJ.drive.token()) out += `<div class="note sync-note"><p>📱 ${s.pub ? 'Connect to Google Drive to get new entries from your phone.' : 'Connect to Google Drive for your automatic backup.'}</p><div class="row-tight"><button class="btn btn-primary" data-action="g-connect">Connect Google Drive</button></div></div>`;
    if (pending.length && DJ.drive.token()) out += `<div class="note sync-note"><p>📱 A phone wants to connect to your journal.</p><div class="row-tight"><a class="btn btn-primary" href="#/settings/phone">Review</a></div></div>`;
    return out;
  }
  function phonePanelHTML() {
    if (!DJ.drive.available()) {
      return `<section class="panel" id="phone"><h2>Phone app &amp; Google Drive</h2>
        <p>The phone app and Google Drive backups work when the journal is opened from its web address (https://…), not from a file on this computer. Your entries move over with a backup file.</p>
        <p style="margin-top:8px"><a class="btn btn-primary" href="#/help/phone-setup">📘 Show me how, step by step</a></p></section>`;
    }
    const s = syncGet(), cid = DJ.drive.cid(), token = DJ.drive.token();
    const phones = Object.values(s.phones || {});
    return `<section class="panel" id="phone"><h2>Phone app &amp; Google Drive</h2>
      <p>The phone app only adds entries. It keeps nothing: each entry is locked so that only this computer can open it, sent through a hidden folder in your Google Drive, and arrives here the next time the journal is open.</p>
      <p style="margin-top:8px"><a class="link" href="#/help/phone-setup">📘 Step-by-step tutorial with pictures</a></p>
      <div class="sync-step"><span class="step-n">1</span><div>
        <label class="field"><span>Google client ID</span><input id="gCid" class="text-input wide mono" value="${esc(cid)}" placeholder="1234567890-abc….apps.googleusercontent.com" autocomplete="off" spellcheck="false"></label>
        <div class="row-tight"><button class="btn btn-line" data-action="save-cid">Save</button><span class="muted">From Google Cloud. SETUP.md shows where to find it.</span></div>
      </div></div>
      ${cid ? `<div class="sync-step"><span class="step-n">2</span><div>
        ${token ? `<p>Connected to Google Drive${DJ.drive.email() ? ` as <b>${esc(DJ.drive.email())}</b>` : ''}.</p><div class="row-tight"><button class="btn btn-ghost" data-action="g-disconnect">Disconnect</button></div>`
          : `<p>Connect this computer to your Google Drive.</p><div class="row-tight"><button class="btn btn-primary" data-action="g-connect">Connect Google Drive</button></div>`}
      </div></div>` : ''}
      ${cid && s.pub ? `<div class="sync-step"><span class="step-n">3</span><div class="phone-link">
        <div class="qr" id="phoneQR" aria-label="QR code for the phone app"></div>
        <div><p><b>Open the phone app.</b> Scan this code with your Android phone’s camera, or open the link on your phone:</p>
          <p class="mono link-line">${esc(phoneLink())}</p>
          <div class="row-tight"><button class="btn btn-line" data-action="copy-phone-link">Copy link</button></div>
          <p style="margin-top:8px">This computer’s code: <b class="code">${esc(s.fp)}</b></p></div>
      </div></div>` : ''}
      ${s.otherPc ? `<p class="warn">Another computer (code ${esc(s.otherPc)}) is set up to receive phone entries. <button class="linkbtn" data-action="phone-check-loud">Make this computer the one</button></p>` : ''}
      ${phones.length ? `<div class="phones">${phones.map((p) => p.approved
        ? `<div class="phone-row"><span>📱 <b>${esc(p.name)}</b> · code ${esc(p.fp)} · connected</span><button class="btn btn-ghost" data-action="phone-remove" data-id="${esc(p.id)}">Disconnect</button></div>`
        : `<div class="phone-row pending"><span>📱 <b>New phone</b> wants to connect · code <b class="code">${esc(p.fp)}</b><br><small>Check that your phone shows the same code.</small></span><span class="row-tight"><button class="btn btn-primary" data-action="phone-allow" data-id="${esc(p.id)}">Allow</button><button class="btn btn-ghost" data-action="phone-remove" data-id="${esc(p.id)}">Ignore</button></span></div>`).join('')}</div>` : ''}
      ${sync.failed.length ? `<p class="warn">${plural(sync.failed.length, 'entry', 'entries')} from your phone couldn’t be opened (probably sent before this computer was set up again). <button class="linkbtn" data-action="clear-bad-inbox">Delete ${sync.failed.length === 1 ? 'it' : 'them'}</button></p>` : ''}
      ${cid && token ? `<div class="row" style="margin-top:12px"><button class="btn btn-line" data-action="phone-check">Check for phone entries now</button><span class="muted" id="syncStatus"></span></div>` : ''}
      ${cid ? `<div class="look" style="margin-top:12px"><div class="look-row"><b>Get phone entries when the journal opens</b>${segHTML('autoCheckPhone', 'Check when the journal opens', [[true, 'On'], [false, 'Off']])}</div></div>` : ''}
    </section>`;
  }
  let qrLib = null;
  async function drawPhoneQR() {
    const el = $('#phoneQR'); if (!el) return;
    if (!qrLib) qrLib = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'lib/qrcode.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
    try {
      await qrLib;
      const q = window.qrcode(0, 'M'); q.addData(phoneLink()); q.make();
      el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    } catch (_) { el.hidden = true; }
  }
  async function syncAfterOpen(back) {
    if (back && back.ok && !back.silent) toast('Connected to Google Drive', 3000);
    if (back && back.error && !back.silent && back.error !== 'access_denied') toast(back.error === 'scope' ? 'Google Drive access wasn’t allowed. Choose Connect again and tick every box.' : 'Google sign-in didn’t finish. Try again.', 5000);
    if (syncReady() && DJ.drive.token()) {
      if (syncGet().pub || (back && back.ok)) { await syncCheck({ quiet: !(back && back.ok && !back.silent) }); startSyncTimer(); }
    }
    await dirPermission(false).catch(() => {});
    runAutoBackup();
    setInterval(() => runAutoBackup(), 3600000);
  }

  // ---------- Automatic backup ----------
  // Small key-value store for the chosen backup folder (a folder handle can't go in localStorage)
  const kv = (() => {
    let p;
    const open = () => p || (p = new Promise((res, rej) => { const r = indexedDB.open('digital-journal-kv', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
    const run = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('kv', mode); const rq = fn(t.objectStore('kv')); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }); };
    return { get: (k) => run('readonly', (s) => s.get(k)), set: (k, v) => run('readwrite', (s) => s.put(v, k)), del: (k) => run('readwrite', (s) => s.delete(k)) };
  })();
  const bk = { running: false, dir: undefined, perm: '' };
  const folderSupported = () => 'showDirectoryPicker' in window;
  async function backupDir() { if (bk.dir === undefined) bk.dir = (await kv.get('backupDir').catch(() => null)) || null; return bk.dir; }
  async function dirPermission(ask = false) {
    const d = await backupDir(); if (!d) { bk.perm = 'none'; return 'none'; }
    let p = await d.queryPermission({ mode: 'readwrite' });
    if (p !== 'granted' && ask) p = await d.requestPermission({ mode: 'readwrite' });
    bk.perm = p; return p;
  }
  async function chooseBackupDir() {
    if (!folderSupported()) { toast('This browser can’t save backups to a folder by itself. Use Chrome or Edge, or Google Drive.', 5000); return; }
    try {
      const d = await window.showDirectoryPicker({ id: 'journal-backups', mode: 'readwrite', startIn: 'documents' });
      await kv.set('backupDir', d); bk.dir = d; bk.perm = 'granted';
      saveSettings({ backupToFolder: true, backupDirName: d.name });
      toast(`Backups will be saved in “${d.name}”`);
      route();
    } catch (e) { if (e.name !== 'AbortError') toast('That folder couldn’t be used. Pick another one.', 4000); }
  }
  const autoBackupDue = () => settings.autoBackup > 0 && entries.length > 0 && Date.now() - (settings.lastAutoBackup || 0) > settings.autoBackup * 86400000 - 3600000;
  const BACKUP_NAME = /^journal-backup-\d{4}-\d{2}-\d{2}\.json$/;
  async function runAutoBackup({ now = false } = {}) {
    if (bk.running || (lockOn() && !CRYPT.key)) return;
    if (!now && !autoBackupDue()) return;
    if (!settings.backupToFolder && !settings.backupToDrive) { if (now) toast('Choose where backups go first: a folder, Google Drive, or both.', 4000); return; }
    const toFolder = settings.backupToFolder && !!(await backupDir()) && (await dirPermission(now)) === 'granted';
    const toDrive = settings.backupToDrive && syncReady() && !!DJ.drive.token();
    if (!toFolder && !toDrive) { if (now) toast(settings.backupToDrive && !DJ.drive.token() ? 'Connect Google Drive first.' : 'Allow the journal to use the backup folder first.', 4000); return; }
    bk.running = true;
    const where = [];
    try {
      if (now) toast('Backing up…', 60000);
      const { blob } = await makeBackup();
      const name = `journal-backup-${D.today()}.json`, keep = settings.backupKeep || 5;
      if (toFolder) {
        try {
          const d = await backupDir();
          const fh = await d.getFileHandle(name, { create: true });
          const w = await fh.createWritable(); await w.write(blob); await w.close();
          const old = [];
          for await (const [n, h] of d.entries()) if (h.kind === 'file' && BACKUP_NAME.test(n)) old.push(n);
          old.sort().reverse().slice(keep).forEach((n) => d.removeEntry(n).catch(() => {}));
          where.push(`“${d.name}”`);
        } catch (_) { /* reported below */ }
      }
      if (toDrive) {
        try {
          const folder = await DJ.drive.folder('Digital Journal backups');
          const list = await DJ.drive.list({ q: `'${folder}' in parents`, space: 'drive' });
          const same = list.find((f) => f.name === name);
          await DJ.drive.upload(name, blob, { parents: [folder], id: same ? same.id : '', type: 'application/json' });
          const olds = list.filter((f) => BACKUP_NAME.test(f.name) && f.name !== name).map((f) => f.name).sort().reverse();
          for (const n of olds.slice(Math.max(0, keep - 1))) { const f = list.find((x) => x.name === n); if (f) await DJ.drive.del(f.id); }
          where.push('Google Drive');
        } catch (_) { /* reported below */ }
      }
      if (where.length) {
        saveSettings({ lastAutoBackup: Date.now(), lastBackup: Date.now(), backupSnooze: 0, lastAutoInfo: { at: Date.now(), size: blob.size, where } });
        toast(`Backed up to ${where.join(' and ')}`, 3500);
      } else toast('The automatic backup couldn’t be saved. It will try again later.', 4500);
    } catch (_) { toast('The automatic backup couldn’t be made. It will try again later.', 4500); } finally {
      bk.running = false;
      if (/^#\/settings/.test(location.hash) && !editor.open) route();
    }
  }
  function backupFolderNoteHTML() {
    if (!settings.backupToFolder || !autoBackupDue() || !bk.dir || bk.perm === 'granted') return '';
    return `<div class="note sync-note"><p>💾 Your automatic backup is due. Allow the journal to save it in “${esc(bk.dir.name)}”.</p><div class="row-tight"><button class="btn btn-primary" data-action="allow-backup-folder">Allow and back up</button></div></div>`;
  }
  function autoBackupHTML() {
    const info = settings.lastAutoInfo, dirName = bk.dir ? bk.dir.name : settings.backupDirName;
    return `<div class="auto-backup">
      <h3>Automatic backup</h3>
      <p>The journal saves a backup file by itself while it’s open. Pick how often and where. <a class="link" href="#/help/backup">How it works</a></p>
      <div class="look">
        <div class="look-row"><b>How often</b>${segHTML('autoBackup', 'Automatic backup', [[0, 'Off'], [1, 'Every day'], [3, 'Every 3 days'], [7, 'Every week']])}</div>
        <div class="look-row"><b>Where</b><div class="bk-where">
          <label class="check"><input type="checkbox" id="bkFolder"${settings.backupToFolder ? ' checked' : ''}${folderSupported() ? '' : ' disabled'}> A folder on this computer${dirName ? `: <b>${esc(dirName)}</b>` : ''}</label>
          ${folderSupported() ? `<button class="btn btn-line" data-action="choose-backup-folder">${dirName ? 'Change folder' : 'Choose folder'}</button>` : '<span class="muted">Needs Chrome or Edge on a computer.</span>'}
          <label class="check"><input type="checkbox" id="bkDrive"${settings.backupToDrive ? ' checked' : ''}${syncReady() ? '' : ' disabled'}> Google Drive, in a folder called “Digital Journal backups”</label>
          ${syncReady() ? '' : '<span class="muted">Set up Google Drive in “Phone app &amp; Google Drive” first.</span>'}
        </div></div>
        <div class="look-row"><b>Keep</b>${segHTML('backupKeep', 'Backups to keep', [[3, 'Last 3'], [5, 'Last 5'], [10, 'Last 10'], [30, 'Last 30']])}</div>
      </div>
      <p class="muted" style="margin-top:10px">Tip: choose a folder inside Google Drive or OneDrive on this computer and the backup goes to the cloud too. Older backups beyond the number you keep are deleted.</p>
      <div class="row"><button class="btn btn-line" data-action="backup-now">Back up now</button>
        <span class="muted">${info ? `Last automatic backup: ${esc(new Date(info.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}, ${(info.size / 1048576).toFixed(1)} MB, to ${esc(info.where.join(' and '))}` : 'No automatic backup yet.'}</span></div>
    </div>`;
  }

  // ---------- Photos & storage ----------
  function photosPanelHTML() {
    return `<section class="panel" id="photos"><h2>Photos &amp; storage</h2>
      <p>New photos are made smaller to save space while staying sharp: they’re resized carefully, saved as WebP where the browser can (smaller than JPEG for the same look), and simple photos are squeezed more than detailed ones. A photo is never saved bigger than the file you picked.</p>
      <div class="look"><div class="look-row"><b>Photo quality</b>${segHTML('photoQuality', 'Photo quality', [['best', 'Best quality'], ['balanced', 'Balanced'], ['small', 'Smallest']])}</div></div>
      <p class="muted" style="margin-top:8px">Best: up to 3200 px wide, for big screens and prints. Balanced (recommended): up to 2560 px, sharp on any phone or computer. Smallest: up to 1920 px, the least space.</p>
      <div class="row" style="margin-top:12px"><button class="btn btn-line" data-action="shrink-photos">Shrink photos already in the journal</button><span class="muted" id="usage2"></span></div>
      <p class="muted" style="margin-top:6px">Re-saves existing photos with the setting above. A photo only changes if it gets at least 15% smaller. Make a backup first.</p>
    </section>`;
  }
  async function shrinkPhotos() {
    const P = DJ.PROFILES[settings.photoQuality] || DJ.PROFILES.balanced;
    if (!confirm(`Re-save the photos already in your journal with “${P.name}”? A photo only changes if it gets at least 15% smaller. This can take a few minutes. Make a backup first if you haven’t.`)) return;
    const ids = await DB.keys('photos');
    let done = 0, changed = 0, saved = 0;
    for (const id of ids) {
      done++;
      const r = await DB.getPhoto(id).catch(() => null);
      if (r && r.blob && !r.png && !r.kind && r.entryId !== '__draft__') {
        try {
          const n = await DJ.recompress(r, settings.photoQuality || 'balanced');
          if (n) { await DB.putPhoto({ ...r, blob: n.blob, md: n.md, thumb: n.thumb, w: n.w, h: n.h }); forgetPhoto(id); changed++; saved += n.before - n.after; }
        } catch (_) { /* leave this one as it is */ }
      }
      if (done % 3 === 0 || done === ids.length) toast(`Shrinking photos… ${done} of ${ids.length}`, 60000);
    }
    toast(changed ? `Done. ${plural(changed, 'photo')} got smaller, saving ${(saved / 1048576).toFixed(1)} MB.` : 'Your photos are already about as small as this setting makes them.', 6000);
    route();
  }

  // ---------- Tutorials ----------
  // Step-by-step guides with pictures. Screenshots are of this journal; the drawings for
  // GitHub and Google are simplified, so the real pages may look a little different.
  const TUTS = [
    { id: 'start', icon: '📝', title: 'Write your first entry', sub: 'Photos, words, mood and more, in a minute', steps: [
      ['Start a new entry', 'Click <b>New entry</b> in the sidebar, or press <kbd>N</kbd> anywhere. On a phone-sized window, use the round <b>+</b> button.', 'home.webp', 'The Home page with the New entry button'],
      ['Add photos, a mood and a title', 'Click <b>Add photos</b>, or drop or paste photos into the window. The first photo is the cover; tap the star on another photo to make it the cover. If a photo has a date or a location saved in it, the entry takes them automatically. Pick a mood, add a title, and choose a title font if you like.', 'editor.webp', 'The New entry window with photos, a mood and a title'],
      ['Add the rest (all optional)', 'Write as much or as little as you like. You can also record a <b>voice note</b>, add a <b>video</b>, set a <b>song of the day</b>, and choose <b>who was there</b>, <b>tags</b>, the <b>place</b> and an <b>entry color</b>. Click <b>Save</b>. If you close the window by accident, your draft is kept.', 'editor2.webp', 'More fields: voice notes, video, song, people, tags and place'],
      ['Your journal page', 'Every entry becomes a page. Under it: <b>Edit entry</b> changes the words and photos, <b>Edit page</b> decorates the page, <b>Share as image</b> saves the page as a picture, <b>Favorite</b> stars it, and <b>Pin to Home</b> keeps it on your Home page.', 'entry.webp', 'A saved journal page'],
    ] },
    { id: 'find', icon: '🔎', title: 'Find and look back', sub: 'Filters, calendar, recaps and Book mode', steps: [
      ['Search and filter', 'On <a href="#/journal">Journal</a>, type in the search box, or click <b>Filters</b> to show only certain tags, moods, people, a place, favorites, entries with photos, or a date range. Switch between Story, small, medium and large tiles with the view buttons.', 'journal.webp', 'The Journal page with filters open'],
      ['Calendar', 'The <a href="#/calendar">Calendar</a> shows a little photo on each day you wrote. Switch to <b>Moods</b> to color each day by its mood. Click a day to open it.', 'calendar.webp', 'The calendar with photo thumbnails'],
      ['Recaps', 'In <a href="#/recap">Recaps</a>, choose <b>Week</b>, <b>Month</b> or <b>Year</b>. You see your numbers, moods, favorites, photos and entries. The year recap has <b>Play your year in review</b>, which you can also save as a video.', 'recap.webp', 'A month recap'],
      ['Read it like a book', 'On Journal, click <b>📖 Book</b>. Turn pages with the arrow buttons, the arrow keys, or by swiping. Click <b>Open</b> on a page to go to that entry.', 'book.webp', 'Book mode with two pages side by side'],
    ] },
    { id: 'page', icon: '🎨', title: 'Decorate a journal page', sub: 'Stickers, tape, drawing, backgrounds and layouts', steps: [
      ['Open Edit page', 'Open an entry and click <b>Edit page</b>. The tools panel opens at the bottom. Drag anything on the page to move it, use the round corner handle to resize it, and the top handle to turn it. Add <b>stickers</b>, <b>washi tape</b>, <b>notes</b>, more <b>photos</b> or your own <b>PNG</b> images from the tabs.', 'pe-stickers.webp', 'Edit page with the stickers tab open'],
      ['Frames, filters and crop', 'Click a photo on the page. Choose a frame (none, print, polaroid), a <b>filter</b> (Film, B&amp;W, Warm and more), and a <b>crop</b> (square, 4:5, 3:2, 16:9 or circle). Use Zoom and the two sliders to choose which part of the photo shows.', 'pe-photo.webp', 'A selected photo with filter and crop controls'],
      ['Draw', 'Open the <b>Draw</b> tab and draw with your mouse, finger or pen. Pick pen, highlighter or eraser, a color and a size. Each line can be moved and resized later from another tab.', 'pe-draw.webp', 'Drawing a red line on the page'],
      ['Backgrounds', 'Open <b>Background</b> and pick kraft paper, graph paper, dots, notebook, watercolor, blush, linen, corkboard, chalkboard or night sky. Each page can have its own.', 'pe-bg.webp', 'The background choices'],
      ['Layouts, undo and save', 'Open <b>Layouts</b> to arrange all the photos at once: Scrapbook, Polaroid wall, Big photo + small ones, Collage grid or Neat rows. Changed your mind? Click <b>↶</b> (or press Ctrl+Z). Click <b>Done</b> to save, or <b>Cancel</b> to leave the page as it was.', 'pe-layouts.webp', 'The layouts tab'],
    ] },
    { id: 'phone-setup', icon: '📱', title: 'Set up the phone app', sub: 'Put the journal online with GitHub, connect Google Drive, pair your Android phone', badge: 'About 30 minutes, once', steps: [
      ['Make a free GitHub account', 'Go to <b>github.com/signup</b> and create a free account. The username you choose becomes part of your journal’s address, for example <code>shahnewaz</code> → <code>https://shahnewaz.github.io/journal/</code>. Use your own username in the steps below.', '', ''],
      ['Create a repository', 'Click <b>+</b> at the top right → <b>New repository</b>. Name it <code>journal</code> and choose <b>Public</b> (free accounts can only publish public ones). Only the app’s code becomes public. Your entries and photos never leave your computer. Click <b>Create repository</b>.', 'github-repo.svg', 'Drawing: creating a public repository called journal'],
      ['Upload the app', 'On the new, empty repository, click <b>uploading an existing file</b>. Open your <code>web-app</code> folder in File Explorer, press <kbd>Ctrl</kbd>+<kbd>A</kbd> to select everything <i>inside</i> it (not the folder itself), and drag it onto the page. Wait until every file has finished, then click <b>Commit changes</b>. Never put backup files inside the <code>web-app</code> folder, because everything in it becomes public.', 'github-upload.svg', 'Drawing: dragging the app files onto GitHub'],
      ['Turn on GitHub Pages', 'Open the repository’s <b>Settings</b> tab → <b>Pages</b> (left side). Under <b>Build and deployment</b>, set Source to <b>Deploy from a branch</b>, Branch to <b>main</b> and <b>/ (root)</b>, then <b>Save</b>. After a minute or two, refresh: it says <b>Your site is live at https://shahnewaz.github.io/journal/</b>. To update the app later, go to the repository → <b>Add file → Upload files</b>, drag in the new files, and click <b>Commit changes</b>.', 'github-pages.svg', 'Drawing: turning on GitHub Pages'],
      ['Move your entries over', 'The version on your D: drive and the web version keep separate journals. In the D: version: <b>Settings → Backup → Export backup</b>. Then open your new address (for example <code>https://shahnewaz.github.io/journal/</code>) and choose <b>Settings → Backup → Import backup</b>. If you use a passcode, type it, then set it again in the web version.', 'backup-panel.webp', 'The Backup section with Export backup and Import backup'],
      ['Install it on your computer', 'In Chrome, click the install icon at the right of the address bar (or ⋮ → Cast, save and share → Install page as app). In Edge: ⋯ → Apps → Install this site as an app. From now on, open the journal from that icon.', 'install-app.svg', 'Drawing: the install button in the browser'],
      ['Create a Google Cloud project', 'Go to <b>console.cloud.google.com</b> and sign in. Click the project picker at the top → <b>New project</b>, name it <code>Digital Journal</code> → <b>Create</b>, and make sure it’s selected. Then search for <b>Google Drive API</b> and click <b>Enable</b>.', 'gcloud-project.svg', 'Drawing: new project and enabling the Google Drive API'],
      ['Set up Google sign-in', 'Search for <b>Google Auth Platform</b> and click <b>Get started</b>: app name <code>Digital Journal</code>, your email, audience <b>External</b>, contact email, agree, <b>Create</b>. Then open <b>Audience → Test users → Add users</b> and add your own Gmail address. Leave the app in <b>Testing</b>.', 'gcloud-auth.svg', 'Drawing: Google Auth Platform and adding a test user'],
      ['Allow Google Drive access', 'Open <b>Data Access → Add or remove scopes</b>. Tick <code>drive.appdata</code>, <code>drive.file</code>, <code>openid</code> and <code>userinfo.email</code> (use the filter box), then <b>Update</b> and <b>Save</b>. These only let the journal use its own hidden folder and the files it makes, nothing else in your Drive.', 'gcloud-scopes.svg', 'Drawing: the four permissions to tick'],
      ['Create the client and copy its ID', 'Open <b>Clients → Create client</b>. Type: <b>Web application</b>. Under <b>Authorized JavaScript origins</b> add <code>https://shahnewaz.github.io</code> (just the start, no slash at the end). Under <b>Authorized redirect URIs</b> add both <code>https://shahnewaz.github.io/journal/</code> and <code>https://shahnewaz.github.io/journal/phone/</code> (with the slash at the end). Click <b>Create</b> and copy the <b>Client ID</b>. Changes can take a few minutes to start working.', 'gcloud-client.svg', 'Drawing: the client form with origins and redirect addresses'],
      ['Paste the client ID in the journal', 'In the web journal, open <a href="#/settings/phone">Settings → Phone app &amp; Google Drive</a>, paste the Client ID and click <b>Save</b>. Then click <b>Connect Google Drive</b>.', 'phone-panel-empty.webp', 'The Phone app & Google Drive section with the client ID box'],
      ['Say yes on Google’s page', 'Pick your Google account. Google says <b>“Google hasn’t verified this app”</b>. That’s expected, because it’s your own private app: click <b>Continue</b> (or <b>Advanced → Go to Digital Journal</b>). Allow the Google Drive access it asks for.', 'google-unverified.svg', 'Drawing: Google’s unverified app screen'],
      ['Connected: a code for your phone', 'Back in the journal it says <b>Connected</b> and shows a QR code, a link and <b>this computer’s code</b>.', 'phone-panel-connected.webp', 'Connected, with a QR code for the phone'],
      ['Scan the code with your phone', 'On your Android phone, open the <b>Camera</b> (or Google Lens), point it at the QR code and tap the link. It opens in Chrome. You can also copy the link and send it to yourself.', 'phone-camera.svg', 'Drawing: scanning the QR code with the phone camera'],
      ['Connect the phone', 'On the phone, tap <b>Connect Google Drive</b>. Pick the same Google account and allow access the same way as on the computer.', 'p-connect.webp', 'The phone app’s first screen'],
      ['Check the codes', 'The phone shows <b>this phone’s code</b> and <b>your PC’s code</b>. Your PC’s code should match the code on your computer screen.', 'p-pair.webp', 'The phone showing both codes'],
      ['Allow the phone on your computer', 'On the computer, click <b>Check for phone entries now</b>. A <b>New phone</b> appears with a code. If it matches the phone’s code, click <b>Allow</b>.', 'pc-pending.webp', 'A new phone waiting to be allowed'],
      ['Done: put it on your home screen', 'In a few seconds the phone shows <b>Quick entry</b> and <b>New entry</b>. Tap <b>Add to home screen</b> (or Chrome’s ⋮ → Add to home screen → Install) and open it from that icon from now on.', 'p-home.webp', 'The phone app ready to use'],
    ] },
    { id: 'phone-use', icon: '✍️', title: 'Add entries from your phone', sub: 'Quick entry, New entry, and how they reach the PC', steps: [
      ['Quick entry', 'Tap <b>Quick entry</b>. Take or pick one photo, write a line, pick a mood, and tap <b>Save and send</b>.', 'p-quick.webp', 'Quick entry on the phone'],
      ['New entry', 'Tap <b>New entry</b> for the full version: date, favorite, several photos, a title and as much text as you like. The date and place are taken from your photo when it has them.', 'p-new.webp', 'New entry with photos and a title'],
      ['Tags, people and places', 'Tap the tags and people you added on your PC, or add new ones. Pick a place from the list, or add a new one.', 'p-new2.webp', 'Tags, people and place on the phone'],
      ['A new place', 'Type the name. Use where the photo was taken, or tap <b>Use where I am now</b>. You can add voice notes, videos and a song too.', 'p-place.webp', 'Adding a new place'],
      ['No internet? It waits', 'If there’s no internet, the entry waits on the phone and sends by itself when you’re back online. If Google needs you to sign in again, tap <b>Send now</b>.', 'p-waiting.webp', 'An entry waiting to send'],
      ['Sent', 'Once sent, nothing is left on the phone. It arrives in your journal the next time it’s open on your PC, and within a couple of minutes while it’s open.', 'p-sent.webp', 'Everything has been sent'],
      ['If the PC asks you to connect', 'Google’s sign-in pass lasts about an hour. The journal renews it by itself when it opens; if it can’t, the Home page shows <b>Connect Google Drive</b>. One click and your phone entries come in.', 'home-banner.webp', 'The Connect Google Drive note on Home'],
      ['Phone settings', 'Tap ⚙︎ on the phone to choose photo quality, update the names from your PC, add the app to your home screen, or disconnect the phone.', 'p-settings.webp', 'The phone app’s settings'],
    ] },
    { id: 'backup', icon: '💾', title: 'Automatic backup', sub: 'Choose how often and where your backups go', steps: [
      ['Find it', 'Open <a href="#/settings/backup">Settings → Backup</a>. <b>Export backup</b> saves a backup file right now; <b>Import backup</b> brings one back.', 'backup-panel.webp', 'The Backup section'],
      ['Choose how often and where', 'Under <b>Automatic backup</b>, pick every day, every 3 days or every week. Tick <b>A folder on this computer</b> and click <b>Choose folder</b>, and/or tick <b>Google Drive</b> (it needs Google Drive connected). Pick how many backups to keep; older ones are deleted. A folder inside Google Drive or OneDrive on your computer also puts a copy in the cloud.', 'auto-backup.webp', 'Automatic backup settings'],
      ['When it asks', 'Backups run while the journal is open. When Chrome asks to let the journal save to the folder, choose <b>Allow</b> (or <b>Allow on every visit</b>). If it forgets after a restart, the Home page shows a one-click button.', 'home-banner.webp', 'A note on the Home page'],
    ] },
    { id: 'photos', icon: '🖼️', title: 'Photo quality and space', sub: 'Keep photos sharp while using less space', steps: [
      ['Choose a photo quality', 'Open <a href="#/settings/photos">Settings → Photos &amp; storage</a>. <b>Balanced</b> is right for most people: sharp on any screen, about half the space of earlier versions in tests. <b>Best quality</b> keeps bigger photos for large screens and prints. <b>Smallest</b> saves the most space. The phone app has the same choice in its settings. To save space on older photos, click <b>Shrink photos already in the journal</b> (make a backup first).', 'photos-panel.webp', 'Photos & storage settings'],
    ] },
    { id: 'privacy', icon: '🔒', title: 'Passcode and lock', sub: 'Lock and encrypt your journal', steps: [
      ['Make a backup, then set a passcode', 'Open <a href="#/settings/security">Settings → Privacy &amp; security</a>. Export a backup first. If you forget the passcode, only a backup can bring your journal back.', 'security-panel.webp', 'Privacy & security settings'],
      ['Choose your passcode', 'Use at least 4 characters. Tick the box to confirm you understand, then click <b>Save</b>. Everything is encrypted on this computer, including what comes from your phone.', 'pass-dialog.webp', 'Setting a passcode'],
      ['Unlock', 'The journal locks itself when you step away (you choose after how long), or click <b>Lock now</b>. Type your passcode to open it.', 'lock.webp', 'The lock screen'],
    ] },
    { id: 'share', icon: '🖨️', title: 'Print, PDF and sharing', sub: 'Make a PDF of a month or year, or share a page', steps: [
      ['Save a month or year as a PDF', 'Open a month or year in <a href="#/recap">Recaps</a> and click <b>Save as PDF</b>. Click <b>Print or save as PDF</b>, then choose <b>Save as PDF</b> in the print window. Each entry gets its own page, after a cover page.', 'print.webp', 'The print view of a month'],
      ['Share one page as a picture', 'Under any entry, click <b>Share as image</b>. On a computer it saves a PNG to your downloads; on a phone it opens the share menu.', 'entry-actions.webp', 'The buttons under an entry'],
    ] },
  ];
  const tutById = (id) => TUTS.find((t) => t.id === id);
  function renderHelp(id) {
    const t = tutById(id);
    if (!t) {
      view.dataset.title = 'Tutorials';
      view.innerHTML = `<div class="page-wide">
        <header class="page-head"><h1>Tutorials</h1></header>
        <p class="tut-lead">Step-by-step guides with pictures. Pick one to start.</p>
        <div class="tut-grid">${TUTS.map((x) => `<a class="tut-card${x.id === 'phone-setup' ? ' featured' : ''}" href="#/help/${x.id}">
          <span class="tut-ic">${x.icon}</span><span class="tut-txt"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small>
          <em>${plural(x.steps.length, 'step')}${x.badge ? ` · ${esc(x.badge)}` : ''}</em></span></a>`).join('')}</div>
      </div>`;
      return;
    }
    const i = TUTS.indexOf(t), next = TUTS[i + 1];
    view.dataset.title = t.title;
    view.innerHTML = `<div class="page tut-page">
      <a class="btn btn-ghost back" href="#/help">${ICON.left}All tutorials</a>
      <header class="tut-head"><span class="tut-ic big">${t.icon}</span><div><h1>${esc(t.title)}</h1><p>${esc(t.sub)}${t.badge ? ` · ${esc(t.badge)}` : ''}</p></div></header>
      ${t.steps.length > 3 ? `<nav class="tut-jump" aria-label="Steps">${t.steps.map((s, k) => `<a href="#step-${k + 1}" data-tut-jump="${k + 1}" title="${esc(s[0])}">${k + 1}</a>`).join('')}</nav>` : ''}
      <ol class="tut-steps">${t.steps.map(([title, text, img, alt], k) => `<li class="tut-step" id="step-${k + 1}">
        <span class="tut-num" aria-hidden="true">${k + 1}</span>
        <div class="tut-body"><h2>${esc(title)}</h2><p>${text}</p>
          ${img ? `<figure class="tut-fig${img.startsWith('p-') ? ' phone' : ''}${img.endsWith('.svg') ? ' drawing' : ''}"><img src="help/${img}" alt="${esc(alt)}" loading="lazy" data-action="tut-zoom" data-src="help/${img}" role="button" tabindex="0"></figure>` : ''}
        </div></li>`).join('')}</ol>
      <div class="tut-end">${next ? `<a class="tut-card" href="#/help/${next.id}"><span class="tut-ic">${next.icon}</span><span class="tut-txt"><small>Next tutorial</small><b>${esc(next.title)}</b></span></a>` : `<a class="btn btn-line" href="#/help">All tutorials</a>`}</div>
    </div>`;
  }
  view.addEventListener('click', (ev) => {
    const j = ev.target.closest('[data-tut-jump]'); if (!j) return;
    ev.preventDefault();
    const el = $('#step-' + j.dataset.tutJump);
    if (el) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  });

  // ---------- Global actions ----------
  document.addEventListener('click', async (ev) => {
    const h = ev.target.closest('[data-hero-act]');
    if (h) {
      ev.preventDefault();
      const a = h.dataset.heroAct;
      if (a === 'next') heroShow(hero.i + 1);
      if (a === 'prev') heroShow(hero.i - 1);
      if (a === 'pause') heroPause(!hero.paused);
      if (a === 'shuffle') heroShuffle();
      return;
    }
    const hs = ev.target.closest('[data-home-shuffle]');
    if (hs) {
      const which = hs.dataset.homeShuffle;
      const sec = which === 'person' ? $('#withPerson') : $('#atPlace');
      if (sec) { sec.innerHTML = which === 'person' ? withPersonHTML(state.homePerson) : atPlaceHTML(state.homePlace); hydrate(sec); }
      return;
    }
    const b = ev.target.closest('[data-action]');
    if (!b) return;
    const act = b.dataset.action;
    if (pe.on && b.closest('.page-editing')) return; // finish or cancel page editing first
    if (act === 'new') openEditor(null, b.dataset.date || (/^#\/day\//.test(location.hash) ? location.hash.split('/')[2] : null));
    if (act === 'edit') openEditor(byId(b.dataset.id));
    if (act === 'edit-page') { const e = byId(b.dataset.id); if (e) startPageEdit(e); }
    if (act === 'delete') { if (await deleteEntry(byId(b.dataset.id))) { if (/^#\/entry\//.test(location.hash)) back(); else route(); } }
    if (act === 'back') back();
    if (act === 'export') exportBackup().catch(() => toast('The backup couldn’t be created.'));
    if (act === 'photo') { const e = byId(b.dataset.entry); if (e) openLb(e.photoIds, Number(b.dataset.index)); }
    if (act === 'mphoto') openLb(state.recapPhotos || [], Number(b.dataset.index));
    if (act === 'add-person') openPerson();
    if (act === 'add-tag') openTag();
    if (act === 'story') openStory(b.dataset.year);
    if (act === 'capsule') openCapsule();
    if (act === 'delete-capsule') {
      const e = capsules.find((x) => x.id === b.dataset.id);
      if (e && confirm('Delete this sealed letter without opening it?')) { await DB.deleteEntry(e); capsules = capsules.filter((x) => x !== e); toast('Letter deleted'); route(); }
    }
    if (act === 'geocode') { toast('Looking up addresses…', 20000); geocodePlaces(); }
    if (act === 'import-photos') openImport();
    if (act === 'edit-tag') openTag(tagById(b.dataset.id));
    if (act === 'filter-tag') { state.filters = { ...emptyFilters(), tags: [b.dataset.id] }; state.showFilters = false; go('#/journal'); }
    if (act === 'fav' || act === 'pin') toggleFlag(b.dataset.id, act === 'fav' ? 'fav' : 'pinned');
    if (act === 'quick') openQuick();
    if (act === 'tut-zoom') { lbState.ids = []; lb.classList.add('single'); $('#lbCount').textContent = ''; $('#lbImg').src = b.dataset.src; lb.showModal(); }
    if (act === 'save-cid') {
      const v = ($('#gCid').value || '').trim();
      if (v && !/\.apps\.googleusercontent\.com$/.test(v)) { toast('That doesn’t look like a Google client ID. It ends with .apps.googleusercontent.com', 5000); return; }
      DJ.drive.setCid(v); toast(v ? 'Saved' : 'Removed'); route();
    }
    if (act === 'g-connect') { if (!DJ.drive.cid()) { go('#/settings/phone'); return; } DJ.drive.signIn({ returnTo: location.hash }); }
    if (act === 'g-disconnect') { if (confirm('Disconnect Google Drive on this computer? Phone entries wait in Drive until you connect again.')) { DJ.drive.signOut(); clearInterval(sync.timer); route(); } }
    if (act === 'phone-check') syncCheck({ quiet: false });
    if (act === 'phone-check-loud') { syncSet({ pcKeyFile: '' }); syncCheck({ quiet: false }).then(() => route()); }
    if (act === 'copy-phone-link') { try { await navigator.clipboard.writeText(phoneLink()); toast('Link copied'); } catch (_) { toast('Select the link and copy it.'); } }
    if (act === 'phone-allow') {
      const ph = (syncGet().phones || {})[b.dataset.id]; if (!ph) return;
      const phones = { ...syncGet().phones, [ph.id]: { ...ph, approved: true, namesHash: '' } };
      syncSet({ phones }); toast('Phone allowed. Sending it your tags, people and places…');
      await syncCheck(); route();
    }
    if (act === 'phone-remove') {
      const ph = (syncGet().phones || {})[b.dataset.id]; if (!ph) return;
      if (ph.approved && !confirm('Disconnect this phone? It won’t be able to send entries until you allow it again.')) return;
      try {
        const files = await DJ.drive.list();
        for (const f of files.filter((x) => x.name === `phone-${ph.id}.json` || x.name === `names-${ph.id}.djx`)) await DJ.drive.del(f.id);
      } catch (_) { toast('Google Drive couldn’t be reached. Try again.'); return; }
      const phones = { ...syncGet().phones }; delete phones[ph.id]; syncSet({ phones }); route();
    }
    if (act === 'clear-bad-inbox') { for (const id of sync.failed) await DJ.drive.del(id).catch(() => {}); sync.failed = []; route(); }
    if (act === 'choose-backup-folder') chooseBackupDir();
    if (act === 'backup-now') runAutoBackup({ now: true });
    if (act === 'allow-backup-folder') { if ((await dirPermission(true)) === 'granted') { await runAutoBackup({ now: true }); route(); } }
    if (act === 'shrink-photos') shrinkPhotos();
    if (act === 'play-audio') { ev.preventDefault(); playAudio(b.dataset.mid, b); }
    if (act === 'play-video') playVideo(b.dataset.mid);
    if (act === 'open-song') { const u = b.dataset.link; if (/^https?:\/\//i.test(u)) window.open(u, '_blank', 'noopener'); }
    if (act === 'share-page') sharePage(b.dataset.id);
    if (act === 'do-print') doPrint();
    if (act === 'lock-now') lockNow();
    if (act === 'set-pass') openPass('set');
    if (act === 'change-pass') openPass('change');
    if (act === 'off-pass') openPass('off');
    if (act === 'snooze-backup') { saveSettings({ backupSnooze: Date.now() + 3 * 86400000 }); route(); }
    if (act === 'edit-person') openPerson(personById(b.dataset.id));
    if (act === 'add-place') openPlace();
    if (act === 'edit-place') openPlace(placeById(b.dataset.id));
    if (act === 'day') {
      const date = b.dataset.date, list = byDate().get(date) || [];
      if (!list.length) openEditor(null, date);
      else if (list.length === 1) go(`#/entry/${list[0].id}`);
      else go(`#/day/${date}`);
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (editor.open || lb.open || personDlg.open || placeDlg.open || passDlg.open || quickDlg.open || tagDlg.open || capsuleDlg.open || importDlg.open || !storyEl.hidden || !lockEl.hidden || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === 'n' && !pe.on) { ev.preventDefault(); openEditor(); }
    if (hero.el && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && hero.el.contains(document.activeElement)) heroShow(hero.i + (ev.key === 'ArrowRight' ? 1 : -1));
  });

  let toastTimer;
  function toast(msg, ms = 2400) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------- Start ----------
  async function loadAll() {
    const [ents, ppl, pls, tgs] = await Promise.all([DB.allEntries(), DB.allPeople(), DB.allPlaces(), DB.allTags()]);
    const today = D.today(), all = ents.map(norm);
    capsules = all.filter((e) => e.capsule && e.capsule > today);   // sealed letters stay out of the journal until they open
    entries = all.filter((e) => !(e.capsule && e.capsule > today)); sortEntries();
    people = ppl; places = pls; tags = tgs;
    avatarURL.forEach((u) => URL.revokeObjectURL(u)); avatarURL.clear();
    people.forEach(setAvatar);
    await seedTags();
  }
  let oauthBack = null, opened = false;
  async function afterUnlock() {
    await loadAll();
    lastActive = Date.now();
    route();
    cleanupDraftPhotos();
    if (!opened) { opened = true; syncAfterOpen(oauthBack); }
  }
  async function start() {
    applySettings();
    if (!window.indexedDB) {
      view.innerHTML = '<div class="page"><div class="empty"><h2>This browser can’t save a journal</h2><p>Open this app in a recent version of Chrome, Edge, Firefox or Safari, and not in a private window.</p></div></div>';
      return;
    }
    if (!settings.firstUse) saveSettings({ firstUse: Date.now() });
    // Coming back from Google sign-in, or a quick silent sign-in so phone entries arrive on open
    oauthBack = DJ.drive.available() ? await DJ.drive.handleRedirect() : null;
    if (oauthBack && oauthBack.error && oauthBack.silent) sessionStorage.setItem('dj-silent-tried', '1');
    if (!oauthBack && syncReady() && !DJ.drive.token() && navigator.onLine && DJ.drive.email() && !sessionStorage.getItem('dj-silent-tried')
      && ((syncGet().pub && settings.autoCheckPhone !== false) || (settings.backupToDrive && settings.autoBackup > 0 && Date.now() - (settings.lastAutoBackup || 0) > settings.autoBackup * 86400000 - 3600000))) {
      sessionStorage.setItem('dj-silent-tried', '1');
      try { DJ.drive.signIn({ silent: true }); return; } catch (_) { /* carry on without */ }
    }
    if (lockOn()) {
      if (!window.crypto || !crypto.subtle) { view.innerHTML = '<div class="page"><div class="empty"><h2>This browser can’t unlock your journal</h2><p>Open it in a recent version of Chrome, Edge, Firefox or Safari.</p></div></div>'; return; }
      showLock();
      return;
    }
    document.documentElement.classList.remove('is-locked');
    try {
      await loadAll();
      cleanupDraftPhotos();
    } catch (err) {
      view.innerHTML = '<div class="page"><div class="empty"><h2>Your journal couldn’t be opened</h2><p>The browser blocked storage for this page. Private windows and some privacy settings do this. If the journal is open in another tab, close that tab. Then reload this page.</p></div></div>';
      return;
    }
    route();
    opened = true; syncAfterOpen(oauthBack);
    // Seasonal theme: re-check once an hour in case the season changes while the app is open
    setInterval(() => { if (settings.theme === 'seasonal' && document.documentElement.dataset.theme !== season()) applySettings(); }, 3600000);
    if (/^https?:/.test(location.protocol) && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  // Exposed for testing in the console
  window.__journal = { DB, get entries() { return entries; }, get people() { return people; }, get places() { return places; }, get tags() { return tags; }, readExif, get locked() { return !CRYPT.key && lockOn(); }, reload: async () => { await loadAll(); route(); } };
  start();
})();

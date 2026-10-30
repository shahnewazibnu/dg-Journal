/* Digital Journal — shared code for the PC journal and the phone app.
   Photos (smart compression), photo date and location (EXIF), video posters,
   encryption between the phone and the PC, and Google Drive. No build step. */
'use strict';
(() => {
  const DJ = window.DJ = {};
  const te = new TextEncoder(), td = new TextDecoder();

  DJ.uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  DJ.b64 = (u8) => {
    u8 = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
  DJ.unb64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64url = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

  // ---------- Photos ----------
  // Each photo is kept in three sizes: full (for the viewer), md (cards, pages) and thumb (calendar).
  // WebP is used where the browser can make it (about a quarter to a third smaller than JPEG at the
  // same look); otherwise JPEG. The full size gets an adaptive quality: busy, detailed photos keep a
  // higher quality floor, simple photos are squeezed further, and a photo is never made bigger
  // than the file you picked.
  const PROFILES = {
    best: { name: 'Best quality', full: 3200, md: 1440, thumb: 640, q: { full: 0.92, md: 0.86, thumb: 0.8 }, bpp: 0.34, floor: 0.84 },
    balanced: { name: 'Balanced', full: 2560, md: 1280, thumb: 600, q: { full: 0.86, md: 0.8, thumb: 0.74 }, bpp: 0.17, floor: 0.74 },
    small: { name: 'Smallest', full: 1920, md: 1080, thumb: 480, q: { full: 0.8, md: 0.74, thumb: 0.68 }, bpp: 0.1, floor: 0.66 },
  };
  DJ.PROFILES = PROFILES;
  let webp = null;
  async function canWebp() {
    if (webp != null) return webp;
    try {
      const c = document.createElement('canvas'); c.width = c.height = 2;
      const b = await new Promise((res) => c.toBlob(res, 'image/webp', 0.8));
      webp = !!b && b.type === 'image/webp';
    } catch (_) { webp = false; }
    return webp;
  }
  DJ.canWebp = canWebp;
  async function decode(blob) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch (_) { /* fall back */ }
    }
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('This photo format could not be opened.')); };
      img.src = url;
    });
  }
  DJ.decode = decode;
  const dims = (src) => [src.naturalWidth || src.videoWidth || src.width, src.naturalHeight || src.videoHeight || src.height];
  // High-quality downscale: halve in steps, then a final smooth pass. This keeps fine detail
  // (hair, text, leaves) crisp instead of shimmering, which also compresses better.
  function resample(src, max, crop = null) {
    let [sw, sh] = dims(src);
    let sx = 0, sy = 0;
    if (crop === 'square') { const side = Math.min(sw, sh); sx = (sw - side) / 2; sy = (sh - side) / 2; sw = sh = side; }
    const s = Math.min(1, max / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * s)), h = Math.max(1, Math.round(sh * s));
    let cur = src, cw = sw, ch = sh, cx = sx, cy = sy;
    while (cw / 2 >= w * 1.05 && ch / 2 >= h * 1.05) {
      const nw = Math.round(cw / 2), nh = Math.round(ch / 2);
      const c = document.createElement('canvas'); c.width = nw; c.height = nh;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh);
      if (cur !== src && cur.width) { cur.width = 0; }
      cur = c; cw = nw; ch = nh; cx = 0; cy = 0;
    }
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const ctx = out.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, cx, cy, cw, ch, 0, 0, w, h);
    if (cur !== src && cur !== out && cur.width) cur.width = 0;
    return { canvas: out, w, h, resized: s < 1 || crop === 'square' };
  }
  const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not process photo.'))), type, q));
  // Encode at the profile quality; for the full size, step the quality down (never below the floor)
  // until the file fits a size budget based on its pixel count.
  async function encodeSmart(canvas, kind, P, limit = 0) {
    const type = (await canWebp()) ? 'image/webp' : 'image/jpeg';
    let q = P.q[kind];
    let blob = await toBlob(canvas, type, q);
    if (kind !== 'full') return blob;
    const budget = P.bpp * canvas.width * canvas.height * (type === 'image/jpeg' ? 1.35 : 1);
    while (blob.size > budget && q - 0.04 >= P.floor) { q = +(q - 0.04).toFixed(2); blob = await toBlob(canvas, type, q); }
    // Never bigger than the original file when the photo wasn't resized
    while (limit && blob.size > limit && q - 0.05 >= 0.5) { q = +(q - 0.05).toFixed(2); blob = await toBlob(canvas, type, q); }
    return blob;
  }
  DJ.processImage = async function processImage(file, profile = 'balanced') {
    const P = PROFILES[profile] || PROFILES.balanced;
    const img = await decode(file);
    try {
      const full = resample(img, P.full);
      const limit = !full.resized && /jpe?g|webp/i.test(file.type || '') ? file.size : 0;
      const blob = await encodeSmart(full.canvas, 'full', P, limit);
      const md = resample(full.canvas, P.md);
      const mdBlob = await encodeSmart(md.canvas, 'md', P);
      const th = resample(md.canvas, P.thumb);
      const thBlob = await encodeSmart(th.canvas, 'thumb', P);
      full.canvas.width = md.canvas.width = th.canvas.width = 0;
      return { id: DJ.uid(), blob, md: mdBlob, thumb: thBlob, w: full.w, h: full.h, addedAt: Date.now() };
    } finally { if (img.close) img.close(); }
  };
  // Make a medium size from an existing full-size photo
  DJ.makeSize = async function makeSize(blob, kind = 'md', profile = 'balanced') {
    const P = PROFILES[profile] || PROFILES.balanced;
    const img = await decode(blob);
    try { const r = resample(img, P[kind]); const out = await encodeSmart(r.canvas, kind, P); r.canvas.width = 0; return out; } finally { if (img.close) img.close(); }
  };
  // Re-compress an existing photo record. Returns the new parts only if they save at least 15%.
  DJ.recompress = async function recompress(rec, profile = 'balanced') {
    const before = (rec.blob ? rec.blob.size : 0) + (rec.md ? rec.md.size : 0) + (rec.thumb ? rec.thumb.size : 0);
    const r = await DJ.processImage(new File([rec.blob], 'photo', { type: rec.blob.type }), profile);
    const after = r.blob.size + r.md.size + r.thumb.size;
    if (after > before * 0.85) return null;
    return { blob: r.blob, md: r.md, thumb: r.thumb, w: r.w, h: r.h, before, after };
  };
  // Simple resize for PNG stickers and other uses (kept for older code paths)
  DJ.shrink = function shrink(src, max, quality, square = false, type = 'image/jpeg') {
    const r = resample(src, max, square ? 'square' : null);
    return toBlob(r.canvas, type, quality).then((blob) => ({ blob, w: r.w, h: r.h }));
  };

  // ---------- Photo date and place (EXIF) ----------
  DJ.readExif = async function readExif(file) {
    try {
      if (!/jpe?g/i.test(file.type) && !/\.jpe?g$/i.test(file.name || '')) return null;
      const buf = await file.slice(0, 256 * 1024).arrayBuffer();
      const v = new DataView(buf);
      if (v.getUint16(0) !== 0xFFD8) return null;
      let off = 2;
      while (off < v.byteLength - 4) {
        const marker = v.getUint16(off), len = v.getUint16(off + 2);
        if (marker === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) return parseTiff(v, off + 10);
        if ((marker & 0xFF00) !== 0xFF00 || marker === 0xFFDA) break;
        off += 2 + len;
      }
    } catch (_) { /* no usable EXIF */ }
    return null;
  };
  function parseTiff(v, t) {
    const le = v.getUint16(t) === 0x4949;
    const u16 = (o) => v.getUint16(t + o, le), u32 = (o) => v.getUint32(t + o, le);
    const ifd = (o) => { const n = u16(o), out = {}; for (let i = 0; i < n; i++) { const e = o + 2 + i * 12; out[u16(e)] = { count: u32(e + 4), at: e + 8 }; } return out; };
    const ascii = (tg) => { const o = tg.count > 4 ? u32(tg.at) : tg.at; let s = ''; for (let i = 0; i < tg.count - 1; i++) s += String.fromCharCode(v.getUint8(t + o + i)); return s; };
    const rats = (tg) => { const o = u32(tg.at), out = []; for (let i = 0; i < tg.count; i++) out.push(u32(o + i * 8) / (u32(o + i * 8 + 4) || 1)); return out; };
    const res = {};
    const i0 = ifd(u32(4));
    let dt = null;
    if (i0[0x8769]) { const ex = ifd(u32(i0[0x8769].at)); if (ex[0x9003]) dt = ascii(ex[0x9003]); else if (ex[0x9004]) dt = ascii(ex[0x9004]); }
    if (!dt && i0[0x0132]) dt = ascii(i0[0x0132]);
    const m = dt && dt.match(/^(\d{4}):(\d{2}):(\d{2})/);
    if (m && m[1] !== '0000') res.date = `${m[1]}-${m[2]}-${m[3]}`;
    if (i0[0x8825]) {
      const g = ifd(u32(i0[0x8825].at));
      if (g[2] && g[4]) {
        const dms = (a) => a[0] + a[1] / 60 + a[2] / 3600;
        let lat = dms(rats(g[2])), lng = dms(rats(g[4]));
        if (g[1] && String.fromCharCode(v.getUint8(t + g[1].at)) === 'S') lat = -lat;
        if (g[3] && String.fromCharCode(v.getUint8(t + g[3].at)) === 'W') lng = -lng;
        if (isFinite(lat) && isFinite(lng) && (lat || lng)) { res.lat = +lat.toFixed(6); res.lng = +lng.toFixed(6); }
      }
    }
    return res;
  }
  DJ.nearPlace = function nearPlace(list, lat, lng, maxM = 300) {
    let best = null, bestD = Infinity;
    for (const p of list) {
      if (p.lat == null || p.lng == null) continue;
      const R = 6371000, dLat = (p.lat - lat) * Math.PI / 180, dLng = (p.lng - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const d = 2 * R * Math.asin(Math.sqrt(a));
      if (d < bestD) { bestD = d; best = p; }
    }
    return bestD <= maxM ? best : null;
  };

  // ---------- Video poster frame ----------
  DJ.videoInfo = async function videoInfo(file) {
    const url = URL.createObjectURL(file);
    try {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(rej, 15000); });
      v.currentTime = Math.min(0.6, (v.duration || 1) / 3);
      await new Promise((res) => { v.onseeked = res; setTimeout(res, 3000); });
      const cw = v.videoWidth || 640, ch = v.videoHeight || 360;
      const r = resample(v, 900);
      const thumb = await toBlob(r.canvas, (await canWebp()) ? 'image/webp' : 'image/jpeg', 0.82);
      return { thumb, w: cw, h: ch, dur: v.duration || 0 };
    } finally { URL.revokeObjectURL(url); }
  };

  // ---------- Encryption between the phone and the PC ----------
  // Each side has an RSA key pair. A sealed file is: [4-byte header length][header JSON][AES-GCM data].
  // The header carries a fresh AES key, locked with the receiver's public key, so only the
  // receiver can open it. The phone can't read back what it sent.
  const RSA = { name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
  DJ.keys = {
    generate: (extractable = false) => crypto.subtle.generateKey(RSA, extractable, ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']),
    exportPub: (key) => crypto.subtle.exportKey('jwk', key),
    exportPriv: (key) => crypto.subtle.exportKey('jwk', key),
    importPub: (jwk) => crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RSA-OAEP-256', ext: true }, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt', 'wrapKey']),
    importPriv: (jwk, extractable = false) => crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, extractable, ['decrypt', 'unwrapKey']),
    // A short code to compare on both screens, so you know the phone is talking to your PC
    async fingerprint(jwk) {
      const h = new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(jwk.n + '.' + jwk.e)));
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let s = ''; for (let i = 0; i < 8; i++) s += A[h[i] % 32];
      return s.slice(0, 4) + '-' + s.slice(4);
    },
  };
  DJ.seal = async function seal(pubKey, bytes) {
    const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrapped = new Uint8Array(await crypto.subtle.wrapKey('raw', aes, pubKey, { name: 'RSA-OAEP' }));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, bytes);
    const head = te.encode(JSON.stringify({ v: 1, k: DJ.b64(wrapped), iv: DJ.b64(iv) }));
    const len = new Uint8Array(4); new DataView(len.buffer).setUint32(0, head.length);
    return new Blob([len, head, ct], { type: 'application/octet-stream' });
  };
  DJ.open = async function open(privKey, blob) {
    const u8 = new Uint8Array(await blob.arrayBuffer());
    const n = new DataView(u8.buffer).getUint32(0);
    const head = JSON.parse(td.decode(u8.subarray(4, 4 + n)));
    const aes = await crypto.subtle.unwrapKey('raw', DJ.unb64(head.k), privKey, { name: 'RSA-OAEP' }, { name: 'AES-GCM' }, false, ['decrypt']);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: DJ.unb64(head.iv) }, aes, u8.subarray(4 + n)));
  };
  // Pack a JSON manifest and files into one byte array, and back
  DJ.pack = async function pack(manifest, blobs = []) {
    const parts = await Promise.all(blobs.map(async (b) => new Uint8Array(await b.arrayBuffer())));
    const m = { ...manifest, _parts: blobs.map((b, i) => ({ type: b.type || '', size: parts[i].length })) };
    const head = te.encode(JSON.stringify(m));
    const total = 4 + head.length + parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    new DataView(out.buffer).setUint32(0, head.length);
    out.set(head, 4);
    let o = 4 + head.length;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };
  DJ.unpack = function unpack(u8) {
    const n = new DataView(u8.buffer, u8.byteOffset).getUint32(0);
    const m = JSON.parse(td.decode(u8.subarray(4, 4 + n)));
    let o = 4 + n;
    const blobs = (m._parts || []).map((p) => { const b = new Blob([u8.subarray(o, o + p.size)], { type: p.type }); o += p.size; return b; });
    delete m._parts;
    return { manifest: m, blobs };
  };
  DJ.sealJSON = async (pubKey, obj) => DJ.seal(pubKey, te.encode(JSON.stringify(obj)));
  DJ.openJSON = async (privKey, blob) => JSON.parse(td.decode(await DJ.open(privKey, blob)));

  // ---------- Google Drive ----------
  // Sign-in goes to Google's page and comes back with a one-hour pass (no server needed).
  // Phone entries travel through a hidden app folder in your Drive; backups go to a normal
  // folder called "Digital Journal backups" that you can see in Drive.
  const TOKEN_KEY = 'dj-gtoken', CID_KEY = 'dj-gcid';
  const SCOPE = 'openid email https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';
  const API = 'https://www.googleapis.com/drive/v3', UP = 'https://www.googleapis.com/upload/drive/v3';
  const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } };
  const base = () => location.origin + location.pathname.replace(/index\.html$/, '');
  const drive = DJ.drive = {
    available: () => /^https:$/.test(location.protocol) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname),
    redirectURI: base,
    cid: () => localStorage.getItem(CID_KEY) || '',
    setCid: (v) => { if (v) localStorage.setItem(CID_KEY, v.trim()); else localStorage.removeItem(CID_KEY); },
    session: () => readJSON(TOKEN_KEY),
    email: () => (readJSON(TOKEN_KEY) || {}).email || localStorage.getItem('dj-gemail') || '',
    token() { const t = readJSON(TOKEN_KEY); return t && t.exp > Date.now() + 60000 ? t.t : null; },
    signOut() { const t = drive.token(); localStorage.removeItem(TOKEN_KEY); if (t) fetch('https://oauth2.googleapis.com/revoke?token=' + t, { method: 'POST' }).catch(() => {}); },
    // Go to Google's sign-in page. silent: come straight back if you already said yes before.
    signIn({ silent = false, returnTo = location.hash, force = false } = {}) {
      const cid = drive.cid(); if (!cid) throw new Error('no-client-id');
      const nonce = DJ.uid();
      sessionStorage.setItem('dj-oauth-nonce', nonce);
      const state = b64url(JSON.stringify({ n: nonce, r: returnTo || '', s: silent ? 1 : 0 }));
      const p = new URLSearchParams({ client_id: cid, redirect_uri: base(), response_type: 'token', scope: SCOPE, include_granted_scopes: 'true', state });
      const hint = drive.email(); if (hint) p.set('login_hint', hint);
      if (silent) p.set('prompt', 'none'); else if (force || !hint) p.set('prompt', 'select_account consent');
      location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + p.toString());
    },
    // On page load: pick up the pass from the address after coming back from Google
    async handleRedirect() {
      const h = location.hash.slice(1);
      if (!/(^|&)(access_token|error)=/.test(h) || !/(^|&)state=/.test(h)) return null;
      const p = new URLSearchParams(h);
      let st = {}; try { st = JSON.parse(unb64url(p.get('state'))); } catch (_) { /* bad state */ }
      const ok = st.n && st.n === sessionStorage.getItem('dj-oauth-nonce');
      sessionStorage.removeItem('dj-oauth-nonce');
      history.replaceState(null, '', location.pathname + location.search + (st.r || ''));
      if (!ok) return { error: 'state' };
      if (p.get('error')) return { error: p.get('error'), silent: !!st.s };
      const t = { t: p.get('access_token'), exp: Date.now() + (Number(p.get('expires_in')) || 3600) * 1000 };
      if (!(p.get('scope') || '').includes('drive.appdata')) { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); return { error: 'scope' }; }
      try {
        const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + t.t } });
        if (r.ok) { const u = await r.json(); t.email = u.email || ''; if (t.email) localStorage.setItem('dj-gemail', t.email); }
      } catch (_) { /* email is only a hint for next time */ }
      localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
      return { ok: true, silent: !!st.s };
    },
    async api(url, opts = {}) {
      const t = drive.token();
      if (!t) { const e = new Error('auth'); e.auth = true; throw e; }
      const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + t } });
      if (r.status === 401) { localStorage.removeItem(TOKEN_KEY); const e = new Error('auth'); e.auth = true; throw e; }
      if (!r.ok) { const e = new Error('drive ' + r.status); e.status = r.status; try { e.body = await r.text(); } catch (_) { /* ignore */ } throw e; }
      return r;
    },
    // List files. space: 'appDataFolder' (hidden) or 'drive' (normal Drive, only files this app made)
    async list({ q = '', space = 'appDataFolder' } = {}) {
      const out = []; let pageToken = '';
      do {
        const p = new URLSearchParams({ spaces: space, fields: 'nextPageToken,files(id,name,size,createdTime,modifiedTime)', pageSize: '1000', orderBy: 'name' });
        const qq = [q, 'trashed=false'].filter(Boolean).join(' and ');
        p.set('q', qq);
        if (pageToken) p.set('pageToken', pageToken);
        const r = await (await drive.api(`${API}/files?${p}`)).json();
        out.push(...(r.files || [])); pageToken = r.nextPageToken || '';
      } while (pageToken);
      return out;
    },
    download: async (id) => (await drive.api(`${API}/files/${id}?alt=media`)).blob(),
    downloadJSON: async (id) => (await drive.api(`${API}/files/${id}?alt=media`)).json(),
    del: (id) => drive.api(`${API}/files/${id}`, { method: 'DELETE' }).catch((e) => { if (e.status !== 404) throw e; }),
    // Upload (or replace) a file of any size with a resumable upload
    async upload(name, blob, { parents = ['appDataFolder'], id = '', type = 'application/octet-stream', onProgress = null } = {}) {
      const meta = id ? {} : { name, parents };
      const start = await drive.api(`${UP}/files${id ? '/' + id : ''}?uploadType=resumable&fields=id,name,size`, {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(blob.size) },
        body: JSON.stringify(meta),
      });
      const loc = start.headers.get('Location');
      if (!loc) {
        // Fallback: a single multipart request
        const bd = 'dj' + DJ.uid().replace(/-/g, '');
        const body = new Blob([`--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: ${type}\r\n\r\n`, blob, `\r\n--${bd}--`]);
        const r = await drive.api(`${UP}/files${id ? '/' + id : ''}?uploadType=multipart&fields=id,name,size`, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${bd}` }, body });
        return r.json();
      }
      if (onProgress) {
        return new Promise((res, rej) => {
          const x = new XMLHttpRequest();
          x.open('PUT', loc); x.setRequestHeader('Content-Type', type);
          x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
          x.onload = () => (x.status < 300 ? res(JSON.parse(x.responseText || '{}')) : rej(new Error('upload ' + x.status)));
          x.onerror = () => rej(new Error('network'));
          x.send(blob);
        });
      }
      const r = await fetch(loc, { method: 'PUT', headers: { 'Content-Type': type }, body: blob });
      if (!r.ok) throw new Error('upload ' + r.status);
      return r.json();
    },
    async uploadJSON(name, obj, opts = {}) { return drive.upload(name, new Blob([JSON.stringify(obj)], { type: 'application/json' }), { ...opts, type: 'application/json' }); },
    async folder(name) {
      const found = await drive.list({ q: `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents`, space: 'drive' });
      if (found.length) return found[0].id;
      const r = await (await drive.api(`${API}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: ['root'] }) })).json();
      return r.id;
    },
  };
})();

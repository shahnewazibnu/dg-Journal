/* Digital Journal — phone app (add entries only).
   Nothing from the journal is kept here. Each entry is locked with your PC's key, waits in
   a small outbox only until it's sent, then goes through a hidden folder in your Google Drive
   to the journal on your PC. The only things kept on the phone are this phone's own key and
   the list of tag, people and place names your PC sends so you can tap them. */
'use strict';
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const longDate = (s) => new Date(s + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const fmtDur = (s) => { s = Math.round(s || 0); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  const mb = (n) => (n / 1048576).toFixed(n > 10485760 ? 0 : 1) + ' MB';
  const app = $('#app');
  const MOODS = [
    ['great', '😄', 'Great', '#F4C542'], ['excited', '🤩', 'Excited', '#F29E4C'], ['loved', '🥰', 'Loved', '#EC7FA9'],
    ['good', '🙂', 'Good', '#8CCB7E'], ['calm', '😌', 'Calm', '#7EC4CF'], ['okay', '😐', 'Okay', '#B9B9B0'],
    ['tired', '😴', 'Tired', '#9A9FD6'], ['low', '😔', 'Low', '#7A93C9'], ['sad', '😢', 'Sad', '#5B76B0'], ['angry', '😠', 'Angry', '#E06450'],
  ];
  const TAG_COLORS = ['#E5697E', '#F29E4C', '#E8B931', '#7DBE6E', '#3FA79C', '#5B8DD6', '#8E7CC3', '#B98B6E', '#7D8B94'];

  // ---------- Small storage on the phone: keys, names list, outbox ----------
  const db = (() => {
    let p;
    const open = () => p || (p = new Promise((res, rej) => {
      const r = indexedDB.open('dj-phone', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('outbox', { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    const run = async (store, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(store, mode); const rq = fn(t.objectStore(store)); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
    return {
      get: (k) => run('kv', 'readonly', (s) => s.get(k)), set: (k, v) => run('kv', 'readwrite', (s) => s.put(v, k)), del: (k) => run('kv', 'readwrite', (s) => s.delete(k)),
      out: () => run('outbox', 'readonly', (s) => s.getAll()), outPut: (r) => run('outbox', 'readwrite', (s) => s.put(r)), outDel: (id) => run('outbox', 'readwrite', (s) => s.delete(id)),
    };
  })();
  const st = { screen: 'boot', paired: false, pc: null, keys: null, phoneId: '', names: { tags: [], people: [], places: [] }, sending: false, progress: 0, outbox: [], pairInfo: null, pollTimer: null, installEvt: null, quality: localStorage.getItem('djp-quality') || 'balanced', note: '' };

  let toastT;
  function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }

  // ---------- Screens ----------
  function render() {
    clearInterval(st.pollTimer);
    const s = st.screen;
    if (s === 'nolink') return show(`<section class="center"><div class="logo"></div><h1>Digital Journal</h1>
      <p>This is the phone app for your journal. To set it up, open your journal on your PC, go to <b>Settings → Phone app &amp; Google Drive</b>, and scan the code with this phone’s camera.</p></section>`);
    if (s === 'connect') return show(`<section class="center"><div class="logo"></div><h1>Add entries from your phone</h1>
      <p>Connect the Google account you use on your PC. Entries go through a hidden folder in your Google Drive to your journal. Nothing is kept on this phone after it’s sent.</p>
      <button class="btn primary big-btn" data-act="connect">Connect Google Drive</button>
      ${installBtn()}</section>`);
    if (s === 'pair') return renderPair();
    if (s === 'home') return renderHome();
    if (s === 'form') return renderForm();
    if (s === 'settings') return renderSettings();
    show('<section class="center"><div class="logo"></div><p class="muted">Opening…</p></section>');
  }
  function show(html) { app.innerHTML = html; app.scrollTop = 0; window.scrollTo(0, 0); }
  const installBtn = () => st.installEvt ? '<button class="btn line" data-act="install">Add to home screen</button>' : '';

  function renderPair() {
    const p = st.pairInfo || {};
    if (p.noPc) return show(`<section class="center"><div class="logo"></div><h1>One more step on your PC</h1>
      <p>Open your journal on your PC, go to <b>Settings → Phone app &amp; Google Drive</b> and choose <b>Connect Google Drive</b> there. Then come back here.</p>
      <button class="btn primary big-btn" data-act="pair">Check again</button></section>`);
    show(`<section class="center"><div class="logo"></div><h1>Allow this phone on your PC</h1>
      <p>On your PC, open <b>Settings → Phone app &amp; Google Drive</b>. A new phone will show up there. Check that the code matches, then choose <b>Allow</b>.</p>
      <div class="codes"><div><small>This phone’s code</small><b>${esc(p.myFp || '…')}</b></div><div><small>Your PC’s code</small><b>${esc(p.pcFp || '…')}</b></div></div>
      <p class="muted waiting"><span class="spin"></span>Waiting for your PC…</p>
      <p class="muted small">The PC checks every couple of minutes while the journal is open, or right away if you choose “Check for phone entries now”.</p></section>`);
    st.pollTimer = setInterval(checkApproved, 5000);
  }
  function greeting() { const h = new Date().getHours(); return h < 5 ? 'Still up?' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  function outboxHTML() {
    const n = st.outbox.length;
    if (st.sending) return `<div class="outbox sending"><span class="spin"></span>Sending ${n > 1 ? `${n} entries` : 'your entry'}… ${Math.round(st.progress * 100)}%</div>`;
    if (!n) return `<div class="outbox ok">✓ Everything has been sent to your journal</div>`;
    const size = st.outbox.reduce((s, r) => s + (r.size || 0), 0);
    return `<div class="outbox wait"><div><b>${n} ${n === 1 ? 'entry' : 'entries'} waiting to send</b> (${mb(size)})<br><small>${navigator.onLine ? (st.note || 'Tap Send now to finish.') : 'No internet right now. It sends when you’re back online.'}</small></div>
      ${navigator.onLine ? '<button class="btn primary" data-act="send">Send now</button>' : ''}</div>`;
  }
  function renderHome() {
    show(`<header class="top"><div class="brand"><span class="logo sm"></span>Journal</div><button class="icon" data-act="settings" aria-label="Settings">⚙︎</button></header>
      <section class="home">
        <p class="hello">${greeting()}. <span>What happened today?</span></p>
        <button class="big" data-act="quick"><span class="big-ic">📷</span><span><b>Quick entry</b><small>One photo and a line, saved in seconds</small></span></button>
        <button class="big" data-act="new"><span class="big-ic">✍️</span><span><b>New entry</b><small>Photos, words, mood, people, place, voice and more</small></span></button>
        <div id="outbox">${outboxHTML()}</div>
        ${installBtn()}
      </section>`);
  }
  function renderSettings() {
    show(`<header class="top"><button class="icon" data-act="home" aria-label="Back">←</button><div class="brand">Settings</div><span></span></header>
      <section class="pad">
        <h2>Photo quality</h2>
        <p class="muted">The same choice as on your PC. Photos are made smaller here before sending, so less data is used.</p>
        <div class="seg">${Object.entries(DJ.PROFILES).map(([k, p]) => `<button data-act="quality" data-v="${k}" aria-pressed="${st.quality === k}">${p.name}</button>`).join('')}</div>
        <h2>Names from your PC</h2>
        <p class="muted">${st.names.tags.length} tags, ${st.names.people.length} people and ${st.names.places.length} places. They update by themselves when you add new ones on your PC.</p>
        <button class="btn line" data-act="refresh-names">Update now</button>
        <h2>This phone</h2>
        <p class="muted">Connected as ${esc(DJ.drive.email() || 'your Google account')}. Code ${esc((st.pairInfo || {}).myFp || '')}.</p>
        ${installBtn()}
        <button class="btn danger" data-act="unpair">Disconnect this phone</button>
      </section>`);
  }

  // ---------- The entry form ----------
  let f = null;
  const blankForm = (mode) => ({ mode, date: today(), dateTouched: false, title: '', text: '', mood: '', fav: false, photos: [], media: [], tags: [], people: [], placeId: '', song: { title: '', artist: '', link: '' }, newTags: [], newPeople: [], newPlaces: [], busy: 0, spot: null, auto: '' });
  function chip(on, label, act, id, color) { return `<button type="button" class="chip${on ? ' on' : ''}" data-act="${act}" data-id="${esc(id)}"${color ? ` style="--c:${color}"` : ''} aria-pressed="${on}">${label}</button>`; }
  function renderForm() {
    const q = f.mode === 'quick';
    const allTags = [...st.names.tags, ...f.newTags], allPeople = [...st.names.people, ...f.newPeople], allPlaces = [...st.names.places, ...f.newPlaces];
    show(`<header class="top"><button class="icon" data-act="cancel" aria-label="Cancel">✕</button><div class="brand">${q ? 'Quick entry' : 'New entry'}</div><button class="btn primary sm" data-act="save"${f.busy ? ' disabled' : ''}>Save</button></header>
      <form class="form" onsubmit="return false">
        ${q ? '' : `<div class="row2"><label class="date">📅 <input type="date" id="fDate" value="${f.date}" max="${today()}"></label><button type="button" class="fav${f.fav ? ' on' : ''}" data-act="fav">${f.fav ? '★ Favorite' : '☆ Favorite'}</button></div>`}
        ${f.auto ? `<p class="auto">${f.auto}</p>` : ''}
        <div class="photos ${q ? 'one' : ''}">
          ${f.photos.map((p, i) => `<div class="ph${p.pending ? ' pending' : ''}">${p.url ? `<img src="${p.url}" alt="">` : ''}${p.pending ? '<span class="spin"></span>' : `<button type="button" class="x" data-act="del-photo" data-id="${p.id}" aria-label="Remove photo">✕</button>${i === 0 && !q ? '<span class="cover">Cover</span>' : ''}`}</div>`).join('')}
          ${!q || !f.photos.length ? `<label class="add-ph"><input type="file" accept="image/*" ${q ? '' : 'multiple'} id="fPhotos"><span>📷</span><b>${q ? 'Take or pick a photo' : 'Add photos'}</b></label>` : ''}
        </div>
        ${q ? '' : `<input class="title" id="fTitle" type="text" placeholder="Title (optional)" maxlength="140" value="${esc(f.title)}">`}
        <textarea id="fText" class="text" rows="${q ? 2 : 6}" placeholder="${q ? 'One line about it' : 'What happened today?'}">${esc(f.text)}</textarea>
        <p class="lbl">Mood</p>
        <div class="moods">${MOODS.map(([id, e, n, c]) => `<button type="button" class="mood${f.mood === id ? ' on' : ''}" data-act="mood" data-id="${id}" style="--mc:${c}" aria-label="${n}" title="${n}">${e}</button>`).join('')}</div>
        ${q ? '' : `
        <p class="lbl">Tags</p>
        <div class="chips">${allTags.map((t) => chip(f.tags.includes(t.id), '#' + esc(t.name), 'tag', t.id, t.color)).join('')}<button type="button" class="chip add" data-act="new-tag">+ New tag</button></div>
        <p class="lbl">Who was there</p>
        <div class="chips">${allPeople.map((p) => chip(f.people.includes(p.id), esc(p.name), 'person', p.id)).join('')}<button type="button" class="chip add" data-act="new-person">+ New person</button></div>
        <p class="lbl">Where</p>
        <div class="row2"><select id="fPlace"><option value="">No place</option>${allPlaces.map((p) => `<option value="${esc(p.id)}"${p.id === f.placeId ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select><button type="button" class="btn line" data-act="new-place">+ New place</button></div>
        <p class="lbl">Voice notes &amp; videos</p>
        <div class="media">${f.media.map((m) => `<div class="m"><span>${m.kind === 'audio' ? '🎙️' : '🎬'}</span>${m.kind === 'audio' ? `<audio controls src="${m.url}"></audio>` : `${m.thumbUrl ? `<img src="${m.thumbUrl}" alt="">` : ''}<span class="muted">Video · ${fmtDur(m.dur)}</span>`}<button type="button" class="x" data-act="del-media" data-id="${m.id}" aria-label="Remove">✕</button></div>`).join('')}</div>
        <div class="row2"><button type="button" class="btn line" data-act="record" id="recBtn">${rec.mr ? `■ Stop (${fmtDur((Date.now() - rec.t0) / 1000)})` : '● Record voice'}</button><label class="btn line">🎬 Add video<input type="file" accept="video/*" id="fVideo" hidden></label></div>
        <p class="lbl">Song of the day</p>
        <div class="song"><input id="fSong" type="text" placeholder="Song" value="${esc(f.song.title)}"><input id="fArtist" type="text" placeholder="Artist" value="${esc(f.song.artist)}"><input id="fLink" type="url" placeholder="Link (optional)" value="${esc(f.song.link)}"></div>`}
        <button type="button" class="btn primary wide" data-act="save"${f.busy ? ' disabled' : ''}>${f.busy ? 'Getting photos ready…' : 'Save and send'}</button>
      </form>`);
    const keep = (id, k, fn = (v) => v) => { const el = $('#' + id); if (el) el.addEventListener('input', () => { f[k] = fn(el.value); }); };
    keep('fTitle', 'title'); keep('fText', 'text');
    const dt = $('#fDate'); if (dt) dt.addEventListener('change', () => { f.date = dt.value || today(); f.dateTouched = true; });
    const pl = $('#fPlace'); if (pl) pl.addEventListener('change', () => { f.placeId = pl.value; });
    ['fSong', 'fArtist', 'fLink'].forEach((id, i) => { const el = $('#' + id); if (el) el.addEventListener('input', () => { f.song[['title', 'artist', 'link'][i]] = el.value; }); });
    const ph = $('#fPhotos'); if (ph) ph.addEventListener('change', () => { addPhotos([...ph.files]); ph.value = ''; });
    const vd = $('#fVideo'); if (vd) vd.addEventListener('change', () => { addVideo(vd.files[0]); vd.value = ''; });
  }
  const keepScroll = (fn) => { const y = window.scrollY; fn(); window.scrollTo(0, y); };

  async function addPhotos(files) {
    const temps = files.map(() => ({ id: 'tmp' + DJ.uid(), pending: true, url: '' }));
    f.photos.push(...temps); f.busy += files.length;
    keepScroll(renderForm);
    await Promise.all(files.map(async (file, i) => {
      const p = temps[i];
      try {
        const [rec, ex] = await Promise.all([DJ.processImage(file, st.quality), DJ.readExif(file)]);
        Object.assign(p, { id: rec.id, pending: false, rec, url: URL.createObjectURL(rec.thumb), exif: ex });
        if (ex) applyExif(ex);
      } catch (_) { f.photos = f.photos.filter((x) => x !== p); toast('That photo couldn’t be opened. Try another.'); }
      finally { f.busy--; }
    }));
    if (st.screen === 'form') keepScroll(renderForm);
  }
  function applyExif(ex) {
    const notes = [];
    if (ex.date && !f.dateTouched && ex.date !== f.date && ex.date <= today()) { f.date = ex.date; notes.push(`Date set to ${esc(longDate(ex.date))} from your photo.`); }
    if (ex.lat != null && !f.placeId) {
      const near = DJ.nearPlace([...st.names.places, ...f.newPlaces], ex.lat, ex.lng);
      if (near) { f.placeId = near.id; notes.push(`Place set to ${esc(near.name)}.`); } else f.spot = { lat: ex.lat, lng: ex.lng };
    }
    if (notes.length) f.auto = notes.join(' ');
  }
  async function addVideo(file) {
    if (!file) return;
    if (file.size > 150 * 1048576) { toast('That video is over 150 MB. Pick a shorter clip.', 4000); return; }
    f.busy++; keepScroll(renderForm); toast('Adding video…');
    try {
      const info = await DJ.videoInfo(file);
      const id = DJ.uid();
      f.media.push({ id, kind: 'video', blob: file.slice(0, file.size, file.type || 'video/mp4'), thumb: info.thumb, w: info.w, h: info.h, dur: info.dur, thumbUrl: URL.createObjectURL(info.thumb) });
    } catch (_) { toast('That video couldn’t be opened. MP4 works best.', 4000); }
    f.busy--; keepScroll(renderForm);
  }
  const rec = { mr: null, chunks: [], t0: 0, timer: null, stream: null };
  async function toggleRecord() {
    if (rec.mr) { rec.mr.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('This phone’s browser can’t record audio.'); return; }
    try { rec.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (_) { toast('Microphone access was blocked. Allow it in the browser’s site settings.', 4500); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
    rec.mr = new MediaRecorder(rec.stream, mime ? { mimeType: mime } : {});
    rec.chunks = []; rec.t0 = Date.now();
    rec.mr.ondataavailable = (e) => e.data.size && rec.chunks.push(e.data);
    rec.mr.onstop = () => {
      clearInterval(rec.timer); rec.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(rec.chunks, { type: rec.mr.mimeType || 'audio/webm' });
      const dur = (Date.now() - rec.t0) / 1000; rec.mr = null;
      if (f) { f.media.push({ id: DJ.uid(), kind: 'audio', blob, dur, url: URL.createObjectURL(blob) }); if (st.screen === 'form') keepScroll(renderForm); }
    };
    rec.mr.start(1000);
    rec.timer = setInterval(() => { const b = $('#recBtn'); if (b) b.textContent = `■ Stop (${fmtDur((Date.now() - rec.t0) / 1000)})`; if (Date.now() - rec.t0 > 300000 && rec.mr) rec.mr.stop(); }, 500);
    keepScroll(renderForm);
  }

  // A small sheet for new tags, people and places
  function sheet(html, onOk) {
    const el = document.createElement('div');
    el.className = 'sheet-wrap';
    el.innerHTML = `<div class="sheet">${html}<div class="row2 end"><button class="btn line" data-s="cancel">Cancel</button><button class="btn primary" data-s="ok">Add</button></div></div>`;
    document.body.appendChild(el);
    const inp = $('input', el); if (inp) setTimeout(() => inp.focus(), 50);
    el.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-s]');
      if (ev.target === el || (b && b.dataset.s === 'cancel')) { el.remove(); return; }
      if (b && b.dataset.s === 'ok') { if ((await onOk(el)) !== false) el.remove(); }
    });
  }
  function newTag() {
    sheet(`<h3>New tag</h3><input type="text" id="sName" placeholder="For example: Date, School, Friends" maxlength="40">`, (el) => {
      const name = $('#sName', el).value.trim().replace(/^#/, ''); if (!name) return false;
      const ex = [...st.names.tags, ...f.newTags].find((t) => t.name.toLowerCase() === name.toLowerCase());
      const t = ex || { id: DJ.uid(), name, color: TAG_COLORS[(st.names.tags.length + f.newTags.length) % TAG_COLORS.length] };
      if (!ex) f.newTags.push(t);
      if (!f.tags.includes(t.id)) f.tags.push(t.id);
      keepScroll(renderForm);
    });
  }
  function newPerson() {
    sheet(`<h3>New person</h3><input type="text" id="sName" placeholder="Name" maxlength="60"><p class="muted small">You can add their photo later on your PC.</p>`, (el) => {
      const name = $('#sName', el).value.trim(); if (!name) return false;
      const ex = [...st.names.people, ...f.newPeople].find((p) => p.name.toLowerCase() === name.toLowerCase());
      const p = ex || { id: DJ.uid(), name };
      if (!ex) f.newPeople.push(p);
      if (!f.people.includes(p.id)) f.people.push(p.id);
      keepScroll(renderForm);
    });
  }
  function newPlace() {
    const spot = f.spot;
    sheet(`<h3>New place</h3><input type="text" id="sName" placeholder="Place name, for example Bizzell Library" maxlength="80">
      <input type="text" id="sAddr" placeholder="Address (optional)" maxlength="200">
      ${spot ? `<label class="check"><input type="checkbox" id="sSpot" checked> Use where the photo was taken</label>` : ''}
      <button type="button" class="btn line" id="sHere">📍 Use where I am now</button><p class="muted small" id="sGeo"></p>`, (el) => {
      const name = $('#sName', el).value.trim(); if (!name) return false;
      let ll = el.dataset.lat ? { lat: +el.dataset.lat, lng: +el.dataset.lng } : null;
      if (!ll && spot && $('#sSpot', el) && $('#sSpot', el).checked) ll = spot;
      const p = { id: DJ.uid(), name, addr: $('#sAddr', el).value.trim(), lat: ll ? ll.lat : null, lng: ll ? ll.lng : null };
      f.newPlaces.push(p); f.placeId = p.id;
      keepScroll(renderForm);
    });
    const wrap = $('.sheet-wrap:last-of-type');
    $('#sHere', wrap).addEventListener('click', () => {
      if (!navigator.geolocation) { $('#sGeo', wrap).textContent = 'Location isn’t available on this phone.'; return; }
      $('#sGeo', wrap).textContent = 'Finding you…';
      navigator.geolocation.getCurrentPosition((pos) => {
        wrap.dataset.lat = pos.coords.latitude.toFixed(6); wrap.dataset.lng = pos.coords.longitude.toFixed(6);
        $('#sGeo', wrap).textContent = 'Got your location ✓';
      }, () => { $('#sGeo', wrap).textContent = 'Location was blocked or couldn’t be found.'; }, { enableHighAccuracy: true, timeout: 15000 });
    });
  }

  // ---------- Save: lock the entry for the PC and put it in the outbox ----------
  async function save() {
    if (f.busy) { toast('Photos are still being prepared…'); return; }
    if (rec.mr) { toast('Stop the voice recording first.'); return; }
    const title = f.title.trim(), text = f.text.replace(/\s+$/, '');
    const song = f.song.title.trim() ? { title: f.song.title.trim(), artist: f.song.artist.trim(), link: /^https?:\/\//i.test(f.song.link.trim()) ? f.song.link.trim() : (f.song.link.trim() && /^[\w-]+(\.[\w-]+)+/.test(f.song.link.trim()) ? 'https://' + f.song.link.trim() : '') } : null;
    if (!title && !text.trim() && !f.photos.length && !f.media.length && !song) { toast('Add a photo or write something first.'); return; }
    const btns = $$('[data-act="save"]'); btns.forEach((b) => { b.disabled = true; b.textContent = 'Saving…'; });
    try {
      const now = Date.now(), id = DJ.uid(), blobs = [];
      const add = (b) => { blobs.push(b); return blobs.length - 1; };
      const photos = f.photos.filter((p) => p.rec).map((p) => ({ id: p.rec.id, w: p.rec.w, h: p.rec.h, addedAt: p.rec.addedAt, parts: { blob: add(p.rec.blob), md: add(p.rec.md), thumb: add(p.rec.thumb) } }));
      const media = f.media.map((m) => ({ id: m.id, kind: m.kind, dur: m.dur || 0, w: m.w || 0, h: m.h || 0, parts: { blob: add(m.blob), ...(m.thumb ? { thumb: add(m.thumb) } : {}) } }));
      const used = (list, ids) => list.filter((x) => ids.includes(x.id));
      const manifest = {
        v: 1, from: st.phoneId,
        entry: { id, date: f.date, title, text, mood: f.mood, tint: 'mood', titleFont: '', tags: f.tags, peopleIds: f.people, placeId: f.placeId, fav: f.fav, song, createdAt: now, updatedAt: now },
        photos, media, newTags: used(f.newTags, f.tags), newPeople: used(f.newPeople, f.people), newPlaces: used(f.newPlaces, [f.placeId]),
      };
      const sealed = await DJ.seal(await DJ.keys.importPub(st.pc.pub), await DJ.pack(manifest, blobs));
      await db.outPut({ id, at: now, size: sealed.size, blob: sealed });
      // Keep any new names on the phone until the PC sends back the full list
      st.names.tags.push(...manifest.newTags); st.names.people.push(...manifest.newPeople); st.names.places.push(...manifest.newPlaces);
      cleanupForm(); f = null;
      st.screen = 'home'; st.outbox = await db.out(); render(); backOut();
      toast('Saved ✓');
      flush(true);
    } catch (e) {
      btns.forEach((b) => { b.disabled = false; b.textContent = 'Save and send'; });
      toast(e && e.name === 'QuotaExceededError' ? 'The phone is out of space for this entry. Free some space and try again.' : 'It couldn’t be saved. Try again.', 4000);
    }
  }
  function cleanupForm() {
    if (!f) return;
    f.photos.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    f.media.forEach((m) => { if (m.url) URL.revokeObjectURL(m.url); if (m.thumbUrl) URL.revokeObjectURL(m.thumbUrl); });
  }

  // ---------- Sending ----------
  async function flush(interactive = false) {
    if (st.sending) return;
    st.outbox = await db.out();
    if (!st.outbox.length) { st.note = ''; updateOutbox(); return; }
    if (!navigator.onLine) { updateOutbox(); return; }
    if (!DJ.drive.token()) {
      if (interactive) { goSignIn(); return; }
      st.note = 'Tap Send now to sign in to Google and finish.'; updateOutbox(); return;
    }
    st.sending = true; st.progress = 0; updateOutbox();
    let sent = 0;
    try {
      const items = [...st.outbox].sort((a, b) => a.at - b.at);
      const total = items.reduce((s, r) => s + r.size, 0); let doneBytes = 0;
      for (const r of items) {
        await DJ.drive.upload(`inbox-${r.at}-${r.id}.djx`, r.blob, { onProgress: (x) => { st.progress = (doneBytes + x * r.size) / total; updateOutbox(); } });
        doneBytes += r.size;
        await db.outDel(r.id); sent++;
      }
      st.note = '';
    } catch (e) {
      st.note = e.auth ? 'Google sign-in expired. Tap Send now.' : 'Sending stopped. Tap Send now to try again.';
      if (e.auth && interactive) { st.sending = false; goSignIn(); return; }
    } finally { st.sending = false; }
    st.outbox = await db.out();
    updateOutbox();
    if (sent) toast(`Sent ✓ ${sent > 1 ? sent + ' entries are' : 'It’s'} on the way to your journal`, 3500);
  }
  function updateOutbox() { const el = $('#outbox'); if (el) el.innerHTML = outboxHTML(); }
  function goSignIn(force = false) {
    const silent = !force && !!DJ.drive.email() && !sessionStorage.getItem('djp-silent-failed');
    try { DJ.drive.signIn({ silent, returnTo: '' }); } catch (_) { st.screen = 'nolink'; render(); }
  }
  window.addEventListener('online', () => { updateOutbox(); if (DJ.drive.token()) flush(); });
  window.addEventListener('offline', updateOutbox);

  // ---------- Pairing with the PC ----------
  async function myKeys() {
    if (st.keys) return st.keys;
    let kp = await db.get('keys');
    if (!kp) { kp = await DJ.keys.generate(false); await db.set('keys', kp); }
    st.keys = kp; return kp;
  }
  async function deviceName() {
    try { if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) { const v = await navigator.userAgentData.getHighEntropyValues(['model']); if (v.model) return v.model; } } catch (_) { /* ignore */ }
    return /Android/i.test(navigator.userAgent) ? 'Android phone' : 'Phone';
  }
  async function pair() {
    st.screen = 'pair'; st.pairInfo = { ...(st.pairInfo || {}), noPc: false }; render();
    try {
      const files = await DJ.drive.list();
      const kf = files.find((x) => x.name === 'pc-key.json');
      if (!kf) { st.pairInfo = { noPc: true }; render(); return; }
      const pc = await DJ.drive.downloadJSON(kf.id);
      st.pc = { pub: pc.pub, fp: await DJ.keys.fingerprint(pc.pub) };
      await db.set('pc', st.pc);
      const kp = await myKeys(), pub = await DJ.keys.exportPub(kp.publicKey);
      if (!st.phoneId) { st.phoneId = DJ.uid(); await db.set('phoneId', st.phoneId); }
      if (!files.some((x) => x.name === `phone-${st.phoneId}.json`)) await DJ.drive.uploadJSON(`phone-${st.phoneId}.json`, { v: 1, id: st.phoneId, name: await deviceName(), pub, createdAt: Date.now() });
      st.pairInfo = { myFp: await DJ.keys.fingerprint(pub), pcFp: st.pc.fp };
      await db.set('pairInfo', st.pairInfo);
      render();
      checkApproved();
    } catch (e) {
      if (e.auth) { st.screen = 'connect'; render(); return; }
      toast('Google Drive couldn’t be reached. Check the internet and try again.', 4000);
    }
  }
  async function fetchNames() {
    const files = await DJ.drive.list({ q: `name='names-${st.phoneId}.djx'` });
    if (!files.length) return false;
    const kp = await myKeys();
    const names = await DJ.openJSON(kp.privateKey, await DJ.drive.download(files[0].id));
    if (st.pc && names.pcFp && names.pcFp !== st.pc.fp) return false;
    st.names = { tags: names.tags || [], people: names.people || [], places: names.places || [] };
    await db.set('names', st.names); await db.set('namesAt', files[0].modifiedTime || '');
    return true;
  }
  async function checkApproved() {
    if (st.screen !== 'pair' || !DJ.drive.token()) return;
    try {
      if (await fetchNames()) { st.paired = true; await db.set('paired', true); st.screen = 'home'; render(); toast('Connected ✓ You can add entries now', 3500); }
    } catch (e) { if (e.auth) { clearInterval(st.pollTimer); st.screen = 'connect'; render(); } }
  }
  async function unpair() {
    if (!confirm('Disconnect this phone from your journal? Entries that haven’t been sent yet will be deleted.')) return;
    try {
      if (DJ.drive.token()) {
        const files = await DJ.drive.list();
        for (const x of files.filter((y) => y.name === `phone-${st.phoneId}.json`)) await DJ.drive.del(x.id);
      }
    } catch (_) { /* the PC can remove it too */ }
    for (const r of await db.out()) await db.outDel(r.id);
    for (const k of ['keys', 'pc', 'phoneId', 'names', 'paired', 'pairInfo', 'namesAt']) await db.del(k);
    DJ.drive.signOut();
    Object.assign(st, { paired: false, pc: null, keys: null, phoneId: '', names: { tags: [], people: [], places: [] }, pairInfo: null, outbox: [] });
    st.screen = 'connect'; render();
  }

  // ---------- Taps ----------
  app.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, id = b.dataset.id;
    const toggle = (arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
    switch (a) {
      case 'connect': goSignIn(true); break;
      case 'install': if (st.installEvt) { st.installEvt.prompt(); st.installEvt = null; render(); } break;
      case 'pair': pair(); break;
      case 'settings': st.screen = 'settings'; history.pushState({ s: 1 }, ''); render(); break;
      case 'home': st.screen = 'home'; render(); backOut(); break;
      case 'quick': case 'new': f = blankForm(a); st.screen = 'form'; history.pushState({ s: 1 }, ''); render(); if (a === 'quick') { const i = $('#fPhotos'); if (i) i.click(); } break;
      case 'cancel': if ((f.photos.length || f.text || f.title || f.media.length) && !confirm('Discard this entry?')) return; cleanupForm(); f = null; st.screen = 'home'; render(); backOut(); break;
      case 'save': save(); break;
      case 'send': flush(true); break;
      case 'fav': f.fav = !f.fav; keepScroll(renderForm); break;
      case 'mood': f.mood = f.mood === id ? '' : id; keepScroll(renderForm); break;
      case 'tag': f.tags = toggle(f.tags); keepScroll(renderForm); break;
      case 'person': f.people = toggle(f.people); keepScroll(renderForm); break;
      case 'new-tag': newTag(); break;
      case 'new-person': newPerson(); break;
      case 'new-place': newPlace(); break;
      case 'del-photo': { const p = f.photos.find((x) => x.id === id); if (p && p.url) URL.revokeObjectURL(p.url); f.photos = f.photos.filter((x) => x.id !== id); keepScroll(renderForm); break; }
      case 'del-media': f.media = f.media.filter((x) => x.id !== id); keepScroll(renderForm); break;
      case 'record': toggleRecord(); break;
      case 'quality': st.quality = b.dataset.v; localStorage.setItem('djp-quality', st.quality); render(); break;
      case 'refresh-names':
        if (!DJ.drive.token()) { goSignIn(); return; }
        try { if (await fetchNames()) { toast('Names updated'); render(); } else toast('Nothing new from your PC yet.'); } catch (_) { toast('Couldn’t reach Google Drive.'); }
        break;
      case 'unpair': unpair(); break;
      default:
    }
  });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); st.installEvt = e; if (['home', 'connect', 'settings'].includes(st.screen)) render(); });
  // The phone's Back button closes the form or settings instead of leaving the app
  const backOut = () => { if (history.state && history.state.s) history.back(); };
  window.addEventListener('popstate', () => {
    if (st.screen === 'form' && f) { if ((f.photos.length || f.text || f.title || f.media.length) && !confirm('Discard this entry?')) { history.pushState({ s: 1 }, ''); return; } cleanupForm(); f = null; }
    if (st.screen === 'form' || st.screen === 'settings') { st.screen = 'home'; render(); }
  });

  // ---------- Start ----------
  async function start() {
    // The setup link from the PC carries the Google client ID: #cid=…
    const m = location.hash.match(/[#&]cid=([^&]+)/);
    if (m) { DJ.drive.setCid(decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname); }
    const back = DJ.drive.available() ? await DJ.drive.handleRedirect() : null;
    if (back && back.error && back.silent) sessionStorage.setItem('djp-silent-failed', '1');
    if (back && back.ok) sessionStorage.removeItem('djp-silent-failed');
    if (back && back.error === 'scope') toast('Google Drive access wasn’t allowed. Connect again and tick every box.', 5000);
    if (!DJ.drive.cid()) { st.screen = 'nolink'; render(); return; }
    [st.paired, st.pc, st.phoneId, st.pairInfo] = await Promise.all([db.get('paired'), db.get('pc'), db.get('phoneId'), db.get('pairInfo')]);
    st.names = (await db.get('names')) || st.names;
    st.outbox = await db.out();
    if (!st.paired) {
      if (!DJ.drive.token()) { st.screen = 'connect'; render(); return; }
      pair(); return;
    }
    st.screen = 'home'; render();
    if (back && back.error && back.silent && st.outbox.length) { st.note = 'Tap Send now to sign in to Google and finish.'; updateOutbox(); }
    if (DJ.drive.token()) {
      await flush();
      fetchNames().then((ok) => { if (ok && st.screen === 'settings') render(); }).catch(() => {});
    }
  }
  if ('serviceWorker' in navigator && DJ.drive.available()) navigator.serviceWorker.register('sw.js').catch(() => {});
  start();
})();

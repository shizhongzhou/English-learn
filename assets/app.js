/* English Learn — static single-page app (no build step). */
(() => {
'use strict';

const LEVELS = [
  { code: 'A1', zh: '入门', desc: '能听懂并使用最基本的日常表达，介绍自己、问候、购物。' },
  { code: 'A2', zh: '基础', desc: '能就熟悉的日常话题进行简单交流，描述自己的经历和环境。' },
  { code: 'B1', zh: '进阶', desc: '能应付旅行、工作和学习中的大多数情况，表达观点并说明理由。' },
  { code: 'B2', zh: '中高级', desc: '能流利地与母语者交流，读懂较复杂的文章和新闻报道。' },
  { code: 'C1', zh: '高级', desc: '能理解长篇、有难度的文本，灵活有效地用于社交、学术和职场。' },
  { code: 'C2', zh: '精通', desc: '几乎能毫不费力地理解所听所读的一切，表达精准、细腻。' },
];
const LV = Object.fromEntries(LEVELS.map(l => [l.code, l]));
const SPEEDS = [{ v: 0.7, t: '慢速 0.7×' }, { v: 1, t: '正常 1×' }, { v: 1.5, t: '倍速 1.5×' }];
const PAGE = 120;

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  speaker: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
};

/* ---------- storage ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('el:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('el:' + k, JSON.stringify(v)); } catch {} },
};
const settings = Object.assign({ accent: 'us', engine: 'auto', speed: 1, showZh: true, hideEn: false }, store.get('settings', {}));
const saveSettings = () => store.set('settings', settings);
let known = new Set(store.get('known', []));
const saveKnown = () => store.set('known', [...known]);

/* ---------- data ---------- */
const cache = {};
function getJSON(url) {
  if (!cache[url]) cache[url] = fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); })
    .catch(e => { delete cache[url]; throw e; });
  return cache[url];
}
const vocab = code => getJSON(`data/vocab/${code}.json`);
const content = code => getJSON(`data/content/${code}.json`);
let dict = null;
async function getDict() {
  if (dict) return dict;
  const all = await Promise.all(LEVELS.map(l => vocab(l.code)));
  const m = new Map();
  all.forEach((list, i) => list.forEach(e => { const k = e.w.toLowerCase(); if (!m.has(k)) m.set(k, { ...e, lv: LEVELS[i].code }); }));
  return (dict = m);
}
function lookup(m, raw) {
  let w = raw.toLowerCase().replace(/[’']s$/, '').replace(/^[’']|[’']$/g, '');
  if (m.has(w)) return m.get(w);
  const tries = [];
  if (w.endsWith('ies')) tries.push(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) tries.push(w.slice(0, -2));
  if (w.endsWith('s')) tries.push(w.slice(0, -1));
  if (w.endsWith('ied')) tries.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) tries.push(w.slice(0, -2), w.slice(0, -1), w.slice(0, -3));
  if (w.endsWith('ing')) tries.push(w.slice(0, -3), w.slice(0, -3) + 'e', w.slice(0, -4));
  if (w.endsWith('ly')) tries.push(w.slice(0, -2));
  if (w.endsWith('er')) tries.push(w.slice(0, -2), w.slice(0, -1));
  if (w.endsWith('est')) tries.push(w.slice(0, -3), w.slice(0, -2));
  for (const t of tries) if (m.has(t)) return m.get(t);
  return null;
}

/* ---------- speech ---------- */
const synth = window.speechSynthesis;
let voices = [];
function loadVoices() { voices = synth ? synth.getVoices().filter(v => /^en[-_]/i.test(v.lang)) : []; }
if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }
const FEMALE = /female|samantha|victoria|karen|moira|tessa|fiona|zira|aria|jenny|libby|sonia|serena|susan|kate|allison|ava|joanna|salli|kimberly|emma|amy|olivia|natasha|hazel|heera|clara|michelle/i;
const MALE = /\bmale|daniel|alex\b|fred|david|guy|ryan|mark|george|arthur|oliver|aaron|rishi|thomas|james|brian|matthew|joey|justin|christopher|eric|liam|william|tom\b/i;
function pickVoice(gender) {
  if (!voices.length) loadVoices();
  if (!voices.length) return null;
  const want = settings.accent === 'uk' ? /en[-_]GB/i : /en[-_]US/i;
  let pool = voices.filter(v => want.test(v.lang));
  if (!pool.length) pool = voices;
  const rx = gender === 'm' ? MALE : FEMALE;
  const nat = pool.filter(v => /natural|neural|online|premium|enhanced/i.test(v.name));
  return nat.find(v => rx.test(v.name) && !(gender === 'm' && /female/i.test(v.name)))
    || pool.find(v => rx.test(v.name) && !(gender === 'm' && /female/i.test(v.name)))
    || (gender === 'm' ? pool[pool.length - 1] : pool[0]);
}
let audioEl = null;
let keep = []; // keep utterances alive (Chrome GC bug)
function stopSpeech() {
  if (synth) synth.cancel();
  if (audioEl) { audioEl.onended = audioEl.onerror = null; audioEl.pause(); audioEl = null; }
}
function speakTTS(text, { rate = 1, gender = 'f' } = {}) {
  return new Promise((resolve, reject) => {
    if (!synth || !voices.length) { loadVoices(); if (!synth || !voices.length) return reject(new Error('no tts')); }
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(gender);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = settings.accent === 'uk' ? 'en-GB' : 'en-US';
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = e => (e.error === 'interrupted' || e.error === 'canceled') ? resolve('cancel') : reject(e);
    keep.push(u); if (keep.length > 20) keep.shift();
    synth.speak(u);
  });
}
function speakOnline(text, { rate = 1 } = {}) {
  return new Promise((resolve, reject) => {
    const type = settings.accent === 'uk' ? 1 : 2;
    const a = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${type}`);
    audioEl = a;
    a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true;
    const setRate = () => { try { a.playbackRate = rate; } catch {} };
    setRate(); a.addEventListener('loadedmetadata', setRate);
    a.onended = () => resolve();
    a.onerror = () => reject(new Error('online audio failed'));
    a.play().catch(reject);
  });
}
async function speak(text, opts = {}) {
  stopSpeech();
  const eng = settings.engine;
  const online = eng === 'online' || (eng === 'auto' && (opts.word || !voices.length));
  try { return online ? await speakOnline(text, opts) : await speakTTS(text, opts); }
  catch (e) {
    if (opts.cancelled && opts.cancelled()) return 'cancel';
    try { return online ? await speakTTS(text, opts) : await speakOnline(text, opts); }
    catch { toast('无法播放声音：请在“发音设置”里换一种朗读引擎试试。'); throw e; }
  }
}

/* sequence player shared by dialogues, listening and news */
const player = {
  items: [], idx: -1, playing: false, gen: 0, onChange: null,
  load(items, onChange) { this.stop(); this.items = items; this.idx = -1; this.onChange = onChange; },
  async playFrom(i, single = false) {
    const gen = ++this.gen;
    this.playing = true; this.idx = i; this.emit();
    while (this.idx < this.items.length && gen === this.gen) {
      const it = this.items[this.idx];
      try { await speak(it.text, { rate: settings.speed, gender: it.gender, cancelled: () => gen !== this.gen }); }
      catch { break; }
      if (gen !== this.gen) return;
      if (single || this.idx >= this.items.length - 1) break;
      await new Promise(r => setTimeout(r, 450 / settings.speed));
      if (gen !== this.gen) return;
      this.idx++; this.emit();
    }
    if (gen === this.gen) { this.playing = false; this.emit(); }
  },
  toggle() { if (this.playing) this.stop(); else this.playFrom(this.idx < 0 || this.idx >= this.items.length - 1 ? 0 : this.idx); },
  stop() { this.gen++; this.playing = false; stopSpeech(); this.emit(); },
  emit() { this.onChange && this.onChange(this); },
};

/* ---------- small ui helpers ---------- */
let toastTimer;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'wordpop'; t.style.cssText = 'left:50%;bottom:24px;transform:translateX(-50%)'; document.body.append(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 3500);
}
function wrapWords(s) {
  return esc(s).replace(/[A-Za-z][A-Za-z’'\-]*[A-Za-z]|[A-Za-z]/g, m => `<span class="w">${m}</span>`);
}
function speedSeg() {
  return `<div class="seg" data-speed>${SPEEDS.map(s => `<button data-v="${s.v}" class="${settings.speed === s.v ? 'on' : ''}">${s.t}</button>`).join('')}</div>`;
}
function setLevelColor(code) {
  document.documentElement.style.setProperty('--lv', code ? `var(--${code})` : 'var(--B1)');
}
function navHTML(cur) {
  $('#levelnav').innerHTML = LEVELS.map(l => `<a href="#/${l.code}" style="--c:var(--${l.code})" class="${l.code === cur ? 'on' : ''}">${l.code}</a>`).join('');
}

/* ---------- views ---------- */
const app = $('#app');
let cleanup = null;

async function viewHome() {
  setLevelColor(null); navHTML(null);
  document.title = 'English Learn · 分级英语学习';
  const counts = await Promise.all(LEVELS.map(l => vocab(l.code).then(v => v.length).catch(() => 0)));
  let cum = 0;
  const cums = counts.map(n => (cum += n));
  const max = cums[cums.length - 1] || 1;
  app.innerHTML = `
  <section class="hero">
    <h1>一级一级，爬上英语的台阶</h1>
    <p>按欧洲共同语言参考标准（CEFR）分成 A1 到 C2 六级。每一级都有这一级该掌握的全部单词、情景对话、听力练习和本周新闻，点一下就能听到发音。</p>
    <div class="stairs">
      ${LEVELS.map((l, i) => `<a class="step" href="#/${l.code}" style="--c:var(--${l.code});--h:${22 + 78 * (i + 1) / 6}%;--w:${52 + 48 * (i + 1) / 6}%">
        <b>${l.code}</b><span class="zh">${l.zh}</span><span class="n"><span>${cums[i].toLocaleString()}</span> 词</span></a>`).join('')}
    </div>
    <p class="stairs-cap">台阶上的数字是到这一级为止累计需要掌握的词汇量。</p>
  </section>
  <section class="features">
    <div><h3>全部分级词汇</h3><p>每个单词都有音标和中文释义，点击即可发音。可以标记“已掌握”，进度保存在你的浏览器里。</p></div>
    <div><h3>情景对话</h3><p>点餐、问路、面试、谈判……按难度分级，男女声分角色朗读，每句配中文翻译。</p></div>
    <div><h3>听力练习</h3><p>先蒙着原文听，再做理解题，最后对照原文和译文逐句复听。</p></div>
    <div><h3>本周新闻</h3><p>同一条新闻按不同等级改写。慢速、正常、倍速三档朗读，逐句中英对照。</p></div>
  </section>`;
}

const TABS = [
  { id: 'vocab', zh: '单词' }, { id: 'dialogues', zh: '对话' }, { id: 'listening', zh: '听力' }, { id: 'news', zh: '新闻' },
];
function levelShell(code, tab, counts = {}) {
  const l = LV[code];
  return `<header class="lvhead"><span class="lvcode">${code}</span><div><h1>${l.zh}</h1><p>${l.desc}</p></div></header>
  <nav class="tabs">${TABS.map(t => `<a href="#/${code}/${t.id}" class="${t.id === tab ? 'on' : ''}">${t.zh}${counts[t.id] != null ? `<small>${counts[t.id]}</small>` : ''}</a>`).join('')}</nav>
  <div id="pane"></div>`;
}

async function viewLevel(code, tab = 'vocab', id = null) {
  setLevelColor(code); navHTML(code);
  document.title = `${code} ${LV[code].zh} · English Learn`;
  let [c, v] = [null, null];
  try { [c, v] = await Promise.all([content(code), vocab(code)]); }
  catch { app.innerHTML = levelShell(code, tab) ; $('#pane').innerHTML = '<p class="empty">内容加载失败，请检查网络后刷新页面。</p>'; return; }
  app.innerHTML = levelShell(code, tab, { vocab: v.length.toLocaleString(), dialogues: c.dialogues.length, listening: c.listening.length, news: c.news.length });
  const pane = $('#pane');
  if (tab === 'vocab') return paneVocab(pane, code, v);
  const list = c[tab] || [];
  if (!id) return paneList(pane, code, tab, list);
  const item = list.find(x => x.id === id);
  if (!item) { pane.innerHTML = '<p class="empty">没有找到这篇内容。</p>'; return; }
  if (tab === 'dialogues') return paneDialogue(pane, code, item);
  if (tab === 'listening') return paneListening(pane, code, item);
  if (tab === 'news') return paneNews(pane, code, item);
}

/* vocab */
async function paneVocab(pane, code, list) {
  const idx = LEVELS.findIndex(l => l.code === code);
  const below = LEVELS.slice(0, idx);
  const st = { scope: 'level', filter: 'all', q: '', shown: PAGE };
  let words = list;
  const cumTotal = idx === 0 ? list.length : (await Promise.all(LEVELS.slice(0, idx + 1).map(l => vocab(l.code)))).reduce((a, b) => a + b.length, 0);
  pane.innerHTML = `
  <div class="vtools">
    <label class="search">${ICON.search}<input type="search" placeholder="搜索单词或中文释义" aria-label="搜索"></label>
    ${idx > 0 ? `<div class="seg" data-scope><button data-v="level" class="on">本级新词 ${list.length.toLocaleString()}</button><button data-v="cum">累计 ${cumTotal.toLocaleString()}</button></div>` : ''}
    <div class="seg" data-filter><button data-v="all" class="on">全部</button><button data-v="todo">未掌握</button><button data-v="known">已掌握</button></div>
    <div class="vstat" id="vstat"></div>
  </div>
  <ul class="words" id="words"></ul>
  <div class="more" id="more"></div>`;
  const ul = $('#words'), more = $('#more'), stat = $('#vstat');

  async function source() {
    if (st.scope === 'cum') {
      const arr = await Promise.all(LEVELS.slice(0, idx + 1).map(l => vocab(l.code).then(v => v.map(e => ({ ...e, lv: l.code })))));
      return arr.flat();
    }
    return list;
  }
  function filtered() {
    const q = st.q.trim().toLowerCase();
    return words.filter(e => {
      if (st.filter === 'known' && !known.has(e.w)) return false;
      if (st.filter === 'todo' && known.has(e.w)) return false;
      if (!q) return true;
      return e.w.toLowerCase().startsWith(q) || (q.length > 1 && e.w.toLowerCase().includes(q)) || (/[一-龥]/.test(q) && e.t.includes(q));
    });
  }
  function row(e) {
    return `<li class="word${known.has(e.w) ? ' known' : ''}" data-w="${esc(e.w)}">
      <button class="say" aria-label="朗读 ${esc(e.w)}">${ICON.speaker}</button>
      <div class="w-en" data-say>${esc(e.w)}${e.p ? `<span class="ph">/${esc(e.p)}/</span>` : ''}${e.lv && st.scope === 'cum' ? `<span class="tag">${e.lv}</span>` : ''}</div>
      <button class="mark" aria-label="标记为已掌握" title="已掌握">${ICON.check}</button>
      <div class="w-zh">${e.pos && !/^[a-z]+\./.test(e.t) ? esc(e.pos) + ' ' : ''}${esc(e.t)}</div></li>`;
  }
  function render() {
    const f = filtered();
    const knownN = words.filter(e => known.has(e.w)).length;
    stat.innerHTML = `已掌握 <b>${knownN.toLocaleString()}</b> / ${words.length.toLocaleString()} 词${st.q || st.filter !== 'all' ? `，当前显示 ${f.length.toLocaleString()} 个` : ''}
      <div class="progress"><i style="width:${(100 * knownN / Math.max(words.length, 1)).toFixed(1)}%"></i></div>`;
    ul.innerHTML = f.slice(0, st.shown).map(row).join('') || '<li class="empty">没有符合条件的单词。</li>';
    more.innerHTML = f.length > st.shown ? `<button class="btn ghost">再显示 ${Math.min(PAGE, f.length - st.shown)} 个（剩余 ${(f.length - st.shown).toLocaleString()}）</button>` : '';
  }
  render();
  more.onclick = e => { if (e.target.closest('button')) { const y = scrollY; st.shown += PAGE; render(); scrollTo(0, y); } };
  let tmr;
  $('.search input', pane).oninput = e => { clearTimeout(tmr); tmr = setTimeout(() => { st.q = e.target.value; st.shown = PAGE; render(); }, 150); };
  pane.addEventListener('click', async e => {
    const seg = e.target.closest('.seg button');
    if (seg) {
      const g = seg.parentElement; g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === seg));
      if ('scope' in g.dataset) { st.scope = seg.dataset.v; words = await source(); }
      if ('filter' in g.dataset) st.filter = seg.dataset.v;
      st.shown = PAGE; render(); return;
    }
    const li = e.target.closest('.word'); if (!li) return;
    const w = li.dataset.w;
    if (e.target.closest('.mark')) {
      known.has(w) ? known.delete(w) : known.add(w); saveKnown();
      li.classList.toggle('known', known.has(w));
      const knownN = words.filter(x => known.has(x.w)).length;
      $('.progress i', stat).style.width = (100 * knownN / words.length).toFixed(1) + '%';
      $('b', stat).textContent = knownN.toLocaleString();
      return;
    }
    if (e.target.closest('.say, [data-say]')) {
      const b = $('.say', li); b.classList.add('playing');
      speak(w, { word: true, rate: 1 }).catch(() => {}).finally(() => b.classList.remove('playing'));
    }
  });
}

/* list of dialogues/listening/news */
function paneList(pane, code, tab, list) {
  const label = { dialogues: '段对话', listening: '篇听力', news: '条新闻' }[tab];
  pane.innerHTML = `<div class="cards">${list.map(x => {
    const n = (x.lines || x.sentences).length;
    const meta = tab === 'news' ? `<span class="cat">${esc(x.category)}</span><span>${esc(x.date)}</span><span>${n} 句</span>`
      : tab === 'dialogues' ? `<span>${esc(x.scene)}</span><span>${n} 句</span>` : `<span>${n} 句</span><span>${x.questions.length} 道题</span>`;
    return `<a class="card" href="#/${code}/${tab}/${x.id}"><h3>${esc(x.title)}</h3><span class="zh">${esc(x.titleZh)}</span><div class="meta">${meta}</div></a>`;
  }).join('')}</div>` + (list.length ? '' : `<p class="empty">这一级还没有${label}。</p>`);
}

function playerBar(extra = '') {
  return `<div class="player">
    <button class="play" data-act="toggle" aria-label="播放全部">${ICON.play}</button>
    <div class="label" id="plabel">播放全部</div>
    <div class="grow"></div>
    ${speedSeg()}
    ${extra}
  </div>`;
}
function bindReader(pane, items, sel, { onWord } = {}) {
  const nodes = () => pane.querySelectorAll(sel);
  player.load(items, p => {
    const btn = $('[data-act=toggle]', pane); if (!btn) return;
    btn.innerHTML = p.playing ? ICON.pause : ICON.play;
    btn.setAttribute('aria-label', p.playing ? '暂停' : '播放全部');
    $('#plabel', pane).textContent = p.playing ? `正在播放 ${p.idx + 1} / ${p.items.length}` : (p.idx >= 0 ? `已暂停 · 第 ${p.idx + 1} 句` : '播放全部');
    nodes().forEach((n, i) => n.classList.toggle('cur', i === p.idx && (p.playing || p.idx >= 0)));
    if (p.playing) { const n = nodes()[p.idx]; if (n) { const r = n.getBoundingClientRect(); if (r.top < 130 || r.bottom > innerHeight - 40) n.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } }
  });
  pane.addEventListener('click', e => {
    const sp = e.target.closest('[data-speed] button');
    if (sp) { settings.speed = +sp.dataset.v; saveSettings(); sp.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === sp)); if (player.playing) player.playFrom(player.idx); return; }
    if (e.target.closest('[data-act=toggle]')) { player.toggle(); return; }
    const w = e.target.closest('.w');
    if (w) { player.stop(); showWord(w); return; }
    const n = e.target.closest(sel);
    if (n) { const i = [...nodes()].indexOf(n); n.classList.add('revealed'); player.playFrom(i, !player.playing); }
  });
  cleanup = () => player.stop();
}
function toggles(pane, opts = { zh: true, en: true }) {
  const root = $('.reader', pane);
  const apply = () => { root.classList.toggle('hide-zh', !settings.showZh); root.classList.toggle('hide-en', settings.hideEn); };
  apply();
  pane.querySelectorAll('[data-toggle]').forEach(cb => {
    cb.checked = cb.dataset.toggle === 'zh' ? settings.showZh : settings.hideEn;
    cb.onchange = () => { if (cb.dataset.toggle === 'zh') settings.showZh = cb.checked; else settings.hideEn = cb.checked; saveSettings(); apply(); };
  });
}
const toggleHTML = `<label class="chk"><input type="checkbox" data-toggle="zh">中文翻译</label><label class="chk"><input type="checkbox" data-toggle="en">隐藏英文（盲听）</label>`;

function paneDialogue(pane, code, d) {
  const names = Object.keys(d.speakers);
  pane.innerHTML = `<a class="back" href="#/${code}/dialogues">‹ 全部对话</a>
  <h2 class="article-h">${esc(d.title)}</h2><p class="article-zh">${esc(d.titleZh)}</p><p class="scene">场景：${esc(d.scene)}</p>
  ${playerBar(toggleHTML)}
  <div class="reader"><div class="chat">${d.lines.map(l => `<div class="line ${names.indexOf(l.s) % 2 ? 'right' : ''}">
    <div class="who" aria-hidden="true">${esc(l.s.replace(/^Dr\. /, '')[0])}</div>
    <div class="bubble"><div class="name">${esc(l.s)}</div><div class="en">${wrapWords(l.en)}</div><div class="zhs">${esc(l.zh)}</div></div></div>`).join('')}</div></div>`;
  toggles(pane);
  bindReader(pane, d.lines.map(l => ({ text: l.en, gender: d.speakers[l.s] })), '.line');
}

function sentenceList(sents) {
  return `<ol class="sents">${sents.map((s, i) => `<li class="sent"><span class="idx">${i + 1}</span><div class="en">${wrapWords(s.en)}</div><div class="zhs">${esc(s.zh)}</div></li>`).join('')}</ol>`;
}

function paneNews(pane, code, n) {
  pane.innerHTML = `<a class="back" href="#/${code}/news">‹ 全部新闻</a>
  <h2 class="article-h">${esc(n.title)}</h2><p class="article-zh">${esc(n.titleZh)}</p>
  <div class="article-meta">${esc(n.category)} · ${esc(n.date)} · 为 ${code} 水平改写</div>
  ${playerBar(toggleHTML)}
  <div class="reader">${sentenceList(n.sentences)}</div>
  <p class="source">原始报道：<a href="${esc(n.source.url)}" target="_blank" rel="noopener">${esc(n.source.name)}</a>。点击任意句子单独播放，点击单词查看释义。</p>`;
  toggles(pane);
  bindReader(pane, n.sentences.map(s => ({ text: s.en, gender: 'f' })), '.sent');
}

function paneListening(pane, code, L) {
  const answers = {};
  pane.innerHTML = `<a class="back" href="#/${code}/listening">‹ 全部听力</a>
  <h2 class="article-h">${esc(L.title)}</h2><p class="article-zh">${esc(L.titleZh)}</p>
  <p class="scene">先不看原文听一遍，然后回答下面的问题。</p>
  ${playerBar()}
  <section class="quiz"><h2>理解题</h2>
    ${L.questions.map((q, qi) => `<div class="q" data-q="${qi}"><p>${qi + 1}. ${esc(q.q)}</p><div class="qzh">${esc(q.qZh)}</div>
      <div class="opts">${q.options.map((o, oi) => `<button class="opt" data-o="${oi}">${String.fromCharCode(65 + oi)}. ${esc(o)}</button>`).join('')}</div></div>`).join('')}
    <div class="score" id="score"></div>
    <button class="btn" id="checkBtn">核对答案</button>
  </section>
  <section class="transcript" id="tr" hidden><h2>原文与翻译</h2>
    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:8px">${toggleHTML}</div>
    <div class="reader">${sentenceList(L.sentences)}</div></section>
  <p style="margin-top:20px"><button class="btn ghost" id="showTr">显示原文</button></p>`;
  const tr = $('#tr', pane);
  const reveal = () => { tr.hidden = false; $('#showTr', pane).hidden = true; toggles(pane); };
  pane.addEventListener('click', e => {
    const o = e.target.closest('.opt');
    if (o && !pane.dataset.checked) {
      const q = o.closest('.q'); q.querySelectorAll('.opt').forEach(b => b.classList.toggle('sel', b === o));
      answers[q.dataset.q] = +o.dataset.o;
    }
    if (e.target.id === 'showTr') reveal();
    if (e.target.id === 'checkBtn') {
      pane.dataset.checked = 1;
      let right = 0;
      L.questions.forEach((q, qi) => {
        const el = pane.querySelector(`[data-q="${qi}"]`);
        el.querySelectorAll('.opt').forEach((b, oi) => { b.classList.remove('sel'); if (oi === q.answer) b.classList.add('right'); else if (oi === answers[qi]) b.classList.add('wrong'); });
        if (answers[qi] === q.answer) right++;
      });
      $('#score', pane).textContent = `答对 ${right} / ${L.questions.length} 题。${right === L.questions.length ? '全对！' : '对照下面的原文再听一遍吧。'}`;
      e.target.hidden = true; reveal();
    }
  });
  bindReader(pane, L.sentences.map(s => ({ text: s.en, gender: L.voice || 'f' })), '.sent');
}

/* word popup */
const pop = $('#wordpop');
async function showWord(span) {
  const raw = span.textContent;
  speak(raw.replace(/[’']s$/, ''), { word: true, rate: 1 }).catch(() => {});
  const r = span.getBoundingClientRect();
  pop.innerHTML = `<b>${esc(raw)}</b><div class="zh">查询中…</div>`;
  pop.hidden = false;
  const place = () => {
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let x = Math.min(Math.max(8, r.left), innerWidth - w - 8);
    let y = r.bottom + 8; if (y + h > innerHeight - 8) y = r.top - h - 8;
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  };
  place();
  try {
    const e = lookup(await getDict(), raw);
    pop.innerHTML = e
      ? `<b>${esc(e.w)}</b>${e.p ? `<span class="ph">/${esc(e.p)}/</span>` : ''}<span class="lv" style="color:var(--${e.lv})">${e.lv}</span><div class="zh">${esc(e.t)}</div>`
      : `<b>${esc(raw)}</b><div class="zh">词表中暂无此词（多为人名、地名或专有名词）。</div>`;
  } catch { pop.innerHTML = `<b>${esc(raw)}</b><div class="zh">释义加载失败。</div>`; }
  place();
}
document.addEventListener('click', e => { if (!e.target.closest('.w, #wordpop')) pop.hidden = true; });
addEventListener('scroll', () => { pop.hidden = true; }, { passive: true });

/* settings sheet */
const sheet = $('#settings');
function syncSettingsUI() {
  sheet.querySelectorAll('[data-setting]').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('on', settings[g.dataset.setting] === b.dataset.v)));
}
$('#settingsBtn').onclick = () => { syncSettingsUI(); sheet.hidden = false; };
$('#settingsClose').onclick = () => sheet.hidden = true;
sheet.addEventListener('click', e => {
  if (e.target === sheet) sheet.hidden = true;
  const b = e.target.closest('[data-setting] button');
  if (b) { settings[b.parentElement.dataset.setting] = b.dataset.v; saveSettings(); syncSettingsUI(); speak('Hello! This is how I sound.', { rate: 1, gender: 'f' }).catch(() => {}); }
});
addEventListener('keydown', e => { if (e.key === 'Escape') { sheet.hidden = true; pop.hidden = true; } });

/* router */
async function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  pop.hidden = true;
  const [code, tab, id] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (code && LV[code]) await viewLevel(code, TABS.some(t => t.id === tab) ? tab : 'vocab', id || null);
  else await viewHome();
  scrollTo(0, 0);
}
addEventListener('hashchange', route);
route();
})();

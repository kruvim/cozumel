/* Cozumel — static, no build step, no secrets. Hash routing, relative paths. */
(function () {
'use strict';
var CFG = window.COZUMEL_CONFIG || {};
var KEY = 'cozumel.v1';
var $view = document.getElementById('view');
var $nav = document.getElementById('nav');

/* ---------- helpers ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function es(s) { return '<span class="es" dir="ltr" lang="es-MX">' + esc(s) + '</span>'; }
function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿¡?!.,;:"'\s]+/g, ' ').trim(); }
function cmp(s) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase(); }
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
var ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  spk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  bulb: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.2 1 2.1h5c0-.9.3-1.5 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  cross: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};
var WAVE = '<svg class="wave" viewBox="0 0 390 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 20C60 0 120 38 195 20S330 2 390 20V40H0Z" fill="#F4FFF0"/></svg>';

/* ---------- storage ---------- */
function blank() { return { xp: 0, coins: 0, streak: 0, lastDay: null, days: {}, lessons: {}, cards: {}, quizzes: [] }; }
function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return Object.assign(blank(), s); } catch (e) {} return blank(); }
var S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function touchDay() {
  var t = today();
  if (S.lastDay === t) return;
  var y = new Date(); y.setDate(y.getDate() - 1);
  var ys = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  S.streak = (S.lastDay === ys) ? S.streak + 1 : 1;
  S.lastDay = t; save();
}
function reward(xp, coins) { S.xp += xp; S.coins += coins; touchDay(); save(); }
function level() { return Math.floor(S.xp / (CFG.XP_PER_LEVEL || 500)) + 1; }
function lessonState(id) { return S.lessons[id] || (S.lessons[id] = { done: false, best: null, cardsDone: 0 }); }
// time on task: count 15s ticks while a learning screen is open and tab visible
setInterval(function () {
  if (document.hidden) return;
  if (!/^#\/(cards|quiz|review|lesson)\b/.test(location.hash)) return;
  var t = today(); S.days[t] = (S.days[t] || 0) + 15; save();
}, 15000);

/* ---------- content ---------- */
var C = { lessons: null, full: {} };
function getJSON(path) { return fetch(path).then(function (r) { if (!r.ok) throw new Error(path + ' ' + r.status); return r.json(); }); }
function loadLessons() {
  if (C.lessons) return Promise.resolve(C.lessons);
  return getJSON('content/lessons.json').then(function (d) {
    d.lessons.sort(function (a, b) { return a.order - b.order; });
    C.lessons = d; return d;
  });
}
function isHe(s) { return /[\u0590-\u05FF]/.test(s); }
function loadFull(l) {
  if (C.full[l.id]) return Promise.resolve(C.full[l.id]);
  return getJSON('content/' + l.file).then(function (d) {
    var cards = (d.cards || []).map(function (c) {
      return { id: c.id, es_mx: c.es, transliteration_he: c.transliteration_he, he: c.he, example: c.example_es ? { es: c.example_es, he: c.example_he } : null,
        image: { file: c.image, description_he: '' }, mexico_specific: !!c.mexico_specific, mexico_note_he: c.mexico_specific ? c.note_he : '', tip_he: c.mexico_specific ? '' : (c.note_he || '') };
    });
    var quiz = (d.quiz || []).map(function (q) {
      return { id: q.id, type: q.type === 'fill_in' ? 'type_answer' : 'multiple_choice', prompt_he: q.prompt_he, options: q.options ? shuffle(q.options) : null,
        options_lang: q.options && !isHe(q.answer) ? 'es' : 'he', correct: q.answer, accepted: q.accepted_answers || [], explanation_he: q.explanation_he, card_id: q.card_id };
    });
    var r = { sample: !!d.sample, intro_he: d.intro_he, cards: cards, questions: quiz };
    C.full[l.id] = r; return r;
  });
}
function loadCards(l) { return loadFull(l); }
function loadQuiz(l) { return loadFull(l).then(function (r) { return { sample: r.sample, questions: r.questions.map(function (q) { return Object.assign({}, q, { options: q.options ? shuffle(q.options) : null }); }) }; }); }
function findLesson(id) { return C.lessons.lessons.filter(function (l) { return l.id === id; })[0]; }
function nextLesson() {
  var ls = C.lessons.lessons;
  for (var i = 0; i < ls.length; i++) if (!lessonState(ls[i].id).done) return ls[i];
  return ls[0];
}

/* ---------- speech ---------- */
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text); u.lang = 'es-MX'; u.rate = .85;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^es[-_]MX/i.test(x.lang); })[0] || speechSynthesis.getVoices().filter(function (x) { return /^es/i.test(x.lang); })[0];
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) {}
}

/* ---------- shell ---------- */
var NAV = [
  ['#/', 'בית', 'home'], ['#/lessons', 'שיעורים', 'book'], ['#/progress', 'התקדמות', 'chart'], ['#/chat', 'שיחה', 'chat']
];
function renderNav(route, hide) {
  $nav.classList.toggle('hidden', !!hide);
  $nav.innerHTML = NAV.map(function (n) {
    var on = (n[0] === '#/' ? route === '' : route.indexOf(n[0].slice(2)) === 0) || (n[0] === '#/lessons' && /^(lesson)/.test(route));
    return '<a class="ni" href="' + n[0] + '"' + (on ? ' aria-current="page"' : '') + '>' + ICON[n[2]] + '<span>' + n[1] + '</span></a>';
  }).join('');
}
function setView(html, opts) {
  $view.innerHTML = html;
  window.scrollTo(0, 0);
  if (opts && opts.title) document.title = opts.title + ' · Cozumel';
  $view.focus({ preventScroll: true });
}
function chips() {
  return '<div class="chips"><div class="chip" title="רצף ימים"><img src="assets/flame.svg" alt="">' + '<span class="vh">רצף ימים</span>' + S.streak + '</div>' +
    '<div class="chip"><img src="assets/coin.svg" alt=""><span class="vh">מטבעות</span>' + S.coins + '</div>' +
    '<div class="chip lv">רמה ' + level() + '</div></div>';
}
function sampleBanner() {
  return C.lessons && C.lessons.sample ? '<div class="banner" role="note"><b>תוכן דוגמה (SAMPLE)</b> · ' + esc(C.lessons.sample_note_he || 'תוכן זמני') + '</div>' : '';
}
function err(e) {
  setView('<div class="err card" style="margin:20px"><h2>משהו השתבש</h2><p class="small">לא הצלחנו לטעון את התוכן. אם פתחתם את הקובץ ישירות מהדיסק, הריצו שרת מקומי (ראו README).</p><p class="small es">' + esc(e && e.message) + '</p><a class="cta" href="#/">חזרה</a></div>');
  renderNav('', false);
}

/* ---------- map ---------- */
function mapHTML(lessons) {
  var W = 354, step = 92, H = 70 + lessons.length * step, cur = nextLesson();
  var pts = lessons.map(function (l, i) { return [W / 2 + Math.sin(i * 1.3) * 100, H - 55 - i * step]; });
  var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
  var nodes = lessons.map(function (l, i) {
    var done = lessonState(l.id).done, isCur = cur && cur.id === l.id && !done;
    var cls = 'node' + (done ? ' done' : isCur ? ' cur' : ' todo');
    var inner = done ? ICON.check.replace('width="16" height="16"', '') : isCur ? '<img src="assets/star.svg" alt="" width="28" height="28">' : String(l.order);
    return '<a class="' + cls + '" href="#/lesson/' + encodeURIComponent(l.id) + '" style="left:' + (pts[i][0] / W * 100).toFixed(2) + '%;top:' + (pts[i][1] / H * 100).toFixed(2) + '%" aria-label="שיעור ' + l.order + ': ' + esc(l.title_he) + (done ? ' (הושלם)' : isCur ? ' (הבא)' : '') + '"><span class="c">' + inner + '</span><span class="l">' + esc(l.title_he) + '</span></a>';
  }).join('');
  return '<div class="map"><div class="map-in" style="aspect-ratio:' + W + '/' + H + '">' +
    '<svg class="path" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" stroke="#fff" stroke-opacity=".55" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="' + d + '" stroke="#14B5AE" stroke-width="4" stroke-dasharray="2 9" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>' +
    '<img class="deco" src="assets/palm.svg" alt="" width="60" style="left:4%;bottom:2%"><img class="deco" src="assets/monstera.svg" alt="" width="58" style="right:3%;top:3%;transform:rotate(12deg)">' + nodes + '</div></div>';
}

/* ---------- SRS ---------- */
var RATES = [['again', 'שוב', 'עוד דקה', 60e3], ['hard', 'קשה', 'יום', 864e5], ['good', 'טוב', '3 ימים', 3 * 864e5], ['easy', 'קל', 'שבוע', 7 * 864e5]];
function isDue(id) { var c = S.cards[id]; return !c || c.due <= Date.now(); }
function allCards() {
  return Promise.all(C.lessons.lessons.map(loadCards)).then(function (ds) {
    var out = []; ds.forEach(function (d) { d.cards.forEach(function (c) { out.push(c); }); }); return out;
  });
}

/* ---------- screens ---------- */
function home() {
  return loadLessons().then(allCards).then(function (cards) {
    var due = cards.filter(function (c) { return isDue(c.id); }).length;
    var nl = nextLesson(), per = CFG.XP_PER_LEVEL || 500, inLv = S.xp % per, goal = (CFG.DAILY_GOAL_MIN || 30) * 60, secs = S.days[today()] || 0;
    var pct = Math.min(100, Math.round(secs / goal * 100));
    var done = C.lessons.lessons.filter(function (l) { return lessonState(l.id).done; }).length;
    setView(
      '<div class="hero">' + chips() + '<div class="logo" aria-label="Cozumel">COZUMEL</div><h1>' + (S.streak > 1 ? 'כל הכבוד, ' + S.streak + ' ימים ברצף' : 'ברוכים הבאים') + '</h1><p>30 דקות ביום, ספרדית של מקסיקו</p>' +
      '<img class="deco" src="assets/monstera.svg" alt="" width="64" style="inset-inline-end:-22px;top:96px;transform:rotate(-18deg)"><img class="deco" src="assets/frond.svg" alt="" width="120" style="inset-inline-end:92px;top:2px;opacity:.35">' +
      '<img class="deco" src="assets/toucan.svg" alt="" width="64" style="inset-inline-end:14px;bottom:44px">' + WAVE + '</div>' +
      '<div class="body"><div class="home-grid"><div class="col">' + sampleBanner() +
      '<div class="card pad"><div class="row" style="font:700 13px var(--font-display)"><span>' + es(inLv + ' / ' + per + ' XP') + '</span><span style="display:flex;gap:4px;align-items:center"><img src="assets/bolt.svg" alt="" width="18" height="18">עוד ' + (per - inLv) + ' לרמה ' + (level() + 1) + '</span></div><div class="bar" role="progressbar" aria-valuenow="' + inLv + '" aria-valuemax="' + per + '" aria-label="התקדמות לרמה הבאה"><i style="width:' + Math.round(inLv / per * 100) + '%"></i></div></div>' +
      '<div class="card pad"><div class="row sec"><span>היעד היומי</span><small>' + Math.floor(secs / 60) + ' / ' + (CFG.DAILY_GOAL_MIN || 30) + ' דק׳</small></div><div class="bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemax="100" aria-label="יעד יומי"><i style="width:' + pct + '%"></i></div></div>' +
      '<a class="cta" href="#/lesson/' + encodeURIComponent(nl.id) + '">' + ICON.play + 'המשך: ' + esc(nl.title_he) + ' · ' + (nl.minutes || 10) + ' דק׳</a>' +
      (due ? '<a class="cta ghost" href="#/review">חזרה על כרטיסיות (' + due + ' ממתינות)</a>' : '<div class="card pad small">אין כרטיסיות לחזרה כרגע. 🎉'.replace(' 🎉', '') + '</div>') +
      '</div><div class="col"><div class="card"><div class="row sec pad"><span>מסלול האי · קוזומל</span><small>' + done + '/' + C.lessons.lessons.length + ' שיעורים</small></div>' + mapHTML(C.lessons.lessons) + '</div></div></div></div>',
      { title: 'בית' });
    renderNav('', false);
  });
}

function lessonsList() {
  return loadLessons().then(function (d) {
    setView('<div class="screen narrow"><h1>שיעורים</h1>' + sampleBanner() + '<ul class="lessons">' + d.lessons.map(function (l) {
      var st = lessonState(l.id);
      return '<li><a class="card li' + (st.done ? ' done' : '') + '" href="#/lesson/' + encodeURIComponent(l.id) + '"><span class="n">' + (st.done ? ICON.check : l.order) + '</span><span><b>' + esc(l.title_he) + '</b><span class="small">רמה ' + l.level + ' · ' + (l.minutes || 10) + ' דק׳' + (st.best != null ? ' · ציון ' + st.best + '%' : '') + '</span></span></a></li>';
    }).join('') + '</ul></div>', { title: 'שיעורים' });
    renderNav('lessons', false);
  });
}

function lesson(id) {
  return loadLessons().then(function () {
    var l = findLesson(id); if (!l) { location.hash = '#/lessons'; return; }
    return Promise.all([loadCards(l), loadQuiz(l)]).then(function (r) {
      var cards = r[0].cards, st = lessonState(l.id);
      setView('<div class="topbar"><a class="x" href="#/lessons" aria-label="חזרה לשיעורים">' + ICON.x + '</a></div><div class="screen narrow"><h1>' + esc(l.title_he) + '</h1>' +
        (r[0].sample ? '<div><span class="sample-badge">SAMPLE · תוכן דוגמה</span></div>' : '') +
        (r[0].intro_he ? '<p>' + esc(r[0].intro_he) + '</p>' : '') + '<p class="small">' + cards.length + ' כרטיסיות · ' + r[1].questions.length + ' שאלות בחידון</p>' +
        '<a class="cta" href="#/cards/' + encodeURIComponent(l.id) + '">' + ICON.play + 'התחלת כרטיסיות</a>' +
        '<a class="cta lime" href="#/quiz/' + encodeURIComponent(l.id) + '">חידון סיום שיעור</a>' +
        '<ul class="lessons">' + cards.map(function (c) { return '<li class="card pad"><div class="row"><span style="font-size:20px;font-weight:800">' + es(c.es_mx) + '</span><span>' + esc(c.he) + '</span></div></li>'; }).join('') + '</ul></div>', { title: l.title_he });
      renderNav('lesson', false);
    });
  });
}

/* flashcards */
var FS = null;
function startCards(id, review) {
  var p = review ? loadLessons().then(allCards) : loadLessons().then(function () { var l = findLesson(id); if (!l) throw new Error('lesson ' + id); return loadCards(l).then(function (d) { return d.cards; }); });
  return p.then(function (cards) {
    if (review) cards = cards.filter(function (c) { return isDue(c.id); });
    FS = { id: id, review: review, list: review ? shuffle(cards) : cards.slice(), i: 0, shown: false, again: 0 };
    renderCard();
  });
}
function imgTag(c) {
  var f = c.image && c.image.file, d = (c.image && c.image.description_he) || '';
  return '<div class="scene">' + (f ? '<img src="content/images/' + encodeURIComponent(f) + '" alt="' + esc(d) + '" onerror="this.onerror=null;this.src=\'assets/scene.svg\';this.nextElementSibling&&(this.nextElementSibling.hidden=false)">' : '<img src="assets/scene.svg" alt="">') +
    (d ? '<div class="cap" hidden>תמונה מוצעת: ' + esc(d) + '</div>' : '') + '</div>';
}
function renderCard() {
  var back = FS.review ? '#/' : '#/lesson/' + encodeURIComponent(FS.id);
  renderNav('cards', true);
  if (FS.i >= FS.list.length) {
    if (!FS.review) { var st = lessonState(FS.id); st.cardsDone = FS.list.length; reward(10, 5); }
    setView('<div class="topbar"><a class="x" href="' + back + '" aria-label="סגירה">' + ICON.x + '</a><div class="prog"><i style="width:100%"></i></div></div><div class="screen narrow"><div class="result"><h1>סיימתם את הכרטיסיות</h1>' +
      (FS.list.length ? '<div class="rw"><span class="pill"><img src="assets/bolt.svg" alt="">' + es('+10 XP') + '</span><span class="pill"><img src="assets/coin.svg" alt="">' + es('+5') + '</span></div>' : '<p>אין כרטיסיות לחזרה כרגע.</p>') +
      (FS.review ? '' : '<a class="cta lime" href="#/quiz/' + encodeURIComponent(FS.id) + '">לחידון סיום שיעור</a>') + '<a class="cta ghost" href="' + back + '">חזרה</a></div></div>');
    return;
  }
  var c = FS.list[FS.i], pct = Math.round(FS.i / FS.list.length * 100);
  setView('<div class="topbar"><a class="x" href="' + back + '" aria-label="סגירה">' + ICON.x + '</a><div class="prog" role="progressbar" aria-valuenow="' + pct + '" aria-valuemax="100" aria-label="התקדמות"><i style="width:' + pct + '%"></i></div></div>' +
    '<div class="screen narrow"><div class="meta"><span>כרטיסייה ' + (FS.i + 1) + ' מתוך ' + FS.list.length + '</span><span>' + (FS.review ? 'חזרה' : '') + '</span></div>' +
    '<div class="flash">' + imgTag(c) +
    '<div class="word">' + '<button class="spk" data-act="speak" aria-label="השמעה: ' + esc(c.es_mx) + '">' + ICON.spk + '</button>' + es(c.es_mx) + '</div>' +
    '<div class="ph">[' + esc(c.transliteration_he) + ']</div>' +
    (FS.shown ? '<div class="heb">' + esc(c.he) + '</div>' + (c.mexico_specific ? '<div class="mx">מקסיקו ספציפי' + (c.mexico_note_he ? ' · ' + esc(c.mexico_note_he) : '') + '</div>' : '') + (c.example ? '<div class="ex">' + es(c.example.es) + '<div class="small">' + esc(c.example.he) + '</div></div>' : '') : '') +
    '</div>' +
    (FS.shown && c.tip_he ? '<div class="hint"><span class="bub">' + ICON.bulb + '</span><div><b>שימו לב</b>' + esc(c.tip_he) + '</div></div>' : '') +
    (FS.shown ? '<div class="rate" role="group" aria-label="דירוג הקושי">' + RATES.map(function (r, k) { return '<button class="' + r[0] + '" data-act="rate" data-k="' + k + '">' + r[1] + '<small>' + r[2] + '</small></button>'; }).join('') + '</div>'
      : '<button class="cta" data-act="reveal" style="margin-top:auto">הצגת תשובה</button>') + '</div>', { title: 'כרטיסיות' });
  var b = $view.querySelector('[data-act=reveal],[data-k]'); if (b) b.focus({ preventScroll: true });
}

/* quiz */
var QS = null;
function startQuiz(id) {
  return loadLessons().then(function () {
    var l = findLesson(id); if (!l) { location.hash = '#/lessons'; return; }
    return loadQuiz(l).then(function (d) { QS = { l: l, qs: d.questions, i: 0, ok: 0, answered: null, sample: d.sample }; renderQ(); });
  });
}
function renderQ() {
  renderNav('quiz', true);
  var back = '#/lesson/' + encodeURIComponent(QS.l.id);
  if (QS.i >= QS.qs.length) return quizResult();
  var q = QS.qs[QS.i], pct = Math.round(QS.i / QS.qs.length * 100), a = QS.answered;
  var body;
  if (q.type === 'type_answer') {
    body = '<input class="txt" id="ans" type="text" lang="es-MX" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="התשובה בספרדית"' + (a ? ' disabled value="' + esc(a.value) + '"' : '') + '>' +
      (a ? '' : '<button class="cta" data-act="check">בדיקה</button>');
  } else {
    var lang = q.options_lang === 'es';
    body = '<div class="opts" role="group" aria-label="אפשרויות">' + q.options.map(function (o, k) {
      var cls = 'opt', mark = String.fromCharCode(1488 + k);
      if (a) { if (o === q.correct) cls += ' ok'; else if (o === a.value) cls += ' bad'; else cls += ' dim'; }
      var m = a ? (o === q.correct ? ICON.check : o === a.value ? ICON.cross : mark) : mark;
      return '<button class="' + cls + '" data-act="pick" data-v="' + esc(o) + '"' + (a ? ' disabled' : '') + '><span>' + (lang ? es(o) : esc(o)) + (a && o === q.correct ? '<span class="vh"> (נכון)</span>' : a && o === a.value ? '<span class="vh"> (שגוי)</span>' : '') + '</span><span class="ln" aria-hidden="true">' + m + '</span></button>';
    }).join('') + '</div>';
  }
  var fb = '';
  if (a) {
    fb = '<div class="fb' + (a.right ? '' : ' bad') + '" role="status"><h2>' + (a.right ? 'מעולה!' : 'כמעט') + '</h2><p>' + (a.right ? '' : 'התשובה הנכונה: ' + es(q.correct) + '. ') + esc(q.explanation_he || '') + '</p>' +
      (a.right ? '<div class="rw"><span class="pill"><img src="assets/bolt.svg" alt="">' + es('+10 XP') + '</span><span class="pill"><img src="assets/coin.svg" alt="">' + es('+2') + '</span></div>' : '') +
      '<button class="cta lime" data-act="next" id="next">' + (QS.i + 1 >= QS.qs.length ? 'לתוצאות' : 'המשך') + '</button></div>';
  }
  setView('<div class="topbar"><a class="x" href="' + back + '" aria-label="יציאה מהחידון">' + ICON.x + '</a><div class="prog" role="progressbar" aria-valuenow="' + pct + '" aria-valuemax="100" aria-label="התקדמות בחידון"><i style="width:' + pct + '%"></i></div></div>' +
    '<div class="screen narrow"><div class="meta"><span>שאלה ' + (QS.i + 1) + ' מתוך ' + QS.qs.length + (q.type === 'type_answer' ? ' · כתיבה' : ' · בחירה מרובה') + '</span>' + (QS.sample ? '<span class="sample-badge">SAMPLE</span>' : '') + '</div>' +
    '<div class="card pad"><div class="q">' + esc(q.prompt_he) + (q.prompt_es ? ' ' + es(q.prompt_es) : '') + '</div></div>' + body + '</div>' + fb, { title: 'חידון' });
  var f = a ? document.getElementById('next') : (q.type === 'type_answer' ? document.getElementById('ans') : null);
  if (f) f.focus({ preventScroll: true });
}
function answer(value) {
  var q = QS.qs[QS.i], right;
  if (q.type === 'type_answer') { var acc = [q.correct].concat(q.accepted || []).map(cmp); right = acc.indexOf(cmp(value)) >= 0; }
  else right = value === q.correct;
  if (right) { QS.ok++; reward(10, 2); }
  QS.answered = { value: value, right: right };
  renderQ();
}
function quizResult() {
  var n = QS.qs.length, pct = Math.round(QS.ok / n * 100), st = lessonState(QS.l.id), first = !st.done;
  st.done = true; st.best = Math.max(st.best || 0, pct);
  S.quizzes.push({ lesson: QS.l.id, pct: pct, t: Date.now() }); S.quizzes = S.quizzes.slice(-100);
  var bonus = first ? 20 : 0; reward(bonus, first ? 10 : 0);
  setView('<div class="topbar"><a class="x" href="#/lessons" aria-label="סגירה">' + ICON.x + '</a></div><div class="screen narrow"><div class="result"><h1>' + (pct >= 80 ? 'מעולה!' : pct >= 50 ? 'יפה, ממשיכים' : 'כדאי לחזור על הכרטיסיות') + '</h1><div class="big">' + es(pct + '%') + '</div><p>' + QS.ok + ' מתוך ' + n + ' תשובות נכונות</p>' +
    (first ? '<div class="rw"><span class="pill"><img src="assets/bolt.svg" alt="">' + es('+20 XP') + '</span><span class="pill"><img src="assets/coin.svg" alt="">' + es('+10') + '</span></div><p class="small">השיעור הושלם</p>' : '') +
    '<a class="cta" href="#/">לדף הבית</a><a class="cta ghost" href="#/quiz/' + encodeURIComponent(QS.l.id) + '">ניסיון נוסף</a></div></div>', { title: 'תוצאות' });
  confetti();
}
function confetti() {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cols = ['#FFC24B', '#FF8FB1', '#FF7A5C', '#2CC9C2', '#C6E33B', '#7CC8F2'], el = document.createElement('div');
  el.className = 'confetti'; el.setAttribute('aria-hidden', 'true');
  for (var i = 0; i < 40; i++) { var p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length]; p.style.animationDelay = Math.random() * .5 + 's'; el.appendChild(p); }
  document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2600);
}

/* progress */
function progress() {
  return loadLessons().then(function (d) {
    var done = d.lessons.filter(function (l) { return lessonState(l.id).done; }).length;
    var seen = Object.keys(S.cards).length, total = 0;
    var days = []; for (var i = 6; i >= 0; i--) { var dt = new Date(); dt.setDate(dt.getDate() - i); var k = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); days.push([k, Math.round((S.days[k] || 0) / 60), dt.getDay()]); }
    var max = Math.max.apply(null, days.map(function (x) { return x[1]; }).concat([30]));
    var he = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    var avg = S.quizzes.length ? Math.round(S.quizzes.reduce(function (a, q) { return a + q.pct; }, 0) / S.quizzes.length) : null;
    var bd = [['flame', 'רצף 3 ימים', S.streak >= 3], ['star', 'שיעור ראשון', done >= 1], ['bolt', '100 XP', S.xp >= 100], ['monstera', 'כל השיעורים', done === d.lessons.length && done > 0]];
    setView('<div class="screen narrow"><h1>התקדמות</h1>' + sampleBanner() +
      '<div class="stats"><div class="card stat"><b>' + es(S.xp) + '</b>XP</div><div class="card stat"><b>' + S.streak + '</b>ימים ברצף</div><div class="card stat"><b>' + done + '/' + d.lessons.length + '</b>שיעורים</div><div class="card stat"><b>' + (avg == null ? '—' : es(avg + '%')) + '</b>ממוצע חידונים</div></div>' +
      '<div class="card pad"><div class="sec">דקות לימוד, 7 ימים אחרונים</div><div class="week" role="img" aria-label="גרף דקות לימוד שבועי">' + days.map(function (x) { return '<div><span>' + x[1] + '</span><i style="height:' + Math.round(x[1] / max * 60) + 'px"></i><span>' + he[x[2]] + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="card pad"><div class="sec">כרטיסיות שנלמדו: ' + seen + '</div></div>' +
      '<div class="card badges">' + bd.map(function (b) { return '<div class="bd' + (b[2] ? '' : ' lk') + '"><img src="assets/badge' + (b[0] === 'star' ? '-star' : b[0] === 'flame' ? '-flame' : b[0] === 'bolt' ? '-bolt' : '-monstera') + '.svg" alt="">' + esc(b[1]) + (b[2] ? '' : '<span class="vh"> (נעול)</span>') + '</div>'; }).join('') + '</div>' +
      '<p class="small">ההתקדמות נשמרת רק בדפדפן הזה, במכשיר הזה.</p><button class="link" data-act="reset">איפוס כל ההתקדמות</button></div>', { title: 'התקדמות' });
    renderNav('progress', false);
  });
}

/* Conversation: coming soon (no AI, no network) */
function chat() {
  setView('<div class="screen narrow soon"><h1>שיחה</h1>' +
    '<div class="card pad soon-card"><div class="soon-ico" aria-hidden="true">' + (ICON.chat || '') + '</div><h2>בקרוב</h2><p>תרגול שיחה יגיע בהמשך. בינתיים אפשר להמשיך ללמוד בשיעורים ובכרטיסיות.</p><a class="cta" href="#/lessons">לשיעורים</a></div></div>', { title: 'שיחה' });
  renderNav('chat', false);
  return Promise.resolve();
}

/* ---------- router ---------- */
function route() {
  var h = location.hash.replace(/^#\/?/, ''), parts = h.split('/'), r = parts[0], id = decodeURIComponent(parts[1] || '');
  var p;
  if (r === '') p = home();
  else if (r === 'lessons') p = lessonsList();
  else if (r === 'lesson') p = lesson(id);
  else if (r === 'cards') p = loadLessons().then(function () { return startCards(id, false); });
  else if (r === 'review') p = loadLessons().then(function () { return startCards('', true); });
  else if (r === 'quiz') p = startQuiz(id);
  else if (r === 'progress') p = progress();
  else if (r === 'chat') p = chat();
  else p = Promise.resolve(void (location.hash = '#/'));
  p.catch(err);
}
document.addEventListener('click', function (e) {
  var t = e.target.closest('[data-act]'); if (!t) return;
  var a = t.getAttribute('data-act');
  if (a === 'speak') speak(FS.list[FS.i].es_mx);
  else if (a === 'reveal') { FS.shown = true; renderCard(); }
  else if (a === 'rate') {
    var k = +t.getAttribute('data-k'), c = FS.list[FS.i];
    S.cards[c.id] = { due: Date.now() + RATES[k][3], last: RATES[k][0] }; reward(2, 0);
    FS.i++; FS.shown = false; renderCard();
  }
  else if (a === 'pick') answer(t.getAttribute('data-v'));
  else if (a === 'check') { var v = document.getElementById('ans').value; if (v.trim()) answer(v); }
  else if (a === 'next') { QS.i++; QS.answered = null; renderQ(); }
  else if (a === 'reset') { if (confirm('למחוק את כל ההתקדמות?')) { S = blank(); save(); progress(); } }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'ans') { e.preventDefault(); if (e.target.value.trim()) answer(e.target.value); } });
document.addEventListener('submit', function (e) { e.preventDefault(); });
window.addEventListener('hashchange', route);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
route();
})();

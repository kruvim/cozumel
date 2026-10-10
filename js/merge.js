/* Safe merge of two progress states (UMD: browser global CozumelMerge, Node module). No data loss: max/newest/union. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.CozumelMerge = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function obj(x) { return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }
  function num(x) { return typeof x === 'number' && isFinite(x) ? x : 0; }
  function blank() { return { xp: 0, coins: 0, streak: 0, lastDay: null, days: {}, lessons: {}, cards: {}, quizzes: [] }; }
  function merge(a, b) {
    a = obj(a); b = obj(b);
    var r = blank();
    r.xp = Math.max(num(a.xp), num(b.xp));
    r.coins = Math.max(num(a.coins), num(b.coins));
    var la = a.lastDay || '', lb = b.lastDay || '';
    if (la > lb) { r.lastDay = la; r.streak = num(a.streak); }
    else if (lb > la) { r.lastDay = lb; r.streak = num(b.streak); }
    else { r.lastDay = la || null; r.streak = Math.max(num(a.streak), num(b.streak)); }
    [a, b].forEach(function (s) { var d = obj(s.days); Object.keys(d).forEach(function (k) { r.days[k] = Math.max(num(r.days[k]), num(d[k])); }); });
    [a, b].forEach(function (s) {
      var l = obj(s.lessons);
      Object.keys(l).forEach(function (id) {
        var x = obj(l[id]), y = r.lessons[id] || { done: false, best: null, cardsDone: 0 };
        y.done = !!(y.done || x.done);
        y.best = (x.best == null && y.best == null) ? null : Math.max(num(x.best), num(y.best));
        y.cardsDone = Math.max(num(x.cardsDone), num(y.cardsDone));
        r.lessons[id] = y;
      });
    });
    [a, b].forEach(function (s) {
      var c = obj(s.cards);
      Object.keys(c).forEach(function (id) { var x = obj(c[id]), y = r.cards[id]; if (!y || num(x.due) > num(y.due)) r.cards[id] = { due: num(x.due), last: x.last }; });
    });
    var seen = {}, q = [];
    [a, b].forEach(function (s) { (Array.isArray(s.quizzes) ? s.quizzes : []).forEach(function (e) { e = obj(e); var k = e.lesson + '|' + e.t; if (!seen[k]) { seen[k] = 1; q.push({ lesson: e.lesson, pct: num(e.pct), t: num(e.t) }); } }); });
    q.sort(function (x, y) { return x.t - y.t; });
    r.quizzes = q.slice(-100);
    return r;
  }
  return { merge: merge, blank: blank };
});

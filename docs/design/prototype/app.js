/* PDFE design prototype renderer. Plain browser script (no build, no network, no dependencies).
   Screens are described in data-*.js as blocks; this file renders them in Arabic (RTL) and English (LTR),
   in the five states, in hi-fi or wireframe mode. Money values are static strings: nothing here computes money. */
(function () {
  'use strict';
  var P = (window.PDFE = window.PDFE || {});
  P.screens = P.screens || {};
  P.ds = P.ds || {};
  P.nav = P.nav || {};
  P.role = P.role || {};

  var SIM = ['SIMULATION — NOT REAL MONEY', 'محاكاة — ليست أموالاً حقيقية'];
  var SIMULATED = ['SIMULATED', 'محاكاة'];
  var TS = '2026-01-15 09:00 UTC';
  var COR = 'COR-20260115-0042';
  var STATES = ['populated', 'empty', 'loading', 'error', 'denied'];
  var SIZES = { m360: 360, m390: 390, t768: 768, w1280: 1280, w1440: 1440 };

  var ST = {
    'ST-DRAFT': ['Draft', 'مسودة', 'pencil', 'neutral'],
    'ST-PENDING': ['Pending', 'قيد الانتظار', 'clock', 'info'],
    'ST-HELD': ['Held', 'معلّقة', 'pause-circle', 'warning'],
    'ST-UNDER-REVIEW': ['Under review', 'قيد المراجعة', 'search-check', 'warning'],
    'ST-COMPLETED': ['Completed', 'مكتملة', 'check-circle', 'success'],
    'ST-FAILED': ['Failed', 'فشلت', 'x-circle', 'danger'],
    'ST-REVERSED': ['Reversed', 'تم عكسها', 'undo', 'info'],
    'ST-EXPIRED': ['Expired', 'منتهية الصلاحية', 'timer-off', 'neutral']
  };
  var ST_MEANING = {
    'ST-DRAFT': ['Started, not submitted. Nothing has moved.', 'بدأت ولم تُرسَل بعد. لم تتحرك أي أموال.'],
    'ST-PENDING': ['Submitted and being processed.', 'أُرسلت وتتم معالجتها.'],
    'ST-HELD': ['Paused by a rule or a halt.', 'موقوفة بسبب قاعدة أو توقف.'],
    'ST-UNDER-REVIEW': ['A person must decide before it continues.', 'يجب أن يقرر شخص قبل المتابعة.'],
    'ST-COMPLETED': ['Finished and posted to the ledger.', 'اكتملت وقُيّدت في الدفتر.'],
    'ST-FAILED': ['Stopped without moving money.', 'توقفت دون تحريك أي أموال.'],
    'ST-REVERSED': ['Completed, then undone by a linked entry.', 'اكتملت ثم عُكست بقيد مرتبط.'],
    'ST-EXPIRED': ['Time ran out. Nothing was charged.', 'انتهى الوقت. لم يُخصم أي مبلغ.']
  };
  var DEFAULT_ST = ['ST-COMPLETED', 'ST-PENDING', 'ST-HELD', 'ST-FAILED'];
  var AMT = ['120.50', '75.00', '1,250.00', '18.25', '340.00', '5.00'];

  var IC = {
    pencil: '<path d="M3 13l1-4 7-7 3 3-7 7z"/>',
    clock: '<circle cx="8" cy="8" r="6"/><path d="M8 4v4l3 2"/>',
    'pause-circle': '<circle cx="8" cy="8" r="6"/><path d="M6.5 5.5v5M9.5 5.5v5"/>',
    'search-check': '<circle cx="7" cy="7" r="4.5"/><path d="M5.5 7l1.2 1.2L9 5.8M10.5 10.5L14 14"/>',
    'check-circle': '<circle cx="8" cy="8" r="6"/><path d="M5.5 8.2l1.8 1.8 3.2-3.6"/>',
    'x-circle': '<circle cx="8" cy="8" r="6"/><path d="M6 6l4 4M10 6l-4 4"/>',
    undo: '<path d="M5 4L2.5 6.5 5 9M3 6.5h6a4 4 0 010 8H6"/>',
    'timer-off': '<circle cx="8" cy="9" r="5"/><path d="M6 1.5h4M8 6v3M3 3l10 10"/>',
    home: '<path d="M2 8l6-5 6 5M4 7v6h8V7"/>',
    scan: '<path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3M4 8h8"/>',
    send: '<path d="M2 8h11M9 4l4 4-4 4"/>',
    chart: '<path d="M2 13V3M2 13h12M5 10l3-3 2 2 4-5"/>',
    user: '<circle cx="8" cy="5.5" r="2.5"/><path d="M3 14c0-3 2.5-4.5 5-4.5s5 1.5 5 4.5"/>',
    plus: '<path d="M8 3v10M3 8h10"/>',
    alert: '<path d="M8 2l6.5 11.5h-13zM8 6.5v3.5M8 11.8v.4"/>',
    info: '<circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 4.8v.4"/>',
    lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>',
    chevron: '<path d="M6 3l5 5-5 5"/>',
    'chevron-left': '<path d="M10 3L5 8l5 5"/>',
    copy: '<rect x="5" y="5" width="8" height="8" rx="1"/><path d="M3 10V3h7"/>',
    inbox: '<path d="M2 9l2-6h8l2 6v4H2zM2 9h4l1 2h2l1-2h4"/>'
  };
  function ic(name, cls) {
    return '<svg class="i ' + (cls || '') + '" viewBox="0 0 16 16" aria-hidden="true">' + (IC[name] || IC.info) + '</svg>';
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // Every translatable pair that is rendered passes through T(); the exporter records them to build the copy decks.
  function T(p, L) {
    if (Array.isArray(p)) {
      if (window.__rec && typeof p[0] === 'string' && typeof p[1] === 'string') window.__rec(window.__cur, p[0], p[1]);
      return p[L === 'ar' ? 1 : 0];
    }
    return p;
  }
  function X(p, L) { return esc(T(p, L)); }
  function N(s) { return '<bdi class="ltr">' + esc(s) + '</bdi>'; }
  function tsx(p, L) { return X(p, L).replace('{ts}', N(TS)); }
  function chip(id, L) {
    var s = ST[id] || ST['ST-PENDING'];
    return '<span class="chip st-' + s[3] + '">' + ic(s[2]) + '<span>' + esc(s[L === 'ar' ? 1 : 0]) + '</span></span>';
  }
  function val(v, L) {
    if (v && v.st) return chip(v.st, L);
    if (Array.isArray(v)) return X(v, L);
    return N(v);
  }

  /* ---------- inventory and links ---------- */
  var byId = {}, byName = {}, order = {};
  function indexInventory() {
    byId = {}; byName = {}; order = {};
    (P.inventory || []).forEach(function (s) {
      byId[s.id] = s; byName[s.ifc + '|' + s.name] = s;
      (order[s.ifc] = order[s.ifc] || []).push(s.id);
    });
  }
  function resolve(to, ifc) {
    var key = to.indexOf('|') > -1 ? to : ifc + '|' + to;
    return byName[key];
  }
  function hash(id, c, over) {
    var o = {}; ['lang', 'state', 'mode', 'size'].forEach(function (k) { o[k] = (over && over[k]) || c[k]; });
    return '#' + id + '?lang=' + o.lang + '&state=' + o.state + '&mode=' + o.mode + '&size=' + o.size + (c.cap ? '&cap=1' : '');
  }
  function href(to, c) {
    var s = resolve(to, c.ifc);
    if (!s) (window.__unresolved = window.__unresolved || []).push((c.ifc || '?') + '|' + to);
    return s ? hash(s.id, c, { state: 'populated' }) : '#' + c.id;
  }

  /* ---------- datasets / tables ---------- */
  function cell(col, i, d, c) {
    var t = col[2], L = c.L;
    if (t === 'id') return N((d.prefix || 'ID-') + (1000 + i * 17));
    if (t === 'date') return N('2026-01-' + ('0' + (10 + i)).slice(-2));
    if (t === 'money') return N(AMT[(i + (d.shift || 0)) % AMT.length] + ' ' + (col[3] || d.cur || 'ILS'));
    if (t === 'status') { var arr = d.st || DEFAULT_ST; return chip(arr[i % arr.length], L); }
    if (t === 'num') return N(String((i + 1) * 3));
    if (t === 'pct') return N(String(90 + i * 3) + '%');
    if (t === 'text') { var pool = col[3] || [['Demo item', 'عنصر تجريبي']]; return X(pool[i % pool.length], L); }
    if (t === 'user') { var u = [['Demo user A', 'مستخدم تجريبي أ'], ['Demo user B', 'مستخدم تجريبي ب'], ['Demo user C', 'مستخدم تجريبي ج']]; return X(u[i % u.length], L); }
    return N('-');
  }
  function tableHtml(d, c, n, linkTo) {
    var head = d.cols.map(function (col) { return '<th scope="col">' + X(col, c.L) + '</th>'; }).join('');
    var rows = '';
    for (var i = 0; i < n; i++) {
      rows += '<tr>' + d.cols.map(function (col, j) {
        var inner = cell(col, i, d, c);
        if (j === 0 && linkTo) inner = '<a href="' + href(linkTo, c) + '">' + inner + '</a>';
        return '<td data-label="' + esc(T(col, c.L)) + '">' + inner + '</td>';
      }).join('') + '</tr>';
    }
    return '<div class="table-wrap"><table><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* ---------- block renderers ---------- */
  var R = {};
  var DATA = { table: 1, cards: 1, timeline: 1, chart: 1, kpis: 1, book: 1, gauge: 1 };
  var FOOT = ['Definition and denominator are shown on each metric. Data as of {ts}. Simulated figures only.', 'التعريف والمقام معروضان لكل مؤشر. البيانات حتى {ts}. أرقام محاكاة فقط.'];

  R.kpis = function (b, c) {
    return '<section><div class="grid">' + b.items.map(function (k) {
      return '<div class="card kpi"><span class="muted">' + X(k[0], c.L) + '</span><span class="v">' + N(k[1]) + '</span>' +
        (k[2] ? '<span class="f">' + X(k[2], c.L) + '</span>' : '') + '<span><span class="badge-sim">' + X(SIMULATED, c.L) + '</span></span></div>';
    }).join('') + '</div><p class="foot">' + tsx(b.foot || FOOT, c.L) + '</p></section>';
  };
  R.table = function (b, c) {
    var d = P.ds[b.ds];
    var tools = b.tools === false ? '' : '<div class="toolsrow"><input class="search" type="search" aria-label="' + esc(T(['Search', 'بحث'], c.L)) + '" placeholder="' + esc(T(['Search', 'بحث'], c.L)) + '">' +
      (b.filters || []).map(function (f) { return '<select aria-label="' + esc(T(f, c.L)) + '"><option>' + X(f, c.L) + '</option></select>'; }).join('') +
      (b.cta ? '<a class="btn primary" href="' + href(b.cta[1], c) + '">' + ic('plus') + X(b.cta[0], c.L) + '</a>' : '') + '</div>';
    var n = b.n || 4;
    return '<section>' + (b.title ? '<h2 class="block-title">' + X(b.title, c.L) + '</h2>' : '') + tools + tableHtml(d, c, n, b.to) +
      '<div class="pager"><span>' + X(['Showing 1–{n} of {n}', 'عرض 1–{n} من {n}'], c.L).replace(/\{n\}/g, N(String(n))) + '</span>' +
      '<span class="actions"><button class="btn" aria-label="' + esc(T(['Previous page', 'الصفحة السابقة'], c.L)) + '" disabled>' + ic('chevron-left', 'dir-icon') + '</button><button class="btn" aria-label="' + esc(T(['Next page', 'الصفحة التالية'], c.L)) + '" disabled>' + ic('chevron', 'dir-icon') + '</button></span></div></section>';
  };
  R.kv = function (b, c) {
    return '<section>' + (b.title ? '<h2 class="block-title">' + X(b.title, c.L) + '</h2>' : '') + '<dl class="kv card">' +
      b.rows.map(function (r) { return '<dt>' + X(r[0], c.L) + '</dt><dd' + (r[2] ? ' class="big"' : '') + '>' + val(r[1], c) + '</dd>'; }).join('') + '</dl></section>';
  };
  function field(f, i, c) {
    var L = c.L, id = 'f' + i, kind = f[1], v = f[2], hint = f[3], blank = c.state === 'empty';
    var lab = '<label for="' + id + '">' + X(f[0], L) + '</label>';
    var h = hint ? '<span class="hint" id="' + id + 'h">' + X(hint, L) + '</span>' : '';
    var d = hint ? ' aria-describedby="' + id + 'h"' : '';
    var show = blank ? '' : (Array.isArray(v) ? T(v, L) : (v || ''));
    var ph = hint && blank ? ' placeholder="' + esc(T(hint, L)) + '"' : '';
    if (kind === 'money') return '<div class="field">' + lab + '<div class="money"><input id="' + id + '" inputmode="decimal" dir="ltr" value="' + esc(blank ? '' : v) + '" placeholder="0.00"' + d + '><select aria-label="' + esc(T(['Currency', 'العملة'], L)) + '"><option>' + esc(f[4] || 'ILS') + '</option></select></div>' + h + '</div>';
    if (kind === 'select') return '<div class="field">' + lab + '<select id="' + id + '"' + d + '><option>' + esc(show || T(['Choose', 'اختر'], L)) + '</option></select>' + h + '</div>';
    if (kind === 'textarea') return '<div class="field">' + lab + '<textarea id="' + id + '"' + d + ph + '>' + esc(show) + '</textarea>' + h + '</div>';
    if (kind === 'otp') return '<div class="field"><span class="lbl">' + X(f[0], L) + '</span><div class="otp" role="group" aria-label="' + esc(T(f[0], L)) + '">' + [0, 1, 2, 3, 4, 5].map(function (k) { return '<span>' + (blank ? '' : '•') + '</span>'; }).join('') + '</div>' + h + '</div>';
    if (kind === 'switch') return '<div class="switch' + (v ? ' on' : '') + '" role="switch" aria-checked="' + (v ? 'true' : 'false') + '" tabindex="0"><i></i><span>' + X(f[0], L) + '</span></div>';
    if (kind === 'checkbox') return '<label class="switch"><input type="checkbox"' + (v && !blank ? ' checked' : '') + ' style="inline-size:24px;block-size:24px"> <span>' + X(f[0], L) + '</span></label>';
    if (kind === 'file') return '<div class="field"><span class="lbl">' + X(f[0], L) + '</span><div class="card"><button class="btn" type="button">' + ic('plus') + X(['Choose a synthetic sample document', 'اختر مستندًا تجريبيًا'], L) + '</button><p class="muted">' + X(['Samples only. Real documents are never uploaded.', 'نماذج فقط. لا تُرفع مستندات حقيقية أبدًا.'], L) + '</p></div></div>';
    if (kind === 'readonly') return '<div class="field"><span class="lbl">' + X(f[0], L) + '</span><span>' + val(v, L) + '</span>' + h + '</div>';
    var type = kind === 'password' ? 'password' : (kind === 'date' ? 'text' : 'text');
    var shown = Array.isArray(v) ? esc(T(v, L)) : esc(show);
    if (kind === 'password' && !blank) shown = '••••••••';
    return '<div class="field">' + lab + '<input id="' + id + '" type="' + (kind === 'password' ? 'password' : type) + '" value="' + (kind === 'password' ? '' : shown) + '"' + d + ph + '>' + h + '</div>';
  }
  R.form = function (b, c) {
    var fields = b.fields.map(function (f, i) { return field(f, i, c); }).join('');
    var acts = '';
    if (b.submit) acts += '<a class="btn primary" href="' + href(b.submit[1], c) + '">' + X(b.submit[0], c.L) + '</a>';
    if (b.secondary) acts += '<a class="btn" href="' + href(b.secondary[1], c) + '">' + X(b.secondary[0], c.L) + '</a>';
    return '<section>' + (b.title ? '<h2 class="block-title">' + X(b.title, c.L) + '</h2>' : '') + '<form class="form card" onsubmit="return false">' + fields + (acts ? '<div class="actions">' + acts + '</div>' : '') + '</form></section>';
  };
  R.steps = function (b, c) {
    var labels = b.labels || [['Enter', 'أدخل'], ['Review', 'راجع'], ['Result', 'النتيجة']];
    return '<ol class="steps" aria-label="' + esc(T(['Steps', 'الخطوات'], c.L)) + '" style="list-style:none;padding:0;margin:0">' + labels.map(function (l, i) {
      return '<li><span' + (i === b.at ? ' aria-current="step"' : '') + '>' + (i + 1) + '. ' + X(l, c.L) + '</span></li>';
    }).join('') + '</ol>';
  };
  R.timeline = function (b, c) {
    return '<section>' + (b.title ? '<h2 class="block-title">' + X(b.title, c.L) + '</h2>' : '') + '<ol class="tl">' + b.events.map(function (e) {
      return '<li><div>' + X(e[0], c.L) + '</div><div class="when">' + N(e[1]) + '</div></li>';
    }).join('') + '</ol></section>';
  };
  R.chart = function (b, c) {
    var pts = b.pts || [20, 34, 28, 46, 40, 58, 52], w = 300, h = 120, step = w / (pts.length - 1), i, d = '', bars = '';
    for (i = 0; i < pts.length; i++) { d += (i ? 'L' : 'M') + (i * step).toFixed(0) + ' ' + (h - pts[i]); bars += '<rect x="' + (i * step - 9).toFixed(0) + '" y="' + (h - pts[i]) + '" width="18" height="' + pts[i] + '" fill="var(--pdfe-color-dataviz-1)" />'; }
    var svg = b.type === 'bar' ? '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(T(b.title, c.L)) + '">' + bars + '</svg>' :
      '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(T(b.title, c.L)) + '"><path d="' + d + '" fill="none" stroke="var(--pdfe-color-dataviz-1)" stroke-width="3"/><path d="' + d + ' L' + w + ' ' + h + ' L0 ' + h + 'Z" fill="var(--pdfe-color-dataviz-1)" opacity=".12"/></svg>';
    return '<section><figure class="card chart" style="margin:0"><h2 class="block-title">' + X(b.title, c.L) + ' <span class="badge-sim">' + X(SIMULATED, c.L) + '</span></h2>' + svg +
      '<figcaption>' + X(b.def || ['Definition: simulated values over time.', 'التعريف: قيم محاكاة على مر الوقت.'], c.L) + ' ' + X(['Denominator: all simulated records. As of', 'المقام: كل السجلات المحاكاة. حتى'], c.L) + ' ' + N(TS) + '.</figcaption>' +
      '<details><summary>' + X(['Show data table', 'عرض جدول البيانات'], c.L) + '</summary><p class="muted">' + pts.map(function (p) { return N(String(p)); }).join(', ') + '</p></details></figure></section>';
  };
  R.gauge = function (b, c) {
    return '<section class="card"><h2 class="block-title">' + X(b.title, c.L) + ' <span class="badge-sim">' + X(SIMULATED, c.L) + '</span></h2><div class="gauge"><strong>' + N(b.value) + '</strong><div class="bar" role="meter" aria-valuenow="' + parseInt(b.value, 10) + '" aria-valuemin="0" aria-valuemax="150" aria-label="' + esc(T(b.title, c.L)) + '"><i style="inline-size:' + Math.min(100, parseInt(b.value, 10) * 0.66) + '%"></i></div><span class="muted">' + X(['Minimum', 'الحد الأدنى'], c.L) + ' ' + N(b.min) + '</span></div><p class="foot">' + X(b.def || ['Definition: reserves divided by token liabilities (simulated).', 'التعريف: الاحتياطيات مقسومة على التزامات الرمز (محاكاة).'], c.L) + '</p></section>';
  };
  R.cards = function (b, c) {
    return '<section>' + (b.title ? '<h2 class="block-title">' + X(b.title, c.L) + '</h2>' : '') + '<div class="grid">' + b.items.map(function (k) {
      var inner = '<strong>' + X(k[0], c.L) + '</strong>' + (k[1] ? '<div class="kpi"><span class="v">' + val(k[1], c) + '</span></div>' : '') + (k[2] ? '<div class="muted">' + X(k[2], c.L) + '</div>' : '');
      return k[3] ? '<a class="card" style="text-decoration:none;color:inherit" href="' + href(k[3], c) + '">' + inner + '</a>' : '<div class="card">' + inner + '</div>';
    }).join('') + '</div></section>';
  };
  R.hero = function (b, c) {
    return '<section class="card kpi"><span class="muted">' + X(b.label, c.L) + '</span><span class="v" style="font-size:32px">' + N(b.value) + '</span>' + (b.sub ? '<span class="f">' + X(b.sub, c.L) + '</span>' : '') +
      '<span><span class="badge-sim">' + X(SIMULATED, c.L) + '</span></span>' + (b.actions ? '<div class="actions">' + b.actions.map(function (a) { return '<a class="btn' + (a[2] ? ' ' + a[2] : '') + '" href="' + href(a[1], c) + '">' + X(a[0], c.L) + '</a>'; }).join('') + '</div>' : '') + '</section>';
  };
  R.qr = function (b, c) {
    var seed = b.seed || 7, cells = '', n = 21, x, y, s = seed;
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) { s = (s * 1103515245 + 12345) & 0x7fffffff; var finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13); if ((finder && (x % 6 === 0 || y % 6 === 0 || (x % 6 > 1 && x % 6 < 5 && y % 6 > 1 && y % 6 < 5))) || (!finder && (s >> 16) % 2)) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>'; }
    var bad = b.invalid ? '<path d="M0 0L21 21M21 0L0 21" stroke="#b91c1c" stroke-width="1.2"/>' : '';
    return '<section class="qr"><svg viewBox="0 0 21 21" role="img" aria-label="' + esc(T(b.caption, c.L)) + '" fill="#000">' + cells + bad + '</svg><strong>' + X(b.caption, c.L) + '</strong>' +
      '<span class="badge-sim">' + X(b.invalid ? ['SIMULATED — do not send real crypto', 'محاكاة — لا ترسل عملات مشفرة حقيقية'] : SIMULATED, c.L) + '</span>' +
      (b.expires ? '<span aria-live="polite">' + X(['Expires in', 'ينتهي خلال'], c.L) + ' ' + N(b.expires) + '</span>' : '') + '</section>';
  };
  R.quote = function (b, c) {
    var q = b.q;
    function row(l, v, cls) { return '<div class="row ' + (cls || '') + '"><span>' + X(l, c.L) + '</span><strong>' + N(v) + '</strong></div>'; }
    return '<section class="card quote"><h2 class="block-title">' + X(['Quote', 'عرض السعر'], c.L) + ' <span class="badge-sim">' + X(['Illustrative rates', 'أسعار توضيحية'], c.L) + '</span></h2>' +
      row(['Rate', 'السعر'], q.rate) + row(['Fee', 'الرسوم'], q.fee) + row(['You send', 'ترسل'], q.send) + row(['Exact amount received', 'المبلغ المستلم بالضبط'], q.recv, 'total') +
      '<p aria-live="polite" class="muted">' + X(['This quote expires in', 'تنتهي صلاحية هذا العرض خلال'], c.L) + ' ' + N(q.exp) + '</p></section>';
  };
  R.receipt = function (b, c) {
    return '<section class="card receipt" data-mark="' + esc(T(SIM, c.L)) + '"><div>' + chip(b.status, c.L) + '</div><div class="kpi"><span class="v">' + N(b.amount) + '</span></div><dl class="kv">' +
      (b.rows || []).map(function (r) { return '<dt>' + X(r[0], c.L) + '</dt><dd>' + val(r[1], c) + '</dd>'; }).join('') +
      '<dt>' + X(['Reference', 'المرجع'], c.L) + '</dt><dd>' + N(b.ref || 'RCT-20260115-0187') + '</dd><dt>' + X(['Trace ID', 'معرّف التتبّع'], c.L) + '</dt><dd><a href="#" aria-label="' + esc(T(['Open trace', 'فتح التتبّع'], c.L)) + '">' + N(b.trace || 'TRC-9f3a-20260115') + '</a></dd></dl>' +
      '<div class="actions"><button class="btn" type="button">' + ic('copy') + X(['Share receipt image', 'مشاركة صورة الإيصال'], c.L) + '</button></div></section>';
  };
  R.maker = function (b, c) {
    var L = c.L;
    return '<section class="card maker"><h2 class="block-title">' + X(b.title || ['Approval', 'الموافقة'], L) + '</h2><dl class="kv"><dt>' + X(['Requester', 'مقدّم الطلب'], L) + '</dt><dd>' + X(['Demo user A', 'مستخدم تجريبي أ'], L) + '</dd><dt>' + X(['Approver', 'الموافِق'], L) + '</dt><dd>' + X(b.conflict ? ['Demo user A (same person)', 'مستخدم تجريبي أ (نفس الشخص)'] : ['Demo user B', 'مستخدم تجريبي ب'], L) + '</dd></dl>' +
      (b.conflict ? '<div class="notice warn" role="alert">' + ic('alert') + '<div><b>' + X(['Separation of duties', 'فصل المهام'], L) + '</b>' + X(['You cannot approve your own request. Ask a different approver.', 'لا يمكنك الموافقة على طلبك. اطلب من موافِق آخر.'], L) + '</div></div>' : '') +
      '<div class="field"><label for="mk">' + X(['Reason', 'السبب'], L) + '</label><textarea id="mk">' + (c.state === 'empty' ? '' : esc(T(['Routine simulated request.', 'طلب محاكاة روتيني.'], L))) + '</textarea></div>' +
      '<div class="actions"><button class="btn primary" type="button"' + (b.conflict ? ' disabled' : '') + '>' + X(['Approve', 'موافقة'], L) + '</button><button class="btn danger" type="button">' + X(['Reject', 'رفض'], L) + '</button></div></section>';
  };
  R.book = function (b, c) {
    function side(cls, rows) { return '<div class="table-wrap"><table><thead><tr><th>' + X(['Price', 'السعر'], c.L) + '</th><th>' + X(['Amount', 'الكمية'], c.L) + '</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr class="' + cls + '"><td>' + N(r[0]) + '</td><td>' + N(r[1]) + '</td></tr>'; }).join('') + '</tbody></table></div>'; }
    return '<section><h2 class="block-title">' + X(['Order book', 'دفتر الأوامر'], c.L) + ' <span class="badge-sim">' + X(SIMULATED, c.L) + '</span></h2><div class="book">' +
      side('bid', [['41,980.00', '0.25'], ['41,975.50', '0.40'], ['41,970.00', '1.10']]) + side('ask', [['42,010.00', '0.30'], ['42,015.50', '0.55'], ['42,020.00', '0.90']]) + '</div></section>';
  };
  R.text = function (b, c) { return '<p class="muted">' + X(b.t, c.L) + '</p>'; };
  R.notice = function (b, c) {
    var k = b.kind || 'info', icon = { info: 'info', warn: 'alert', danger: 'alert', success: 'check-circle', sim: 'info' }[k];
    return '<div class="notice ' + k + '" role="' + (k === 'danger' ? 'alert' : 'note') + '">' + ic(icon) + '<div>' + (b.title ? '<b>' + X(b.title, c.L) + '</b>' : '') + X(b.t, c.L) + '</div></div>';
  };
  R.actions = function (b, c) {
    return '<div class="actions">' + b.items.map(function (a) { return '<a class="btn' + (a[2] ? ' ' + a[2] : '') + '" href="' + href(a[1], c) + '">' + X(a[0], c.L) + '</a>'; }).join('') + '</div>';
  };
  R.status = function (b, c) {
    return '<section class="card"><div>' + chip(b.st, c.L) + '</div><p class="muted">' + X(b.t || ST_MEANING[b.st], c.L) + '</p></section>';
  };
  R.tabs = function (b, c) {
    return '<nav class="tabs" aria-label="' + esc(T(['Sections', 'الأقسام'], c.L)) + '">' + b.items.map(function (t, i) { return '<a href="#" onclick="return false"' + (i === (b.at || 0) ? ' aria-current="true"' : '') + '>' + X(t, c.L) + '</a>'; }).join('') + '</nav>';
  };

  /* ---------- state boxes ---------- */
  function emptyBox(def, c) {
    var e = def.empty || [['Nothing here yet', 'لا يوجد شيء هنا بعد'], ['New simulated items will appear here.', 'ستظهر هنا العناصر المحاكاة الجديدة.']];
    return '<div class="state-box" role="status">' + ic('inbox') + '<strong>' + X(e[0], c.L) + '</strong><span class="muted">' + X(e[1], c.L) + '</span></div>';
  }
  function loadingBox(c) {
    return '<div aria-busy="true" role="status" aria-label="' + esc(T(['Loading', 'جارٍ التحميل'], c.L)) + '"><div class="skel" style="block-size:28px;inline-size:40%"></div><div class="skel" style="block-size:96px;margin-block:12px"></div><div class="skel" style="block-size:16px;margin-block:8px"></div><div class="skel" style="block-size:16px;inline-size:80%;margin-block:8px"></div><div class="skel" style="block-size:120px;margin-block:12px"></div></div>';
  }
  function errorBox(c) {
    return '<div class="state-box err" role="alert">' + ic('alert') + '<strong>' + X(['Something went wrong', 'حدث خطأ ما'], c.L) + '</strong><span>' + X(['We could not complete that. Try again.', 'تعذّر إكمال هذا. حاول مرة أخرى.'], c.L) + '</span>' +
      '<span class="corr">' + X(['Reference', 'المرجع'], c.L) + ' ' + N(COR) + ' <button class="btn" type="button">' + ic('copy') + X(['Copy reference', 'نسخ المرجع'], c.L) + '</button></span>' +
      '<button class="btn primary" type="button">' + X(['Try again', 'حاول مرة أخرى'], c.L) + '</button></div>';
  }
  function deniedBox(c) {
    return '<div class="state-box den" role="alert">' + ic('lock') + '<strong>' + X(['You do not have access', 'ليس لديك صلاحية الوصول'], c.L) + '</strong><span>' + X(['Ask an administrator for access to this page.', 'اطلب من المسؤول صلاحية الوصول إلى هذه الصفحة.'], c.L) + '</span><a class="btn" href="#' + (c.homeId || c.id) + '?lang=' + c.lang + '&state=populated&mode=' + c.mode + '&size=' + c.size + '">' + X(['Go back', 'العودة'], c.L) + '</a></div>';
  }

  function body(def, c) {
    var blocks = def.blocks || [], s = c.state;
    if (s === 'loading') return loadingBox(c);
    if (s === 'error') return errorBox(c);
    if (s === 'denied') return deniedBox(c);
    function one(b) { return R[b.k] ? R[b.k](b, c) : ''; }
    if (s === 'empty') {
      var hasData = blocks.some(function (b) { return DATA[b.k]; }), hasForm = blocks.some(function (b) { return b.k === 'form'; }), shown = false;
      if (!hasData && !hasForm) return emptyBox(def, c);
      return blocks.map(function (b) {
        if (DATA[b.k]) { if (shown) return ''; shown = true; return emptyBox(def, c); }
        return one(b);
      }).join('');
    }
    return blocks.map(one).join('');
  }

  /* ---------- frame (shell + content) ---------- */
  var BRAND = ['PDFE Demo', 'منصة PDFE التجريبية'];
  var TABS = [['Home', 'الرئيسية', 'Home', 'home'], ['Pay/Scan', 'دفع/مسح', 'Scan QR', 'scan'], ['Send', 'إرسال', 'Send – recipient', 'send'], ['Markets', 'الأسواق', 'Markets', 'chart'], ['Profile', 'الملف', 'Profile', 'user']];
  P.renderFrame = function (id, c0) {
    window.__cur = id;
    var scr = byId[id], def = P.screens[scr.ifc + '|' + scr.name] || { blocks: [] };
    var c = Object.assign({}, c0, { id: id, ifc: scr.ifc, L: c0.lang });
    var L = c.L, ifc = scr.ifc, nav = P.nav[ifc] || [], title = def.ar ? [scr.name, def.ar] : scr.name;
    var navHtml = nav.map(function (n) {
      var cur = (n[2] === scr.name || n[2] === scr.ifc + '|' + scr.name) ? ' aria-current="page"' : '';
      return '<a href="' + href(n[2], c) + '"' + cur + '>' + ic(n[3] || 'home') + '<span>' + X(n, L) + '</span></a>';
    }).join('');
    var role = P.role[ifc] || ['Demo viewer', 'مشاهد العرض'];
    var tabs = ifc === 'CON' ? '<nav class="tabbar" aria-label="' + esc(T(['Main', 'الرئيسية'], L)) + '">' + TABS.map(function (t) {
      var cur = (t[2] === scr.name || (t[3] === 'send' && scr.name.indexOf('Send') === 0) || (t[3] === 'scan' && scr.name.indexOf('Pay') === 0)) ? ' aria-current="page"' : '';
      return '<a href="' + href(t[2], c) + '"' + cur + '>' + ic(t[3]) + '<span>' + X(t, L) + '</span></a>';
    }).join('') + '</nav>' : '';
    var stepper = '';
    var m = scr.name.match(/ – (enter|review|result)/i);
    if (scr.money === 'yes' && !def.nosteps) { var at = m ? { enter: 0, review: 1, result: 2 }[m[1].toLowerCase()] : 0; stepper = R.steps({ at: at }, c); }
    var head = '<div class="page-head"><h1>' + X(title, L) + '</h1><span class="sp"></span>' + (def.headActions ? R.actions({ items: def.headActions }, c) : '') + '</div>';
    return '<div class="frame" lang="' + L + '" dir="' + (L === 'ar' ? 'rtl' : 'ltr') + '" data-screen="' + id + '" data-state="' + c.state + '">' +
      '<div class="sim-banner" role="status" data-sim="1">' + ic('info') + '<span>' + esc(T(SIM, L)) + '</span></div>' +
      '<div class="shell"><aside class="sidenav" aria-label="' + esc(T(['Primary', 'القائمة الرئيسية'], L)) + '"><h2>' + X(BRAND, L) + '</h2>' + navHtml + '</aside>' +
      '<div class="main"><header class="topbar"><span class="pill">' + X(['Tenant: Demo A', 'المستأجر: تجريبي أ'], L) + '</span><span class="pill">' + X(role, L) + '</span><span class="sp"></span><span class="pill">' + (L === 'ar' ? 'AR · العربية' : 'EN · English') + '</span><span class="pill env">DEMO</span></header>' +
      '<header class="mhead"><strong>' + X(BRAND, L) + '</strong><span class="sp"></span><span class="badge-sim">' + X(SIMULATED, L) + '</span></header>' +
      '<main class="content">' + head + stepper + body(def, c) + '</main>' + tabs + '</div></div></div>';
  };

  /* ---------- sheets (one page per screen, five states) for PDF export ---------- */
  function sheet(q) {
    var ifc = q.ifc, L = q.lang, mode = q.mode, phase = q.phase ? parseInt(q.phase, 10) : 0, web = ifc !== 'CON';
    var W = web ? 1280 : 390, H = web ? 760 : 844, sc = web ? 0.4 : 0.8, per = web ? 3 : 5;
    var list = (P.inventory || []).filter(function (s) { return s.ifc === ifc && (!phase || s.phase === phase) && (!q.skeleton || s.skeleton === 'yes'); });
    var pages = list.map(function (s) {
      var cells = STATES.map(function (st) {
        var inner = P.renderFrame(s.id, { lang: L, state: st, mode: mode, size: web ? 'w1280' : 'm390', cap: true });
        return '<div class="sheet-cell"><h3>' + s.id + ' · ' + st + ' · ' + L + '</h3><div style="inline-size:' + (W * sc) + 'px;block-size:' + (H * sc) + 'px;overflow:hidden;direction:ltr"><div style="inline-size:' + W + 'px;block-size:' + H + 'px;transform:scale(' + sc + ');transform-origin:top left;overflow:hidden">' + inner.replace('class="frame"', 'class="frame" style="block-size:' + H + 'px"') + '</div></div></div>';
      });
      var rows = ''; for (var i = 0; i < cells.length; i += per) rows += '<div class="sheet-row">' + cells.slice(i, i + per).join('') + '</div>';
      var def = P.screens[s.ifc + '|' + s.name] || {};
      return '<section class="sheet-page"><h2 style="margin:0 0 8px;font:600 16px sans-serif">' + esc(s.id + '  ' + s.name + (def.ar ? '  /  ' + def.ar : '') + '   (phase ' + s.phase + ', ' + mode + ')') + '</h2>' + rows + '</section>';
    });
    return pages.join('');
  }

  /* ---------- page ---------- */
  function parse() {
    var h = (location.hash || '').slice(1), parts = h.split('?'), q = {};
    (parts[1] || '').split('&').forEach(function (kv) { var a = kv.split('='); if (a[0]) q[a[0]] = decodeURIComponent(a[1] || ''); });
    return { id: parts[0], q: q };
  }
  function render() {
    var p = parse(), q = p.q, root = document.getElementById('app');
    document.body.classList.toggle('cap', !!q.cap);
    var mode = q.mode === 'wire' ? 'wire' : 'hifi', lang = q.lang === 'ar' ? 'ar' : 'en';
    document.documentElement.classList.toggle('wire', mode === 'wire');
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (p.id === 'sheet') { document.body.classList.add('cap'); root.innerHTML = sheet({ ifc: q.ifc, lang: lang, mode: mode, phase: q.phase, skeleton: q.skeleton }); window.__ready = true; return; }
    var inv = P.inventory || [], id = byId[p.id] ? p.id : inv[0].id, scr = byId[id];
    var state = STATES.indexOf(q.state) > -1 ? q.state : 'populated';
    var size = SIZES[q.size] ? q.size : (scr.ifc === 'CON' ? 'm390' : 'w1280');
    var c = { lang: lang, state: state, mode: mode, size: size, cap: !!q.cap };
    var frame = P.renderFrame(id, c).replace('class="frame"', 'class="frame" style="' + (q.cap ? '' : 'max-inline-size:' + SIZES[size] + 'px;') + 'inline-size:' + (q.cap ? '100%' : SIZES[size] + 'px') + '"');
    var tb = '';
    if (!q.cap) {
      var opts = inv.map(function (s) { return '<option value="' + s.id + '"' + (s.id === id ? ' selected' : '') + '>' + s.id + ' ' + esc(s.name) + '</option>'; }).join('');
      var idx = (order[scr.ifc] || []).indexOf(id), prev = order[scr.ifc][idx - 1], next = order[scr.ifc][idx + 1];
      var btn = function (k, v, label) { return '<button data-k="' + k + '" data-v="' + v + '" aria-pressed="' + ((k === 'lang' ? lang : k === 'state' ? state : k === 'mode' ? mode : size) === v) + '">' + label + '</button>'; };
      tb = '<div class="toolbar"><strong>PDFE design prototype</strong><select id="pick" aria-label="Screen">' + opts + '</select>' +
        (prev ? '<a href="' + hash(prev, c) + '">◀</a>' : '') + (next ? '<a href="' + hash(next, c) + '">▶</a>' : '') + '<span class="grow"></span>' +
        btn('lang', 'en', 'EN') + btn('lang', 'ar', 'عربي') + ' ' + STATES.map(function (s) { return btn('state', s, s); }).join('') + ' ' +
        btn('mode', 'hifi', 'hi-fi') + btn('mode', 'wire', 'wireframe') + ' ' + Object.keys(SIZES).filter(function (k) { return scr.sizes.indexOf(k) > -1; }).map(function (k) { return btn('size', k, SIZES[k]); }).join('') + '</div>';
    }
    root.innerHTML = tb + '<div class="stage">' + frame + '</div>';
    window.__ready = true;
    if (!q.cap) {
      document.getElementById('pick').onchange = function (e) { location.hash = hash(e.target.value, c); };
      [].forEach.call(root.querySelectorAll('.toolbar button'), function (b) {
        b.onclick = function () { var o = {}; o[b.dataset.k] = b.dataset.v; location.hash = hash(id, c, o); };
      });
    }
  }
  P.start = function () { indexInventory(); window.addEventListener('hashchange', render); render(); };
  P.states = STATES;
  P.api = { render: render, byId: function () { return byId; } };
})();

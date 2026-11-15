/* Core design data: block constructors, flow builders, datasets, navigation, roles.
   Pairs are [English, Arabic]. Plain strings are language-neutral values (numbers, IDs, currency codes).
   All amounts are static example strings: the prototype never computes money. Arabic text is a DRAFT until reviewed. */
(function () {
  'use strict';
  var P = (window.PDFE = window.PDFE || {});
  P.screens = P.screens || {}; P.ds = P.ds || {}; P.nav = P.nav || {}; P.role = P.role || {};

  var b = (P.b = {
    kpis: function (items, foot) { return { k: 'kpis', items: items, foot: foot }; },
    table: function (ds, o) { return Object.assign({ k: 'table', ds: ds }, o || {}); },
    kv: function (title, rows) { return { k: 'kv', title: title, rows: rows }; },
    form: function (fields, submit, secondary, title) { return { k: 'form', fields: fields, submit: submit, secondary: secondary, title: title }; },
    timeline: function (title, events) { return { k: 'timeline', title: title, events: events }; },
    chart: function (title, type, o) { return Object.assign({ k: 'chart', title: title, type: type }, o || {}); },
    gauge: function (title, value, min, def) { return { k: 'gauge', title: title, value: value, min: min, def: def }; },
    cards: function (title, items) { return { k: 'cards', title: title, items: items }; },
    hero: function (label, value, sub, actions) { return { k: 'hero', label: label, value: value, sub: sub, actions: actions }; },
    qr: function (caption, o) { return Object.assign({ k: 'qr', caption: caption }, o || {}); },
    quote: function (q) { return { k: 'quote', q: q }; },
    receipt: function (status, amount, rows) { return { k: 'receipt', status: status, amount: amount, rows: rows }; },
    maker: function (o) { return Object.assign({ k: 'maker' }, o || {}); },
    book: function () { return { k: 'book' }; },
    text: function (t) { return { k: 'text', t: t }; },
    notice: function (kind, t, title) { return { k: 'notice', kind: kind, t: t, title: title }; },
    actions: function (items) { return { k: 'actions', items: items }; },
    status: function (st, t) { return { k: 'status', st: st, t: t }; },
    tabs: function (items, at) { return { k: 'tabs', items: items, at: at }; }
  });
  P.def = function (ifc, name, ar, blocks, o) { P.screens[ifc + '|' + name] = Object.assign({ ar: ar, blocks: blocks }, o || {}); };

  /* ---- common pairs ---- */
  var SIMNOTE = ['This is a simulation. No real money moves.', 'هذه محاكاة. لا تتحرك أي أموال حقيقية.'];
  var AMOUNT = ['Amount', 'المبلغ'], FEE = ['Fee', 'الرسوم'], TOTAL = ['Total', 'الإجمالي'], NOTE = ['Note (optional)', 'ملاحظة (اختياري)'];
  var CONFIRM = ['Confirm', 'تأكيد'], BACK = ['Back', 'رجوع'], DONE = ['Done', 'تم'], CONTINUE = ['Continue', 'متابعة'], REVIEW = ['Review', 'مراجعة'];
  P.c = { SIMNOTE: SIMNOTE, AMOUNT: AMOUNT, FEE: FEE, TOTAL: TOTAL, NOTE: NOTE, CONFIRM: CONFIRM, BACK: BACK, DONE: DONE, CONTINUE: CONTINUE, REVIEW: REVIEW };

  /* ---- money flow builders: Enter -> Review -> Result ---- */
  // cfg: {ifc, stem, ar:[enter,review,result], enterNames:[...], fields, reviewRows, status, amount, resultRows, goal, extraReview}
  P.enter = function (ifc, name, ar, fields, nextName, o) {
    o = o || {};
    P.def(ifc, name, ar, (o.before || []).concat([b.form(fields, [o.submitLabel || REVIEW, nextName], o.secondary)]), o.opts);
  };
  P.review = function (ifc, name, ar, rows, backName, nextName, o) {
    o = o || {};
    P.def(ifc, name, ar, (o.before || []).concat([b.kv(['Review before you confirm', 'راجع قبل التأكيد'], rows), b.notice('sim', SIMNOTE)]).concat(o.after || []).concat([b.actions([[o.confirmLabel || CONFIRM, nextName, 'primary'], [BACK, backName]])]), o.opts);
  };
  P.result = function (ifc, name, ar, st, amount, rows, nextName, o) {
    o = o || {};
    P.def(ifc, name, ar, [b.receipt(st, amount, rows), b.actions([[o.doneLabel || DONE, nextName, 'primary']])], o.opts);
  };
  P.flow = function (c) { // enter / review / result with standard names
    var s = c.stem, n = c.names || [s + ' – enter', s + ' – review', s + ' – result'];
    P.enter(c.ifc, n[0], c.ar[0], c.fields, n[1], c.enterOpts);
    P.review(c.ifc, n[1], c.ar[1], c.reviewRows, n[0], n[2], { after: c.after, before: c.before, confirmLabel: c.confirmLabel });
    P.result(c.ifc, n[2], c.ar[2], c.status || 'ST-COMPLETED', c.amount, c.resultRows || [], c.goal || 'Home');
  };

  /* ---- pools ---- */
  var POOL = {
    cp: [['Demo Cafe', 'مقهى تجريبي'], ['Demo Market', 'سوق تجريبي'], ['Demo Pharmacy', 'صيدلية تجريبية'], ['Demo Taxi', 'سيارة أجرة تجريبية']],
    cust: [['Demo Customer 1', 'عميل تجريبي 1'], ['Demo Customer 2', 'عميل تجريبي 2'], ['Demo Customer 3', 'عميل تجريبي 3']],
    sup: [['Demo Supplier 1', 'مورّد تجريبي 1'], ['Demo Supplier 2', 'مورّد تجريبي 2'], ['Demo Supplier 3', 'مورّد تجريبي 3']],
    kind: [['Transfer', 'تحويل'], ['Payment', 'دفع'], ['Top-up', 'شحن'], ['Refund', 'استرداد']],
    prio: [['High', 'عالية'], ['Medium', 'متوسطة'], ['Low', 'منخفضة']],
    rule: [['Large transfer', 'تحويل كبير'], ['Rapid repeats', 'تكرار سريع'], ['Synthetic list match', 'تطابق مع قائمة اصطناعية']],
    pair: [['BTC / USD (paper)', 'BTC / USD (ورقي)'], ['ETH / USD (paper)', 'ETH / USD (ورقي)'], ['PSH / ILS (placeholder)', 'PSH / ILS (نائب مؤقت)']],
    side: [['Buy', 'شراء'], ['Sell', 'بيع']],
    acct: [['Customer wallets', 'محافظ العملاء'], ['Settlement clearing', 'حساب تسوية المقاصة'], ['Fee revenue', 'إيرادات الرسوم'], ['FX rounding', 'تقريب صرف العملات']],
    role: [['Individual', 'فرد'], ['Merchant owner', 'مالك تاجر'], ['Compliance analyst', 'محلل امتثال'], ['Auditor', 'مدقق']],
    cfg: [['Transfer limit (placeholder)', 'حد التحويل (نائب مؤقت)'], ['Default fee (placeholder)', 'الرسم الافتراضي (نائب مؤقت)'], ['Quote validity', 'مدة صلاحية العرض']],
    evt: [['Payment completed', 'اكتمل الدفع'], ['Refund created', 'أُنشئ استرداد'], ['Settlement posted', 'تم ترحيل التسوية']],
    act: [['Viewed record', 'عرض سجل'], ['Approved change', 'اعتماد تغيير'], ['Exported report', 'تصدير تقرير']],
    state: [['Active', 'نشط'], ['Draft', 'مسودة'], ['Approved', 'معتمد']],
    q: [['Remittance queue', 'طابور التحويلات'], ['Settlement queue', 'طابور التسويات'], ['Review queue', 'طابور المراجعة']],
    partner: [['Mock bank', 'بنك وهمي'], ['Mock payout partner', 'شريك دفع وهمي'], ['Mock FX provider', 'مزوّد صرف وهمي']],
    event: [['payment.completed', 'payment.completed'], ['refund.created', 'refund.created'], ['invoice.paid', 'invoice.paid']],
    asset: [['BTC (paper)', 'BTC (ورقي)'], ['ETH (paper)', 'ETH (ورقي)'], ['ILS', 'شيكل']],
    ccy: [['ILS', 'ILS'], ['USD', 'USD'], ['JOD', 'JOD'], ['EUR', 'EUR']],
    partnerx: [['Demo Partner Bank', 'بنك شريك تجريبي'], ['Demo Education Fund', 'صندوق تعليم تجريبي']]
  };
  P.POOL = POOL;

  /* ---- datasets (cols: [en, ar, type, pool|currency]) ---- */
  var D = function (key, prefix, cols, o) { P.ds[key] = Object.assign({ prefix: prefix, cols: cols }, o || {}); };
  var REF = ['Reference', 'المرجع', 'id'], DATE = ['Date', 'التاريخ', 'date'], AMT = ['Amount', 'المبلغ', 'money'], STAT = ['Status', 'الحالة', 'status'];
  D('txns', 'TX-', [REF, DATE, ['Counterparty', 'الطرف المقابل', 'text', POOL.cp], AMT, STAT]);
  D('statements', 'STM-', [['Statement', 'الكشف', 'id'], ['Month', 'الشهر', 'date'], ['Language', 'اللغة', 'text', [['English', 'إنجليزية'], ['Arabic', 'عربية']]], ['Closing balance', 'الرصيد الختامي', 'money']], { st: ['ST-COMPLETED'] });
  D('notifications', 'NT-', [['When', 'متى', 'date'], ['Message', 'الرسالة', 'text', [['Transfer completed', 'اكتمل التحويل'], ['Payment received', 'تم استلام دفعة'], ['Statement ready', 'الكشف جاهز']]], STAT]);
  D('payments', 'PAY-', [REF, DATE, ['Payer', 'الدافع', 'user'], AMT, STAT]);
  D('refunds', 'RF-', [REF, ['Original payment', 'الدفعة الأصلية', 'id'], AMT, STAT], { st: ['ST-COMPLETED', 'ST-PENDING'] });
  D('settlements', 'SB-', [['Batch', 'الدفعة', 'id'], DATE, ['Items', 'العناصر', 'num'], AMT, STAT], { st: ['ST-COMPLETED', 'ST-FAILED', 'ST-PENDING'] });
  D('settleItems', 'SI-', [['Item', 'العنصر', 'id'], ['Payment', 'الدفعة', 'id'], AMT, STAT], { st: ['ST-COMPLETED', 'ST-FAILED', 'ST-COMPLETED'] });
  D('staff', 'USR-', [['Member', 'العضو', 'user'], ['Role', 'الدور', 'text', [['Owner', 'مالك'], ['Cashier', 'كاشير']]], ['Refund limit', 'حد الاسترداد', 'money'], STAT], { st: ['ST-COMPLETED'] });
  D('invoices', 'INV-', [['Invoice', 'الفاتورة', 'id'], ['Customer', 'العميل', 'text', POOL.cust], ['Due', 'مستحقة', 'date'], AMT, STAT], { st: ['ST-COMPLETED', 'ST-PENDING', 'ST-FAILED', 'ST-PENDING'] });
  D('customers', 'CU-', [['Customer', 'العميل', 'text', POOL.cust], ['Open invoices', 'فواتير مفتوحة', 'num'], ['Balance due', 'الرصيد المستحق', 'money']]);
  D('suppliers', 'SU-', [['Supplier', 'المورّد', 'text', POOL.sup], ['Mock bank account', 'حساب بنكي وهمي', 'id'], ['Last payout', 'آخر دفعة', 'date']]);
  D('payouts', 'PO-', [['Request', 'الطلب', 'id'], ['Supplier', 'المورّد', 'text', POOL.sup], AMT, ['Requested by', 'مقدّم الطلب', 'user'], STAT], { st: ['ST-PENDING', 'ST-COMPLETED', 'ST-FAILED'] });
  D('bankrecon', 'BS-', [['Statement line', 'بند الكشف', 'id'], DATE, AMT, ['Match', 'المطابقة', 'text', [['Matched', 'مطابق'], ['Unmatched', 'غير مطابق']]]]);
  D('reports', 'RP-', [['Report', 'التقرير', 'text', [['Receivables', 'الذمم المدينة'], ['Payables', 'الذمم الدائنة'], ['Payouts', 'الدفعات']]], ['Format', 'الصيغة', 'text', [['CSV', 'CSV'], ['PDF', 'PDF']]], DATE]);
  D('team', 'TM-', [['Member', 'العضو', 'user'], ['Role', 'الدور', 'text', [['Preparer', 'مُعدّ'], ['Approver', 'معتمد']]], ['Approval limit', 'حد الموافقة', 'money']]);
  D('apikeys', 'KEY-', [['Key', 'المفتاح', 'id'], ['Scope', 'النطاق', 'text', [['Demo sandbox', 'محاكاة تجريبية']]], ['Created', 'أُنشئ', 'date']]);
  D('queues', 'Q-', [['Queue', 'الطابور', 'text', POOL.q], ['Items', 'العناصر', 'num'], ['Oldest', 'الأقدم', 'date']]);
  D('explorer', 'TX-', [REF, ['Correlation', 'المرجع المترابط', 'id'], ['Type', 'النوع', 'text', POOL.kind], AMT, STAT]);
  D('partners', 'PT-', [['Partner', 'الشريك', 'text', POOL.partner], ['State', 'الحالة', 'text', [['Normal', 'طبيعي'], ['Rejecting', 'يرفض']]], ['Injected', 'الحقن', 'text', [['None', 'لا شيء'], ['Payout failure', 'فشل الدفع']]]]);
  D('reconruns', 'RR-', [['Run', 'التشغيل', 'id'], DATE, ['Matched', 'مطابق', 'num'], ['Unmatched', 'غير مطابق', 'num'], STAT], { st: ['ST-COMPLETED', 'ST-UNDER-REVIEW'] });
  D('reconex', 'EX-', [['Exception', 'الاستثناء', 'id'], ['Type', 'النوع', 'text', [['Amount difference', 'فرق مبلغ'], ['Missing entry', 'قيد مفقود']]], AMT, STAT], { st: ['ST-UNDER-REVIEW', 'ST-PENDING'] });
  D('corridors', 'CR-', [['Corridor', 'الممر', 'text', [['USD to ILS', 'دولار إلى شيكل'], ['EUR to ILS', 'يورو إلى شيكل'], ['JOD to ILS', 'دينار أردني إلى شيكل']]], ['Rate (illustrative)', 'السعر (توضيحي)', 'money', 'ILS'], ['Spread', 'الفارق', 'pct']]);
  D('markets', 'MK-', [['Pair', 'الزوج', 'text', POOL.pair], ['Last price (simulated)', 'آخر سعر (محاكاة)', 'money', 'USD'], ['24h change', 'التغير خلال 24 ساعة', 'pct'], ['Price time', 'وقت السعر', 'date']]);
  D('orders', 'ORD-', [['Order', 'الأمر', 'id'], ['Pair', 'الزوج', 'text', POOL.pair], ['Side', 'الجهة', 'text', POOL.side], ['Price', 'السعر', 'money', 'USD'], STAT], { st: ['ST-PENDING', 'ST-HELD'] });
  D('trades', 'TR-', [['Trade', 'الصفقة', 'id'], ['Pair', 'الزوج', 'text', POOL.pair], ['Side', 'الجهة', 'text', POOL.side], ['Price', 'السعر', 'money', 'USD'], DATE], { st: ['ST-COMPLETED'] });
  D('portfolio', 'PF-', [['Asset', 'الأصل', 'text', POOL.asset], ['Paper balance', 'الرصيد الورقي', 'money', 'USD'], ['Paper P&L', 'الربح والخسارة الورقية', 'pct']]);
  D('partnerslist', 'PL-', [['Partner', 'الشريك', 'text', POOL.partnerx], ['Offer', 'العرض', 'text', [['Savings information (demo)', 'معلومات ادخار (تجريبي)'], ['Learning material (demo)', 'مادة تعليمية (تجريبي)']]]]);
  D('onboarding', 'OB-', [['Application', 'الطلب', 'id'], ['Type', 'النوع', 'text', [['Individual', 'فرد'], ['Business', 'شركة']]], ['Submitted', 'تم التقديم', 'date'], STAT], { st: ['ST-UNDER-REVIEW', 'ST-PENDING', 'ST-COMPLETED'] });
  D('alerts', 'AL-', [['Alert', 'التنبيه', 'id'], ['Rule', 'القاعدة', 'text', POOL.rule], ['Score', 'الدرجة', 'num'], STAT], { st: ['ST-HELD', 'ST-UNDER-REVIEW', 'ST-COMPLETED'] });
  D('cases', 'CS-', [['Case', 'الحالة', 'id'], ['Priority', 'الأولوية', 'text', POOL.prio], ['Opened', 'تاريخ الفتح', 'date'], STAT], { st: ['ST-UNDER-REVIEW', 'ST-HELD', 'ST-COMPLETED'] });
  D('rules', 'RL-', [['Rule', 'القاعدة', 'text', POOL.rule], ['Threshold (placeholder)', 'الحد (نائب مؤقت)', 'money'], ['Version', 'الإصدار', 'num'], ['State', 'الحالة', 'text', POOL.state]]);
  D('audit', 'AU-', [['Time', 'الوقت', 'date'], ['Actor', 'المنفّذ', 'user'], ['Action', 'الإجراء', 'text', POOL.act], ['Object', 'الكائن', 'id'], ['Correlation', 'المرجع المترابط', 'id']]);
  D('users', 'USR-', [['User', 'المستخدم', 'user'], ['Role', 'الدور', 'text', POOL.role], ['MFA', 'التحقق بخطوتين', 'text', [['On', 'مفعّل'], ['Not required', 'غير مطلوب']]], STAT], { st: ['ST-COMPLETED'] });
  D('roles', 'RO-', [['Role', 'الدور', 'text', POOL.role], ['Permissions', 'الصلاحيات', 'num'], ['Conflicts with', 'يتعارض مع', 'text', [['None', 'لا شيء'], ['Approver roles', 'أدوار الاعتماد']]]]);
  D('config', 'CF-', [['Setting', 'الإعداد', 'text', POOL.cfg], ['Value', 'القيمة', 'money'], ['Version', 'الإصدار', 'num'], ['State', 'الحالة', 'text', POOL.state]]);
  D('flags', 'FF-', [['Flag', 'الميزة', 'text', [['Paper trading', 'التداول الورقي'], ['Remittance corridors', 'ممرات التحويل']]], ['State', 'الحالة', 'text', [['On', 'مفعّل'], ['Off', 'معطّل']]], ['Locked', 'مقفل', 'text', [['No', 'لا'], ['Safety-locked', 'مقفل للأمان']]]]);
  D('tenants', 'TN-', [['Tenant', 'المستأجر', 'text', [['Demo A', 'تجريبي أ'], ['Demo B', 'تجريبي ب']]], ['Users', 'المستخدمون', 'num'], STAT], { st: ['ST-COMPLETED'] });
  D('accounts', '', [['Code', 'الرمز', 'id'], ['Account', 'الحساب', 'text', POOL.acct], ['Currency', 'العملة', 'text', POOL.ccy], ['Posted balance', 'الرصيد المرحّل', 'money']]);
  D('ledgerlines', 'JL-', [['Line', 'البند', 'id'], ['Account', 'الحساب', 'text', POOL.acct], ['Debit', 'مدين', 'money'], ['Credit', 'دائن', 'money'], ['Running balance', 'الرصيد الجاري', 'money']]);
  D('journals', 'JNL-', [['Journal', 'القيد', 'id'], DATE, ['Type', 'النوع', 'text', POOL.kind], AMT, ['Balanced', 'متوازن', 'text', [['Yes', 'نعم']]]]);
  D('trial', '', [['Entity / currency', 'الكيان / العملة', 'text', [['Entity 1 / ILS', 'الكيان 1 / ILS'], ['Entity 1 / USD', 'الكيان 1 / USD']]], ['Debits', 'المدين', 'money'], ['Credits', 'الدائن', 'money'], ['Balanced', 'متوازن', 'text', [['Yes', 'نعم']]]]);
  D('fxpos', '', [['Currency pair', 'زوج العملات', 'text', [['USD / ILS', 'USD / ILS'], ['EUR / ILS', 'EUR / ILS']]], ['Position', 'المركز', 'money', 'USD'], ['Rate (illustrative)', 'السعر (توضيحي)', 'money', 'ILS']]);
  D('fundreq', 'FR-', [['Request', 'الطلب', 'id'], AMT, ['Requested by', 'مقدّم الطلب', 'user'], STAT], { st: ['ST-PENDING', 'ST-COMPLETED'] });
  D('pshreserves', 'RS-', [['Reserve account', 'حساب الاحتياطي', 'text', [['Reserve A (simulated)', 'احتياطي أ (محاكاة)']]], ['Balance', 'الرصيد', 'money'], ['Snapshot', 'اللقطة', 'date']]);
  D('pshevents', '', [['Fake transaction ID', 'معرّف المعاملة الوهمي', 'id'], ['Event', 'الحدث', 'text', [['Mint (SIMULATED CHAIN EVENT)', 'إصدار (حدث سلسلة محاكاة)'], ['Burn (SIMULATED CHAIN EVENT)', 'حرق (حدث سلسلة محاكاة)']]], AMT, DATE], { prefix: 'SIMTX-' });
  D('pshredemptions', 'RD-', [['Request', 'الطلب', 'id'], ['Holder', 'الحامل', 'user'], AMT, STAT], { st: ['ST-PENDING', 'ST-COMPLETED'] });
  D('pshrecon', 'PR-', [['Check', 'الفحص', 'text', [['Supply equals liability subledger', 'المعروض يساوي دفتر الالتزامات'], ['Reserves cover liabilities', 'الاحتياطيات تغطي الالتزامات']]], ['Result', 'النتيجة', 'text', [['Match', 'مطابق']]], DATE]);
  D('psh', 'PH-', [['Holder', 'الحامل', 'user'], ['PSH balance', 'رصيد PSH', 'money', 'PSH'], ['Updated', 'محدّث', 'date']]);
  D('webhooks', 'WH-', [['Delivery', 'التسليم', 'id'], ['Event', 'الحدث', 'text', POOL.event], ['Attempts', 'المحاولات', 'num'], STAT], { st: ['ST-COMPLETED', 'ST-FAILED', 'ST-PENDING'] });
  D('endpoints', '', [['Method', 'الطريقة', 'text', [['GET', 'GET'], ['POST', 'POST']]], ['Path', 'المسار', 'text', [['/v1/payments', '/v1/payments'], ['/v1/refunds', '/v1/refunds'], ['/v1/invoices', '/v1/invoices']]], ['Purpose', 'الغرض', 'text', [['Create or read (demo)', 'إنشاء أو قراءة (تجريبي)']]]]);
  D('scenarios', 'SC-', [['Scenario', 'السيناريو', 'text', [['Consumer transfer (J1)', 'تحويل المستهلك (J1)'], ['Merchant payment (J2)', 'دفع التاجر (J2)'], ['Remittance (J3)', 'تحويل دولي (J3)']]], ['Seed', 'البذرة', 'num'], ['Last run', 'آخر تشغيل', 'date']]);
  D('health', '', [['Component', 'المكوّن', 'text', [['Ledger', 'الدفتر'], ['Mock adapters', 'المحوّلات الوهمية'], ['Outbound network (denied)', 'الشبكة الخارجية (محظورة)']]], ['State', 'الحالة', 'text', [['Healthy', 'سليم']]], ['Checked', 'تم الفحص', 'date']]);
  D('controls', '', [['Control', 'الضابط', 'text', [['No live connections allowed', 'لا اتصالات حية مسموحة'], ['Ledger entries cannot be changed', 'لا يمكن تغيير قيود الدفتر'], ['Approvals need two people', 'الموافقات تحتاج شخصين']]], ['Where shown', 'أين يظهر', 'text', [['Every screen', 'كل الشاشات']]]]);
  D('lines', '', [['Item', 'البند', 'text', [['Consulting (demo)', 'استشارات (تجريبي)'], ['Supplies (demo)', 'لوازم (تجريبي)']]], ['Quantity', 'الكمية', 'num'], AMT]);

  /* ---- navigation and roles ---- */
  var A = function (en, ar, to, icon) { return [en, ar, to, icon]; };
  P.nav.CON = [A('Home', 'الرئيسية', 'Home', 'home'), A('Activity', 'النشاط', 'Activity list', 'chart'), A('Pay/Scan', 'دفع/مسح', 'Scan QR', 'scan'), A('Send', 'إرسال', 'Send – recipient', 'send'), A('Markets', 'الأسواق', 'Markets', 'chart'), A('Statements', 'الكشوف', 'Statements', 'inbox'), A('Send abroad', 'إرسال للخارج', 'Send abroad – enter', 'send'), A('PSH', 'PSH', 'PSH – overview', 'info'), A('Merchant mode', 'وضع التاجر', 'Merchant mode – Charge', 'scan'), A('Approvals', 'الموافقات', 'Business approvals inbox', 'inbox'), A('Explore partners', 'استكشاف الشركاء', 'Explore partners', 'info'), A('Profile', 'الملف', 'Profile', 'user')];
  P.nav.MER = [A('Dashboard', 'لوحة التحكم', 'Dashboard', 'home'), A('Payments', 'المدفوعات', 'Payments', 'chart'), A('Refunds', 'المرتجعات', 'Refunds', 'undo'), A('Settlements', 'التسويات', 'Settlements', 'inbox'), A('Staff', 'الموظفون', 'Staff', 'user'), A('Statements', 'الكشوف', 'Statements', 'inbox'), A('Invoices', 'الفواتير', 'Invoices', 'inbox')];
  P.nav.BIZ = [A('Dashboard', 'لوحة التحكم', 'Dashboard', 'home'), A('Invoices', 'الفواتير', 'Invoices list', 'inbox'), A('Customers', 'العملاء', 'Customers', 'user'), A('Suppliers', 'المورّدون', 'Suppliers', 'user'), A('Payouts', 'الدفعات', 'Payouts', 'send'), A('Approvals', 'الموافقات', 'Approval inbox', 'check-circle'), A('Bank reconciliation', 'تسوية البنك', 'Bank reconciliation', 'search-check'), A('Reports', 'التقارير', 'Reports and exports', 'chart'), A('Team and limits', 'الفريق والحدود', 'Team and limits', 'user'), A('API keys', 'مفاتيح API', 'API keys', 'lock')];
  P.nav.OPS = [A('Home', 'الرئيسية', 'OPS|Home', 'home'), A('Transaction explorer', 'مستكشف المعاملات', 'OPS|Transaction explorer', 'search-check'), A('Queues', 'الطوابير', 'OPS|Queues', 'inbox'), A('Settlements', 'التسويات', 'OPS|Settlements overview', 'inbox'), A('Partner simulator', 'محاكي الشركاء', 'OPS|Partner simulator', 'send'), A('Scenarios', 'السيناريوهات', 'OPS|Scenario controller', 'chart'), A('Reconciliation', 'التسوية', 'OPS|Reconciliation runs', 'search-check'), A('Market controls', 'ضوابط السوق', 'OPS|Market controls', 'chart'), A('Users', 'المستخدمون', 'ADM|Users', 'user'), A('Roles', 'الأدوار', 'ADM|Roles', 'lock'), A('Configuration', 'الإعدادات', 'ADM|Config list', 'info'), A('Feature flags', 'الميزات', 'ADM|Feature flags', 'info'), A('Tenants', 'المستأجرون', 'ADM|Tenants', 'user')];
  P.nav.ADM = P.nav.OPS;
  P.nav.CMP = [A('Onboarding queue', 'طابور التسجيل', 'Onboarding queue', 'inbox'), A('Alerts', 'التنبيهات', 'Alerts list', 'alert'), A('Cases', 'الحالات', 'Cases list', 'search-check'), A('Rules', 'القواعد', 'Rules list', 'info'), A('Reports', 'التقارير', 'Reports center', 'chart'), A('Audit search', 'البحث في التدقيق', 'Audit search', 'lock')];
  P.nav.FIN = [A('Accounts', 'الحسابات', 'Accounts', 'inbox'), A('Journals', 'القيود', 'Journals', 'inbox'), A('Trial balance', 'ميزان المراجعة', 'Trial balance', 'chart'), A('General ledger', 'دفتر الأستاذ', 'General ledger browser', 'inbox'), A('Funding request', 'طلب تمويل', 'Funding request – enter', 'plus'), A('Approvals', 'الموافقات', 'Approvals inbox', 'check-circle'), A('FX position', 'مركز الصرف', 'FX position', 'chart'), A('Close dashboard', 'لوحة الإقفال', 'Close dashboard', 'home'), A('PSH program', 'برنامج PSH', 'PSH program', 'info')];
  P.nav.INV = [A('Landing', 'الصفحة الرئيسية', 'Landing', 'home'), A('Guided scenarios', 'سيناريوهات موجّهة', 'Guided scenarios', 'chart'), A('KPIs', 'المؤشرات', 'KPIs', 'chart'), A('Controls and architecture', 'الضوابط والبنية', 'Controls and architecture', 'lock'), A('System health', 'صحة النظام', 'System health', 'check-circle'), A('About the simulation', 'حول المحاكاة', 'About the simulation', 'info')];
  P.nav.DEV = [A('Getting started', 'البدء', 'Getting started', 'home'), A('Auth', 'المصادقة', 'Auth', 'lock'), A('API reference', 'مرجع API', 'API reference', 'inbox'), A('Webhook catalog', 'كتالوج الويب هوك', 'Webhook catalog', 'inbox'), A('Delivery explorer', 'مستكشف التسليم', 'Delivery explorer', 'search-check'), A('Sandbox', 'المحاكاة', 'Sandbox', 'scan')];
  P.role.CON = ['Individual', 'فرد']; P.role.MER = ['Merchant owner', 'مالك تاجر']; P.role.BIZ = ['Business approver', 'معتمد الأعمال'];
  P.role.OPS = ['Operations analyst', 'محلل العمليات']; P.role.ADM = ['Platform admin', 'مسؤول المنصة']; P.role.CMP = ['Compliance analyst', 'محلل الامتثال'];
  P.role.FIN = ['Finance analyst', 'محلل المالية']; P.role.INV = ['Demo viewer', 'مشاهد العرض']; P.role.DEV = ['Developer', 'مطوّر'];
})();

/* Finance (FIN), investor (INV) and developer portal (DEV) screens. Pairs are [English, Arabic]; Arabic is a draft pending review. */
(function () {
  'use strict';
  var P = window.PDFE, b = P.b, c = P.c, D = P.def, ILS = 'ILS';
  var PSHN = ['PSH is a placeholder for a proposed instrument. Simulation only. It is not approved and cannot be redeemed.', 'PSH نائب مؤقت لأداة مقترحة. محاكاة فقط. وهي غير معتمدة ولا يمكن استردادها.'];

  /* ================= FIN ================= */
  var F = 'FIN';
  D(F, 'App shell', 'هيكل وحدة المالية', [b.cards(['Finance and treasury console', 'وحدة المالية والخزينة'], [[['Accounts', 'الحسابات'], '', ['Balances and journals', 'الأرصدة والقيود'], 'Accounts'], [['Trial balance', 'ميزان المراجعة'], '', ['Must always balance', 'يجب أن يتوازن دائمًا'], 'Trial balance'], [['Approvals', 'الموافقات'], '', ['Funding approvals', 'موافقات التمويل'], 'Approvals inbox']])]);
  D(F, 'Accounts', 'الحسابات', [b.table('accounts', { filters: [['Currency', 'العملة']], to: 'Account detail' })]);
  D(F, 'Account detail', 'تفاصيل الحساب', [b.kv(['Balances', 'الأرصدة'], [[['Posted', 'المرحّل'], '1,250.00 ILS', 1], [['Pending', 'المعلّق'], '0.00 ILS'], [['Held', 'المحجوز'], '50.00 ILS'], [['Available', 'المتاح'], '1,200.00 ILS']]), b.table('ledgerlines', { title: ['Lines with running balance', 'البنود مع الرصيد الجاري'], tools: false, to: 'Journal detail' })]);
  D(F, 'Journals', 'القيود', [b.table('journals', { filters: [['Type', 'النوع']], to: 'Journal detail', n: 5 })]);
  D(F, 'Journal detail', 'تفاصيل القيد', [b.kv(['Journal', 'القيد'], [[['Type', 'النوع'], ['Transfer', 'تحويل']], [['Linked transaction', 'المعاملة المرتبطة'], 'TX-1007'], [['Reversal of', 'عكس للقيد'], '—'], [['Balanced', 'متوازن'], ['Yes', 'نعم']]]), b.table('ledgerlines', { title: ['Lines', 'البنود'], tools: false, n: 2 })]);
  D(F, 'Trial balance', 'ميزان المراجعة', [b.status('ST-COMPLETED', ['Balanced: debits equal credits for every entity and currency.', 'متوازن: المدين يساوي الدائن لكل كيان وعملة.']), b.table('trial', { tools: false, n: 2 })]);
  D(F, 'General ledger browser', 'متصفح دفتر الأستاذ', [b.table('ledgerlines', { filters: [['Account', 'الحساب'], ['Date', 'التاريخ']], n: 5 })]);
  P.flow({ ifc: F, stem: 'Funding request', ar: ['طلب تمويل – إدخال', 'طلب تمويل – مراجعة', 'طلب تمويل – النتيجة'], before: [b.notice('sim', ['Manual synthetic funding. It needs a second approver.', 'تمويل اصطناعي يدوي. يتطلب موافقًا ثانيًا.'])],
    fields: [[['Account', 'الحساب'], 'select', ['Customer wallets', 'محافظ العملاء']], [['Amount', 'المبلغ'], 'money', '10,000.00', null, ILS], [['Reason', 'السبب'], 'textarea', ['Demo funding', 'تمويل تجريبي']]],
    reviewRows: [[['Account', 'الحساب'], ['Customer wallets', 'محافظ العملاء']], [['Amount', 'المبلغ'], '10,000.00 ILS', 1], [['Approval', 'الموافقة'], ['Required from a different person', 'مطلوبة من شخص مختلف']]], status: 'ST-PENDING', amount: '10,000.00 ILS', goal: 'Approvals inbox' });
  D(F, 'Approvals inbox', 'صندوق الموافقات', [b.table('fundreq', { filters: [['Status', 'الحالة']] }), b.maker({ title: ['Approve funding', 'الموافقة على التمويل'] })], { empty: [['Nothing to approve', 'لا شيء للموافقة عليه'], ['New requests will appear here.', 'ستظهر هنا الطلبات الجديدة.']] });
  D(F, 'FX position', 'مركز الصرف', [b.table('fxpos', { tools: false, n: 2 }), b.notice('info', ['Rates are illustrative. Each currency leg is balanced separately.', 'الأسعار توضيحية. يُوازَن كل طرف عملة على حدة.'])]);
  D(F, 'Close dashboard', 'لوحة الإقفال', [b.kpis([[['Reconciliation runs complete', 'دورات التسوية المكتملة'], '5 / 5'], [['Open exceptions', 'الاستثناءات المفتوحة'], '2'], [['Trial balance', 'ميزان المراجعة'], ['Balanced', 'متوازن']]], ['Definition: end-of-day simulated close. Denominator: all scheduled runs.', 'التعريف: إقفال يومي محاكى. المقام: كل الدورات المجدولة.']), b.table('reconruns', { tools: false, n: 3 })]);
  D(F, 'PSH program', 'برنامج PSH', [b.notice('sim', PSHN, ['Placeholder', 'نائب مؤقت']), b.status('ST-COMPLETED', ['Program status: ACTIVE', 'حالة البرنامج: نشط']), b.kpis([[['Supply', 'المعروض'], '1,000.00 PSH'], [['Liability', 'الالتزام'], '1,000.00 ILS'], [['Reserves', 'الاحتياطيات'], '1,120.00 ILS']]), b.gauge(['Reserve coverage', 'تغطية الاحتياطي'], '112%', '100%'), b.maker({ title: ['Halt or resume program', 'إيقاف البرنامج أو استئنافه'] })]);
  D(F, 'PSH reserves', 'احتياطيات PSH', [b.notice('sim', PSHN), b.table('pshreserves', { tools: false, n: 2 })]);
  P.flow({ ifc: F, stem: 'PSH issuance', ar: ['إصدار PSH – إدخال', 'إصدار PSH – مراجعة', 'إصدار PSH – النتيجة'], before: [b.notice('sim', PSHN)],
    fields: [[['Amount', 'المبلغ'], 'money', '500.00', null, 'PSH'], [['Target holders', 'الحاملون المستهدفون'], 'select', ['Demo holder group', 'مجموعة حاملين تجريبية']], [['Reason', 'السبب'], 'textarea', ['Demo issuance', 'إصدار تجريبي']]],
    reviewRows: [[['Amount', 'المبلغ'], '500.00 PSH', 1], [['Coverage after issuance', 'التغطية بعد الإصدار'], '112%'], [['Approvers needed', 'الموافقون المطلوبون'], ['Two different people', 'شخصان مختلفان']]],
    after: [b.maker({ title: ['Dual approval', 'موافقة مزدوجة'], conflict: true }), b.notice('danger', ['If coverage is below the minimum, issuance is blocked.', 'إذا كانت التغطية دون الحد الأدنى يُمنع الإصدار.'])], status: 'ST-PENDING', amount: '500.00 PSH', goal: 'PSH program' });
  D(F, 'PSH redemptions', 'استردادات PSH', [b.notice('sim', PSHN), b.table('pshredemptions', { filters: [['Status', 'الحالة']] })]);
  D(F, 'PSH events', 'أحداث PSH', [b.notice('sim', ['Fake transaction IDs. Every row is a SIMULATED CHAIN EVENT.', 'معرّفات معاملات وهمية. كل صف هو حدث سلسلة محاكى.']), b.table('pshevents', { filters: [['Event', 'الحدث']] })]);
  D(F, 'PSH reconciliation', 'تسوية PSH', [b.notice('sim', PSHN), b.table('pshrecon', { tools: false, n: 2 })]);

  /* ================= INV ================= */
  var V = 'INV';
  var INVN = ['This dashboard shows modeled, simulated figures. They are not results from real customers or markets.', 'تعرض هذه اللوحة أرقامًا نمذجة ومحاكاة. وليست نتائج من عملاء أو أسواق حقيقية.'];
  D(V, 'App shell', 'هيكل لوحة المستثمر', [b.notice('sim', INVN), b.cards(['Investor demo dashboard', 'لوحة المستثمر التوضيحية'], [[['Guided scenarios', 'سيناريوهات موجهة'], '', null, 'Guided scenarios'], [['KPIs', 'المؤشرات'], '', null, 'KPIs'], [['Controls', 'الضوابط'], '', null, 'Controls and architecture']])]);
  D(V, 'Landing', 'الصفحة الرئيسية', [b.hero(['PDFE demonstration', 'عرض PDFE التوضيحي'], 'Simulation', ['Pretend money, pretend people, real controls.', 'أموال وهمية وأشخاص وهميون وضوابط حقيقية.'], [[['Start a guided scenario', 'ابدأ سيناريو موجهًا'], 'Guided scenarios', 'primary'], [['See KPIs', 'عرض المؤشرات'], 'KPIs']]), b.notice('sim', INVN)]);
  D(V, 'Guided scenarios', 'سيناريوهات موجهة', [b.table('scenarios', { tools: false, n: 3 }), b.actions([[['Start', 'ابدأ'], 'KPIs', 'primary']])]);
  D(V, 'KPIs', 'المؤشرات', [b.kpis([[['Registered users', 'المستخدمون المسجلون'], '1,240', ['Definition: synthetic accounts created', 'التعريف: حسابات اصطناعية منشأة']], [['Payments', 'المدفوعات'], '8,310'], [['Failed transaction rate', 'معدل المعاملات الفاشلة'], '1.4%'], [['Supply / reserve coverage', 'تغطية المعروض والاحتياطي'], '112%']]), b.chart(['Payments per day', 'المدفوعات يوميًا'], 'line')]);
  D(V, 'Controls and architecture', 'الضوابط والبنية', [b.table('controls', { tools: false }), b.notice('info', ['Live connections are blocked. Unknown adapters stop the system from starting.', 'الاتصالات الحية محظورة. المحوّلات غير المعروفة تمنع تشغيل النظام.'])]);
  D(V, 'System health', 'صحة النظام', [b.table('health', { tools: false, n: 3 })]);
  D(V, 'About the simulation', 'حول المحاكاة', [b.notice('sim', ['PDFE is a demonstration platform. Nothing here is a real financial service.', 'PDFE منصة عرض توضيحي. لا شيء هنا خدمة مالية حقيقية.'], ['What this is', 'ما هذا']), b.text(['All customers, banks, balances, prices and events are synthetic. Figures are illustrative and configurable.', 'كل العملاء والبنوك والأرصدة والأسعار والأحداث اصطناعية. الأرقام توضيحية وقابلة للضبط.']), b.text(PSHN)]);

  /* ================= DEV ================= */
  var X = 'DEV';
  var SB = ['The sandbox uses demo keys and synthetic data only.', 'تستخدم بيئة المحاكاة مفاتيح تجريبية وبيانات اصطناعية فقط.'];
  D(X, 'App shell', 'هيكل بوابة المطورين', [b.cards(['Developer portal', 'بوابة المطورين'], [[['Getting started', 'البدء'], '', null, 'Getting started'], [['API reference', 'مرجع API'], '', null, 'API reference'], [['Sandbox', 'بيئة المحاكاة'], '', null, 'Sandbox']])]);
  D(X, 'Getting started', 'البدء', [b.notice('sim', SB), b.text(['1. Get a demo key. 2. Call the sandbox API. 3. Watch the webhook deliveries.', '1. احصل على مفتاح تجريبي. 2. استدعِ واجهة بيئة المحاكاة. 3. تابع تسليمات الويب هوك.']), b.actions([[['Open the sandbox', 'افتح بيئة المحاكاة'], 'Sandbox', 'primary']])]);
  D(X, 'Auth', 'المصادقة', [b.notice('sim', SB), b.kv(['Using a demo key', 'استخدام مفتاح تجريبي'], [[['Header', 'الترويسة'], 'Authorization: Bearer demo-key'], [['Scope', 'النطاق'], ['Demo sandbox only', 'بيئة المحاكاة التجريبية فقط']]])]);
  D(X, 'API reference', 'مرجع API', [b.table('endpoints', { tools: false }), b.text(['Each endpoint lists sample requests and responses with synthetic data.', 'يعرض كل مسار أمثلة للطلبات والاستجابات ببيانات اصطناعية.'])]);
  D(X, 'Webhook catalog', 'كتالوج الويب هوك', [b.table('webhooks', { tools: false })]);
  D(X, 'Delivery explorer', 'مستكشف التسليم', [b.table('webhooks', { filters: [['Status', 'الحالة'], ['Event', 'الحدث']] }), b.actions([[['Replay', 'إعادة الإرسال'], 'Delivery explorer', 'primary']])]);
  D(X, 'Sandbox', 'بيئة المحاكاة', [b.notice('sim', SB), b.form([[['Method', 'الطريقة'], 'select', 'POST'], [['Path', 'المسار'], 'text', '/v1/payments'], [['Body', 'المحتوى'], 'textarea', '{ "amount": "18.25", "currency": "ILS" }']], [['Send request', 'إرسال الطلب'], 'Sandbox'])]);
})();

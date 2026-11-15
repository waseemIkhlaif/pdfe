/* Operations (OPS), compliance (CMP) and admin (ADM) screens. Pairs are [English, Arabic]; Arabic is a draft pending review. */
(function () {
  'use strict';
  var P = window.PDFE, b = P.b, D = P.def;
  var SYN = ['Synthetic screening. This is not a real compliance check.', 'فحص تجريبي. هذا ليس فحص امتثال حقيقي.'];

  /* ================= OPS ================= */
  var O = 'OPS';
  D(O, 'App shell', 'هيكل وحدة العمليات', [b.cards(['Operations console', 'وحدة العمليات'], [[['Home', 'الرئيسية'], '', ['Queues and aging', 'الطوابير والتقادم'], 'Home'], [['Transaction explorer', 'مستكشف المعاملات'], '', ['Search and trace', 'بحث وتتبّع'], 'Transaction explorer'], [['Scenario controller', 'متحكم السيناريو'], '', ['Run demo scenarios', 'تشغيل سيناريوهات العرض'], 'Scenario controller']])]);
  D(O, 'Scenario controller', 'متحكم السيناريو', [
    b.notice('sim', ['Scenarios use synthetic data only and run with a fixed seed.', 'تستخدم السيناريوهات بيانات اصطناعية فقط وتعمل ببذرة ثابتة.']),
    b.table('scenarios', { tools: false, n: 3 }), b.form([[['Scenario', 'السيناريو'], 'select', ['Consumer transfer (J1)', 'تحويل المستهلك (J1)']], [['Seed', 'البذرة'], 'text', '42']], [['Run scenario', 'تشغيل السيناريو'], 'Scenario controller'], [['Reset data', 'إعادة ضبط البيانات'], 'Scenario controller'], ['Run a scenario', 'تشغيل سيناريو'])]);
  D(O, 'Home', 'الرئيسية', [b.kpis([[['Open exceptions', 'الاستثناءات المفتوحة'], '7'], [['Oldest item (days)', 'أقدم عنصر (أيام)'], '3'], [['Failed today', 'الفاشلة اليوم'], '2']], ['Definition: items waiting for an operator. Denominator: all items today.', 'التعريف: عناصر بانتظار المشغّل. المقام: كل عناصر اليوم.']), b.table('queues', { title: ['Queues', 'الطوابير'], tools: false })]);
  D(O, 'Transaction explorer', 'مستكشف المعاملات', [b.table('explorer', { filters: [['Type', 'النوع'], ['Status', 'الحالة']], to: 'Transaction detail and trace', n: 5 })], { empty: [['No matching transactions', 'لا توجد معاملات مطابقة'], ['Try a different ID or correlation ID.', 'جرّب معرّفًا أو مرجعًا مترابطًا آخر.']] });
  D(O, 'Queues', 'الطوابير', [b.table('queues', { filters: [['Type', 'النوع']] })]);
  D(O, 'Transaction detail and trace', 'تفاصيل المعاملة والتتبّع', [
    b.status('ST-HELD'), b.kv(['Transaction', 'المعاملة'], [[['Reference', 'المرجع'], 'TX-1007'], [['Correlation ID', 'المرجع المترابط'], 'COR-20260115-0042'], [['Amount', 'المبلغ'], '50.00 ILS', 1]]),
    b.timeline(['Trace: state events, journals, adapter events, audit', 'التتبّع: أحداث الحالة والقيود وأحداث المحوّل والتدقيق'], [[['State: Held', 'الحالة: محجوزة'], '2026-01-15 09:00'], [['Journal JNL-1003 posted', 'تم ترحيل القيد JNL-1003'], '2026-01-15 09:00'], [['Adapter event: mock bank accepted', 'حدث المحوّل: قبِل البنك الوهمي'], '2026-01-15 09:01'], [['Audit: viewed', 'التدقيق: تم العرض'], '2026-01-15 09:05']]),
    b.actions([[['Retry', 'إعادة المحاولة'], 'Transaction detail and trace', 'primary'], [['Cancel', 'إلغاء'], 'Transaction detail and trace', 'danger']])]);
  D(O, 'Settlements overview', 'نظرة عامة على التسويات', [b.table('settlements', { filters: [['Product', 'المنتج'], ['Status', 'الحالة']] })]);
  D(O, 'Partner simulator', 'محاكي الشركاء', [b.notice('sim', ['Mock partners only. Injected faults affect the demo only.', 'شركاء وهميون فقط. الأعطال المحقونة تؤثر على العرض فقط.']), b.table('partners', { tools: false, n: 3 }), b.form([[['Partner', 'الشريك'], 'select', ['Mock payout partner', 'شريك دفع وهمي']], [['Inject', 'حقن'], 'select', ['Payout failure', 'فشل الدفع']]], [['Apply', 'تطبيق'], 'Partner simulator'])]);
  D(O, 'Reconciliation runs', 'دورات التسوية', [b.table('reconruns', { tools: false, to: 'Reconciliation exceptions' })]);
  D(O, 'Reconciliation exceptions', 'استثناءات التسوية', [b.table('reconex', { filters: [['Type', 'النوع']] }), b.maker({ title: ['Resolve exception', 'حل الاستثناء'] })]);
  D(O, 'Market controls', 'ضوابط السوق', [b.notice('sim', ['Halting or resuming a market needs a second approver.', 'إيقاف السوق أو استئنافه يتطلب موافقًا ثانيًا.']), b.table('markets', { tools: false, n: 3 }), b.maker({ title: ['Halt or resume market', 'إيقاف السوق أو استئنافه'] })]);
  D(O, 'Price feed controls', 'ضوابط تغذية الأسعار', [b.notice('sim', ['Scenario-driven synthetic price paths. No real market data.', 'مسارات أسعار اصطناعية مبنية على سيناريو. لا بيانات سوق حقيقية.']), b.form([[['Price path', 'مسار السعر'], 'select', ['Steady rise', 'ارتفاع ثابت']], [['Inject gap', 'حقن فجوة'], 'switch', false], [['Make feed stale', 'جعل التغذية قديمة'], 'switch', false]], [['Apply', 'تطبيق'], 'Price feed controls'])]);
  D(O, 'Remittance simulator', 'محاكي التحويلات', [b.notice('sim', ['Advance or fail a simulated transfer to show the exception paths.', 'قدّم تحويلًا محاكى أو أفشله لعرض مسارات الاستثناء.']), b.form([[['Transfer', 'التحويل'], 'select', 'TX-1007'], [['Next state', 'الحالة التالية'], 'select', ['In transit', 'قيد النقل']]], [['Advance', 'تقديم'], 'Remittance simulator'])]);
  D(O, 'Corridors', 'الممرات', [b.table('corridors', { tools: false }), b.notice('info', ['Rates are illustrative and change only through an approved configuration change.', 'الأسعار توضيحية وتتغير فقط عبر تغيير إعدادات معتمد.'])]);

  /* ================= CMP ================= */
  var C = 'CMP';
  D(C, 'App shell', 'هيكل وحدة الامتثال', [b.notice('sim', SYN), b.cards(['Compliance console', 'وحدة الامتثال'], [[['Onboarding queue', 'طابور التسجيل'], '', null, 'Onboarding queue'], [['Alerts', 'التنبيهات'], '', null, 'Alerts list'], [['Cases', 'الحالات'], '', null, 'Cases list']])]);
  D(C, 'Onboarding queue', 'طابور التسجيل', [b.notice('sim', SYN), b.table('onboarding', { filters: [['Status', 'الحالة'], ['Type', 'النوع']], to: 'Onboarding detail' })]);
  D(C, 'Onboarding detail', 'تفاصيل التسجيل', [b.status('ST-UNDER-REVIEW'), b.kv(['Application data', 'بيانات الطلب'], [[['Name', 'الاسم'], 'Demo Person'], [['Document (sample)', 'المستند (نموذج)'], ['Sample ID card', 'بطاقة هوية نموذجية']]]), b.maker({ title: ['Decision', 'القرار'] })]);
  D(C, 'Alerts list', 'قائمة التنبيهات', [b.table('alerts', { filters: [['Rule', 'القاعدة'], ['Status', 'الحالة']], to: 'Alert detail' })], { empty: [['No alerts', 'لا توجد تنبيهات'], ['Alerts from monitoring rules appear here.', 'تظهر هنا تنبيهات قواعد المراقبة.']] });
  D(C, 'Alert detail', 'تفاصيل التنبيه', [b.status('ST-HELD', ['The transaction is held while this alert is open.', 'المعاملة محجوزة ما دام هذا التنبيه مفتوحًا.']), b.kv(['Why it fired', 'سبب التنبيه'], [[['Rule', 'القاعدة'], ['Large transfer', 'تحويل كبير']], [['Match explanation', 'شرح المطابقة'], ['Amount is above the placeholder threshold.', 'المبلغ فوق الحد النائب.']], [['Risk score', 'درجة المخاطر'], '72']]), b.actions([[['Open case', 'فتح حالة'], 'Case detail', 'primary']])]);
  D(C, 'Cases list', 'قائمة الحالات', [b.table('cases', { filters: [['Status', 'الحالة'], ['Priority', 'الأولوية']], to: 'Case detail' })]);
  D(C, 'Case detail', 'تفاصيل الحالة', [b.status('ST-UNDER-REVIEW'), b.timeline(['Case timeline', 'الجدول الزمني للحالة'], [[['Alert raised', 'تم رفع التنبيه'], '2026-01-15 09:00'], [['Analyst proposed release', 'اقترح المحلل الإفراج'], '2026-01-15 10:00']]), b.table('explorer', { title: ['Linked transactions', 'المعاملات المرتبطة'], tools: false, n: 2 }), b.maker({ title: ['Decision (maker-checker)', 'القرار (مُنشئ ومُراجع)'] })]);
  D(C, 'Rules list', 'قائمة القواعد', [b.table('rules', { to: 'Rule editor', cta: [['New rule', 'قاعدة جديدة'], 'Rule editor'] })]);
  D(C, 'Rule editor', 'محرر القاعدة', [b.form([[['Rule', 'القاعدة'], 'select', ['Large transfer', 'تحويل كبير']], [['Threshold (placeholder)', 'الحد (نائب مؤقت)'], 'money', '5,000.00', null, 'ILS'], [['Status', 'الحالة'], 'select', ['Draft', 'مسودة']]], [['Submit for approval', 'إرسال للموافقة'], 'Rules list'])]);
  D(C, 'Reports center', 'مركز التقارير', [b.table('reports', { tools: false }), b.actions([[['Export audit report', 'تصدير تقرير التدقيق'], 'Audit export']])]);
  D(C, 'Audit search', 'البحث في سجل التدقيق', [b.table('audit', { filters: [['Actor', 'المنفّذ'], ['Action', 'الإجراء']], n: 5 }), b.actions([[['Verify integrity', 'التحقق من السلامة'], 'Audit verify'], [['Export', 'تصدير'], 'Audit export']])], { empty: [['No audit events found', 'لم يُعثر على أحداث تدقيق'], ['Change the filters and search again.', 'غيّر المرشحات وابحث مجددًا.']] });
  D(C, 'Audit verify', 'التحقق من سجل التدقيق', [b.notice('success', ['The hash chain is intact for the selected range.', 'سلسلة التجزئة سليمة للنطاق المحدد.'], ['Verified', 'تم التحقق']), b.form([[['From', 'من'], 'date', '2026-01-01'], [['To', 'إلى'], 'date', '2026-01-15']], [['Verify', 'تحقق'], 'Audit verify'])]);
  D(C, 'Audit export', 'تصدير سجل التدقيق', [b.form([[['From', 'من'], 'date', '2026-01-01'], [['To', 'إلى'], 'date', '2026-01-15'], [['Format', 'الصيغة'], 'select', 'CSV']], [['Export', 'تصدير'], 'Audit search']), b.notice('sim', ['Exports carry a simulation watermark.', 'تحمل الملفات المصدّرة علامة مائية للمحاكاة.'])]);

  /* ================= ADM ================= */
  var A = 'ADM';
  D(A, 'Users', 'المستخدمون', [b.table('users', { filters: [['Role', 'الدور']], cta: [['Add user', 'إضافة مستخدم'], 'Users'] })]);
  D(A, 'Roles', 'الأدوار', [b.table('roles', { tools: false }), b.notice('warn', ['No user may hold all of: post journals, approve issuance, administer audit.', 'لا يجوز لأي مستخدم الجمع بين: ترحيل القيود واعتماد الإصدار وإدارة التدقيق.'], ['Separation of duties', 'فصل المهام'])]);
  D(A, 'Config list', 'قائمة الإعدادات', [b.table('config', { filters: [['State', 'الحالة']], to: 'Config diff and approve' })]);
  D(A, 'Config history', 'سجل الإعدادات', [b.table('config', { tools: false }), b.timeline(['Versions', 'الإصدارات'], [[['v3 approved', 'اعتُمد الإصدار 3'], '2026-01-14'], [['v2 approved', 'اعتُمد الإصدار 2'], '2026-01-10']])]);
  D(A, 'Config diff and approve', 'مقارنة الإعدادات والموافقة', [b.kv(['Proposed change', 'التغيير المقترح'], [[['Setting', 'الإعداد'], ['Transfer limit (placeholder)', 'حد التحويل (نائب مؤقت)']], [['Current', 'الحالي'], '5,000.00 ILS'], [['Proposed', 'المقترح'], '7,500.00 ILS', 1]]), b.maker({ title: ['Approve change', 'الموافقة على التغيير'], conflict: true })]);
  D(A, 'Config rollback', 'التراجع عن الإعدادات', [b.notice('warn', ['Rolling back creates a new version. History is kept.', 'يُنشئ التراجع إصدارًا جديدًا. يُحفظ السجل.']), b.form([[['Roll back to version', 'التراجع إلى الإصدار'], 'select', '2'], [['Reason', 'السبب'], 'textarea', ['Restore previous limit', 'استعادة الحد السابق']]], [['Request rollback', 'طلب التراجع'], 'Config history'])]);
  D(A, 'Feature flags', 'مفاتيح الميزات', [b.table('flags', { tools: false }), b.notice('info', ['Safety-locked flags cannot be changed here.', 'لا يمكن تغيير المفاتيح المقفلة للأمان هنا.'])]);
  D(A, 'Tenants', 'المستأجرون', [b.table('tenants', { tools: false, n: 2 })]);
})();

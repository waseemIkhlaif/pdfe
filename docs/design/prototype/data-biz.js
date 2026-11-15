/* Merchant portal (MER) and business portal (BIZ) screens. Pairs are [English, Arabic]; Arabic is a draft pending review. */
(function () {
  'use strict';
  var P = window.PDFE, b = P.b, c = P.c, D = P.def, ILS = 'ILS', SIMN = c.SIMNOTE;

  /* ================= MER ================= */
  var M = 'MER';
  var KPIDEF = ['Definition: completed simulated payments. Denominator: all simulated payments today.', 'التعريف: المدفوعات المحاكاة المكتملة. المقام: كل المدفوعات المحاكاة اليوم.'];
  D(M, 'App shell', 'هيكل البوابة', [b.cards(['Welcome to the merchant portal', 'مرحبًا بك في بوابة التاجر'], [[['Dashboard', 'لوحة التحكم'], '', ['Sales and the next settlement', 'المبيعات والتسوية القادمة'], 'Dashboard'], [['Payments', 'المدفوعات'], '', ['All payments', 'كل المدفوعات'], 'Payments'], [['Settlements', 'التسويات'], '', ['Batches and payouts', 'الدفعات والتحويلات'], 'Settlements']])]);
  D(M, 'KYB', 'التحقق من الأعمال (KYB)', [
    b.status('ST-UNDER-REVIEW', ['Your business check is in progress. This is a synthetic check, not a real compliance check.', 'فحص نشاطك قيد التنفيذ. هذا فحص تجريبي وليس فحص امتثال حقيقي.']),
    b.form([[['Company name (synthetic)', 'اسم الشركة (تجريبي)'], 'text', 'Demo Cafe'], [['Registration document', 'مستند التسجيل'], 'file', ''], [['Owners', 'المالكون'], 'text', ['Demo user A', 'مستخدم تجريبي أ']]], [['Submit for review', 'إرسال للمراجعة'], 'Dashboard'])]);
  D(M, 'Dashboard', 'لوحة التحكم', [
    b.kpis([[['Today\'s sales', 'مبيعات اليوم'], '312.75 ILS', ['12 payments', '12 دفعة']], [['Payable balance', 'الرصيد المستحق'], '1,840.00 ILS'], [['Next settlement', 'التسوية القادمة'], '2026-01-16']], KPIDEF),
    b.chart(['Sales this week', 'مبيعات هذا الأسبوع'], 'bar'), b.table('payments', { title: ['Latest payments', 'آخر المدفوعات'], tools: false, n: 3, to: 'Payment detail' })]);
  D(M, 'Create payment and QR', 'إنشاء دفعة ورمز QR', [
    b.form([[['Amount', 'المبلغ'], 'money', '18.25', null, ILS], [['Reference', 'المرجع'], 'text', 'Table 4'], [['Expires in (minutes)', 'ينتهي خلال (دقائق)'], 'text', '5']], [['Create QR and link', 'إنشاء الرمز والرابط'], 'Payments']),
    b.qr(['Scan to pay 18.25 ILS', 'امسح للدفع 18.25 ILS'], { seed: 4, expires: '04:30' }), b.actions([[['Print view', 'عرض الطباعة'], 'Create payment and QR']])]);
  D(M, 'Static QR', 'رمز QR الثابت', [b.qr(['Store code (customer enters the amount)', 'رمز المتجر (يدخل العميل المبلغ)'], { seed: 6 }), b.actions([[['Print', 'طباعة'], 'Static QR']])]);
  D(M, 'Payments', 'المدفوعات', [b.table('payments', { filters: [['Status', 'الحالة'], ['Date', 'التاريخ']], to: 'Payment detail', n: 5, cta: [['New payment', 'دفعة جديدة'], 'Create payment and QR'] })], { empty: [['No payments yet', 'لا توجد مدفوعات بعد'], ['Create a payment QR to get started.', 'أنشئ رمز QR للدفع للبدء.']] });
  D(M, 'Payment detail', 'تفاصيل الدفعة', [b.status('ST-COMPLETED'), b.kv(['Payment', 'الدفعة'], [[['Amount', 'المبلغ'], '18.25 ILS', 1], [['Payer', 'الدافع'], ['Demo user A', 'مستخدم تجريبي أ']], [['Captured', 'تم التحصيل'], '2026-01-15 09:02'], [['Reference', 'المرجع'], 'PAY-1000']]), b.table('refunds', { title: ['Refund history', 'سجل الاسترداد'], tools: false, n: 1 }), b.actions([[['Refund', 'استرداد'], 'Refund – enter', 'danger']])]);
  P.flow({ ifc: M, stem: 'Refund', ar: ['استرداد – إدخال', 'استرداد – مراجعة', 'استرداد – النتيجة'],
    fields: [[['Payment', 'الدفعة'], 'readonly', 'PAY-1000'], [['Refund amount', 'مبلغ الاسترداد'], 'money', '5.00', null, ILS], [['Reason', 'السبب'], 'textarea', ['Item returned', 'إرجاع الصنف']]],
    reviewRows: [[['Payment', 'الدفعة'], 'PAY-1000'], [['Refund', 'الاسترداد'], '5.00 ILS', 1], [['Reason', 'السبب'], ['Item returned', 'إرجاع الصنف']], [['Remaining after refund', 'المتبقي بعد الاسترداد'], '13.25 ILS']], amount: '5.00 ILS', goal: 'Refunds' });
  D(M, 'Refunds', 'المرتجعات', [b.table('refunds', { filters: [['Status', 'الحالة']], n: 4 })]);
  D(M, 'Settlements', 'التسويات', [b.table('settlements', { filters: [['Status', 'الحالة']], to: 'Settlement detail' })]);
  D(M, 'Settlement detail', 'تفاصيل التسوية', [b.status('ST-FAILED', ['Some items failed. Retry them below.', 'فشلت بعض العناصر. أعد المحاولة أدناه.']), b.table('settleItems', { tools: false }), b.actions([[['Retry failed items', 'إعادة محاولة العناصر الفاشلة'], 'Settlement detail', 'primary']])]);
  D(M, 'Payout account', 'حساب الدفعات', [b.notice('sim', ['This payout account is a synthetic mock bank account.', 'حساب الدفعات هذا حساب بنكي وهمي.']), b.form([[['Account name', 'اسم الحساب'], 'text', 'Demo Cafe payouts'], [['Mock account number', 'رقم الحساب الوهمي'], 'text', 'SIM-ACCT-0001']], [['Save', 'حفظ'], 'Settlements'])]);
  D(M, 'Staff', 'الموظفون', [b.table('staff', { cta: [['Invite staff', 'دعوة موظف'], 'Staff'] }), b.notice('info', ['Cashiers cannot refund above their limit.', 'لا يستطيع الكاشير الاسترداد فوق حدّه.'])]);
  D(M, 'Statements', 'الكشوف', [b.form([[['Month', 'الشهر'], 'select', '2026-01'], [['Language', 'اللغة'], 'select', ['English', 'العربية']]], [['Download statement', 'تنزيل الكشف'], 'Statements']), b.table('statements', { tools: false, n: 3 })]);
  D(M, 'Invoices', 'الفواتير', [b.table('invoices', { filters: [['Status', 'الحالة']] })]);

  /* ================= BIZ ================= */
  var B = 'BIZ';
  D(B, 'App shell', 'هيكل البوابة', [b.cards(['Welcome to the business portal', 'مرحبًا بك في بوابة الأعمال'], [[['Dashboard', 'لوحة التحكم'], '', ['Receivables and payables', 'الذمم المدينة والدائنة'], 'Dashboard'], [['Invoices', 'الفواتير'], '', ['Create and track', 'إنشاء ومتابعة'], 'Invoices list'], [['Approvals', 'الموافقات'], '', ['Payout approvals', 'موافقات الدفعات'], 'Approval inbox']])]);
  D(B, 'Dashboard', 'لوحة التحكم', [b.kpis([[['Receivables', 'الذمم المدينة'], '4,200.00 ILS', ['4 open invoices', '4 فواتير مفتوحة']], [['Payables', 'الذمم الدائنة'], '1,350.00 ILS'], [['Awaiting approval', 'بانتظار الموافقة'], '2']], ['Definition: open invoices and payout requests. Denominator: all simulated items.', 'التعريف: الفواتير المفتوحة وطلبات الدفع. المقام: كل العناصر المحاكاة.']), b.table('invoices', { title: ['Latest invoices', 'آخر الفواتير'], tools: false, n: 3, to: 'Invoice detail' })]);
  D(B, 'Invoices list', 'قائمة الفواتير', [b.table('invoices', { filters: [['Status', 'الحالة'], ['Customer', 'العميل']], to: 'Invoice detail', n: 5, cta: [['New invoice', 'فاتورة جديدة'], 'Invoice editor'] })], { empty: [['No invoices yet', 'لا توجد فواتير بعد'], ['Create your first invoice.', 'أنشئ أول فاتورة لك.']] });
  D(B, 'Invoice editor', 'محرر الفاتورة', [b.form([[['Customer', 'العميل'], 'select', ['Demo Customer 1', 'عميل تجريبي 1']], [['Due date', 'تاريخ الاستحقاق'], 'date', '2026-02-01'], [['Currency', 'العملة'], 'select', ILS]], [['Save invoice', 'حفظ الفاتورة'], 'Invoice detail'], [['Cancel', 'إلغاء'], 'Invoices list']), b.table('lines', { title: ['Line items', 'بنود الفاتورة'], tools: false, n: 2 }), b.notice('sim', ['The PDF preview carries a simulation watermark.', 'تحمل معاينة PDF علامة مائية للمحاكاة.'])]);
  D(B, 'Invoice detail', 'تفاصيل الفاتورة', [b.status('ST-PENDING'), b.kv(['Invoice', 'الفاتورة'], [[['Customer', 'العميل'], ['Demo Customer 1', 'عميل تجريبي 1']], [['Total', 'الإجمالي'], '1,250.00 ILS', 1], [['Paid', 'المدفوع'], '500.00 ILS'], [['Due', 'الاستحقاق'], '2026-02-01']]), b.table('payments', { title: ['Matched payments', 'المدفوعات المطابقة'], tools: false, n: 2 }), b.actions([[['Match payment manually', 'مطابقة دفعة يدويًا'], 'Invoice detail'], [['Download PDF', 'تنزيل PDF'], 'Invoice detail']])]);
  D(B, 'Customers', 'العملاء', [b.table('customers', { cta: [['Add customer', 'إضافة عميل'], 'Customers'] })]);
  D(B, 'Suppliers', 'الموردون', [b.notice('sim', ['Supplier accounts are mock bank accounts.', 'حسابات الموردين حسابات بنكية وهمية.']), b.table('suppliers', { cta: [['Add supplier', 'إضافة مورّد'], 'Suppliers'] })]);
  P.flow({ ifc: B, stem: 'Payout request', ar: ['طلب دفع – إدخال', 'طلب دفع – مراجعة', 'طلب دفع – النتيجة'],
    fields: [[['Supplier', 'المورّد'], 'select', ['Demo Supplier 1', 'مورّد تجريبي 1']], [['Amount', 'المبلغ'], 'money', '900.00', null, ILS], [['Reference', 'المرجع'], 'text', 'INV-S-77']],
    reviewRows: [[['Supplier', 'المورّد'], ['Demo Supplier 1', 'مورّد تجريبي 1']], [['Amount', 'المبلغ'], '900.00 ILS', 1], [['Approver needed', 'يتطلب موافقة'], ['Yes, a different person', 'نعم، شخص مختلف']]], status: 'ST-PENDING', amount: '900.00 ILS', goal: 'Payouts' });
  D(B, 'Payouts', 'الدفعات', [b.table('payouts', { filters: [['Status', 'الحالة']] })]);
  D(B, 'Approval inbox', 'صندوق الموافقات', [b.table('payouts', { filters: [['Status', 'الحالة']], n: 3 }), b.maker({ title: ['Approve payout request', 'الموافقة على طلب الدفع'] }), b.notice('info', ['Your approval limit is 5,000.00 ILS.', 'حد موافقتك هو 5,000.00 ILS.'])], { empty: [['Nothing to approve', 'لا شيء للموافقة عليه'], ['New requests will appear here.', 'ستظهر هنا الطلبات الجديدة.']] });
  D(B, 'Bank reconciliation', 'تسوية البنك', [b.notice('sim', ['Statement lines come from a mock bank statement.', 'بنود الكشف من كشف بنكي وهمي.']), b.table('bankrecon', { filters: [['Match', 'المطابقة']] }), b.actions([[['Match selected', 'مطابقة المحدد'], 'Bank reconciliation', 'primary']])]);
  D(B, 'Reports and exports', 'التقارير والتصدير', [b.table('reports', { tools: false }), b.actions([[['Export CSV', 'تصدير CSV'], 'Reports and exports'], [['Export PDF', 'تصدير PDF'], 'Reports and exports']])]);
  D(B, 'Team and limits', 'الفريق والحدود', [b.table('team', { cta: [['Invite member', 'دعوة عضو'], 'Team and limits'] })]);
  D(B, 'API keys', 'مفاتيح API', [b.notice('sim', ['Keys work only in the demo sandbox.', 'تعمل المفاتيح في بيئة المحاكاة التجريبية فقط.']), b.table('apikeys', { cta: [['Create key', 'إنشاء مفتاح'], 'API keys'] })]);
})();

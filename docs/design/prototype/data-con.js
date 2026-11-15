/* Consumer app screens (mobile and web). Pairs are [English, Arabic]; Arabic is a draft pending review. */
(function () {
  'use strict';
  var P = window.PDFE, b = P.b, c = P.c, D = P.def, I = 'CON';
  var SIMN = c.SIMNOTE, ILS = 'ILS';

  /* ---- access and shell ---- */
  D(I, 'Splash and simulation notice', 'شاشة البداية وإشعار المحاكاة', [
    b.hero(['Welcome', 'مرحبًا'], 'PDFE Demo', ['A demonstration of digital financial services.', 'عرض توضيحي للخدمات المالية الرقمية.']),
    b.notice('sim', ['Everything here is simulated: pretend money, pretend people, pretend banks.', 'كل ما هنا محاكاة: أموال وهمية وأشخاص وهميون وبنوك وهمية.'], ['Simulation', 'محاكاة']),
    b.actions([[['Continue', 'متابعة'], 'Sign-in', 'primary']])]);
  D(I, 'Sign-in', 'تسجيل الدخول', [
    b.form([[['Username', 'اسم المستخدم'], 'text', 'demo.individual'], [['Password', 'كلمة المرور'], 'password', 'x']], [['Sign in', 'دخول'], 'Demo role picker']),
    b.notice('info', ['Demo accounts only. No real accounts exist.', 'حسابات تجريبية فقط. لا توجد حسابات حقيقية.'])]);
  D(I, 'MFA (privileged only)', 'التحقق بخطوتين (للأدوار المميزة)', [
    b.form([[['Enter your code', 'أدخل الرمز'], 'otp', '', ['Enter the 6-digit code from your authenticator app.', 'أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة.']]], [['Verify', 'تحقق'], 'Home'])]);
  D(I, 'Demo role picker', 'اختيار دور تجريبي', [
    b.notice('sim', ['You are choosing a role inside a simulation.', 'أنت تختار دورًا داخل محاكاة.']),
    b.cards(['Choose a demo role', 'اختر دورًا تجريبيًا'], [[['Individual', 'فرد'], '', ['Wallet, payments, remittance', 'المحفظة والمدفوعات والتحويلات'], 'Home'], [['Merchant', 'تاجر'], '', ['Merchant mode and portal', 'وضع التاجر والبوابة'], 'Merchant mode – Charge'], [['Exchange user', 'مستخدم البورصة'], '', ['Paper trading', 'تداول ورقي'], 'Markets']])]);
  D(I, 'Language switcher', 'تبديل اللغة', [
    b.form([[['Language', 'اللغة'], 'select', ['English', 'العربية']], [['Digits', 'الأرقام'], 'select', ['Western (0-9)', 'غربية (0-9)'], ['Western digits are the default for amounts.', 'الأرقام الغربية هي الافتراضية للمبالغ.']], [['Use Asia/Jerusalem time', 'استخدام توقيت القدس'], 'switch', true]], [['Save', 'حفظ'], 'Profile'])]);
  D(I, 'App lock', 'قفل التطبيق', [
    b.form([[['Enter your PIN', 'أدخل الرقم السري'], 'otp', '']], [['Unlock', 'فتح'], 'Home']),
    b.notice('info', ['Simulated biometric unlock. No real biometric data is used.', 'فتح بالبصمة محاكى. لا تُستخدم أي بيانات بيومترية حقيقية.'])]);
  D(I, 'Error, offline and permission screens', 'شاشات الخطأ وعدم الاتصال والصلاحيات', [
    b.notice('danger', ['You are offline. We will retry when you are back online.', 'أنت غير متصل. سنعيد المحاولة عند عودة الاتصال.'], ['Offline', 'غير متصل']),
    b.notice('warn', ['You do not have access to this page. Ask an administrator.', 'ليس لديك صلاحية الوصول إلى هذه الصفحة. اطلب من المسؤول.'], ['No access', 'لا صلاحية']),
    b.actions([[['Try again', 'حاول مرة أخرى'], 'Home', 'primary']])]);
  D(I, 'App shell', 'هيكل التطبيق', [
    b.hero(['Signed in as', 'تم الدخول باسم'], 'Individual', ['Use the tabs or the side menu to move around.', 'استخدم علامات التبويب أو القائمة الجانبية للتنقل.']),
    b.cards(['Where to go', 'إلى أين تذهب'], [[['Home', 'الرئيسية'], '', ['Balances and quick actions', 'الأرصدة والإجراءات السريعة'], 'Home'], [['Pay/Scan', 'دفع/مسح'], '', ['Scan a QR code', 'امسح رمز QR'], 'Scan QR'], [['Send', 'إرسال'], '', ['Send money', 'أرسل أموالًا'], 'Send – recipient'], [['Markets', 'الأسواق'], '', ['Paper trading', 'تداول ورقي'], 'Markets']])]);

  /* ---- onboarding (J1) ---- */
  var OBN = [['Onboarding – welcome', 'التسجيل – مرحبًا'], ['Onboarding – personal info', 'التسجيل – المعلومات الشخصية'], ['Onboarding – synthetic document', 'التسجيل – مستند تجريبي'], ['Onboarding – simulated selfie', 'التسجيل – صورة شخصية محاكاة'], ['Onboarding – review', 'التسجيل – المراجعة'], ['Onboarding – status', 'التسجيل – الحالة']];
  var obSteps = { labels: [['Welcome', 'مرحبًا'], ['Details', 'التفاصيل'], ['Document', 'المستند'], ['Selfie', 'الصورة'], ['Review', 'المراجعة'], ['Status', 'الحالة']] };
  function ob(i, blocks) { D(I, OBN[i][0], OBN[i][1], [{ k: 'steps', at: i, labels: obSteps.labels }].concat(blocks), { nosteps: true }); }
  ob(0, [b.text(['Set up your demo wallet in a few steps. Nothing you enter is real.', 'جهّز محفظتك التجريبية في بضع خطوات. لا شيء مما تدخله حقيقي.']), b.actions([[['Start', 'ابدأ'], 'Onboarding – personal info', 'primary']])]);
  ob(1, [b.form([[['Full name (synthetic)', 'الاسم الكامل (تجريبي)'], 'text', 'Demo Person'], [['Date of birth', 'تاريخ الميلاد'], 'date', '1990-01-01'], [['Mobile number (synthetic)', 'رقم الجوال (تجريبي)'], 'text', '+000 0000 0000']], [['Continue', 'متابعة'], 'Onboarding – synthetic document'])]);
  ob(2, [b.form([[['Document', 'المستند'], 'file', '']], [['Continue', 'متابعة'], 'Onboarding – simulated selfie'])]);
  ob(3, [b.notice('sim', ['This is a simulated selfie step. No camera or real face data is used.', 'هذه خطوة صورة شخصية محاكاة. لا تُستخدم كاميرا أو بيانات وجه حقيقية.']), b.actions([[['Use sample photo', 'استخدم صورة نموذجية'], 'Onboarding – review', 'primary']])]);
  ob(4, [b.kv(['Check your details', 'تحقق من بياناتك'], [[['Name', 'الاسم'], 'Demo Person'], [['Document', 'المستند'], ['Sample ID card', 'بطاقة هوية نموذجية']], [['Selfie', 'الصورة'], ['Sample photo', 'صورة نموذجية']]]), b.actions([[['Submit', 'إرسال'], 'Onboarding – status', 'primary'], [['Back', 'رجوع'], 'Onboarding – synthetic document']])]);
  ob(5, [b.status('ST-UNDER-REVIEW', ['Your application is being reviewed. This is a synthetic check, not a real compliance check.', 'طلبك قيد المراجعة. هذا فحص تجريبي وليس فحص امتثال حقيقي.']), b.timeline(['Progress', 'التقدم'], [[['Submitted', 'تم الإرسال'], '2026-01-15'], [['Under review', 'قيد المراجعة'], '2026-01-15']]), b.actions([[['Go to Home', 'إلى الرئيسية'], 'Home', 'primary']])]);

  /* ---- wallet (J1) ---- */
  D(I, 'Home', 'الرئيسية', [
    b.hero(['Total balance', 'الرصيد الإجمالي'], '1,250.00 ILS', ['Available balance: 1,200.00 ILS', 'الرصيد المتاح: 1,200.00 ILS'], [[['Send', 'إرسال'], 'Send – recipient', 'primary'], [['Request', 'طلب'], 'Request money'], [['Add money', 'إضافة أموال'], 'Add money – enter'], [['Scan', 'مسح'], 'Scan QR']]),
    b.cards(['Currencies', 'العملات'], [[['ILS', 'ILS'], '1,250.00', null, 'Wallet detail'], [['USD', 'USD'], '85.00', null, 'Wallet detail'], [['JOD', 'JOD'], '12.500', null, 'Wallet detail']]),
    b.table('txns', { title: ['Recent activity', 'النشاط الأخير'], tools: false, n: 3, to: 'Transaction detail' })]);
  D(I, 'Wallet detail', 'تفاصيل المحفظة', [
    b.hero(['ILS wallet', 'محفظة ILS'], '1,250.00 ILS', ['Posted 1,250.00 · Held 50.00 · Available 1,200.00', 'مُرحَّل 1,250.00 · محجوز 50.00 · متاح 1,200.00']),
    b.tabs([['Activity', 'النشاط'], ['Details', 'التفاصيل']], 0),
    b.table('txns', { tools: false, to: 'Transaction detail' })]);
  P.flow({ ifc: I, stem: 'Add money', ar: ['إضافة أموال – إدخال', 'إضافة أموال – مراجعة', 'إضافة أموال – النتيجة'],
    fields: [[['From (mock bank)', 'من (بنك وهمي)'], 'select', ['Demo Bank A', 'البنك التجريبي أ']], [['Amount', 'المبلغ'], 'money', '250.00', null, ILS]],
    reviewRows: [[['From', 'من'], ['Demo Bank A (mock)', 'البنك التجريبي أ (وهمي)']], [['Amount', 'المبلغ'], '250.00 ILS'], [['Fee', 'الرسوم'], '0.00 ILS'], [['You will add', 'ستضيف'], '250.00 ILS', 1]],
    status: 'ST-PENDING', amount: '250.00 ILS', resultRows: [[['Destination', 'الوجهة'], ['ILS wallet', 'محفظة ILS']]] });
  P.flow({ ifc: I, stem: 'Withdraw', ar: ['سحب – إدخال', 'سحب – مراجعة', 'سحب – النتيجة'],
    fields: [[['To (mock bank)', 'إلى (بنك وهمي)'], 'select', ['Demo Bank A', 'البنك التجريبي أ']], [['Amount', 'المبلغ'], 'money', '100.00', null, ILS]],
    reviewRows: [[['To', 'إلى'], ['Demo Bank A (mock)', 'البنك التجريبي أ (وهمي)']], [['Amount', 'المبلغ'], '100.00 ILS'], [['Fee', 'الرسوم'], '0.00 ILS'], [['You will receive', 'ستستلم'], '100.00 ILS', 1]],
    status: 'ST-PENDING', amount: '100.00 ILS' });
  D(I, 'Send – recipient', 'إرسال – المستلم', [
    b.form([[['Find a recipient', 'ابحث عن مستلم'], 'text', ['Demo user B', 'مستخدم تجريبي ب'], ['Search by name or scan their contact code.', 'ابحث بالاسم أو امسح رمز جهة الاتصال.']]], [['Continue', 'متابعة'], 'Send – amount'], [['Scan contact code', 'مسح رمز جهة الاتصال'], 'Scan QR']),
    b.table('txns', { title: ['Recent recipients', 'المستلمون الأخيرون'], tools: false, n: 3 })], { nosteps: false });
  D(I, 'Send – amount', 'إرسال – المبلغ', [
    b.form([[['Amount', 'المبلغ'], 'money', '50.00', null, ILS], P.c.NOTE && [P.c.NOTE, 'text', ['Lunch', 'غداء']]], [['Review', 'مراجعة'], 'Send – review'])]);
  D(I, 'Send – review', 'إرسال – مراجعة', [
    b.kv(['Review before you send', 'راجع قبل الإرسال'], [[['To', 'إلى'], ['Demo user B', 'مستخدم تجريبي ب']], [['Amount', 'المبلغ'], '50.00 ILS'], [['Fee', 'الرسوم'], '0.00 ILS'], [['They receive', 'يستلم'], '50.00 ILS', 1]]), b.notice('sim', SIMN),
    b.actions([[['Confirm and send', 'تأكيد وإرسال'], 'Send – result', 'primary'], [['Back', 'رجوع'], 'Send – amount']])]);
  D(I, 'Send – result', 'إرسال – النتيجة', [
    b.receipt('ST-COMPLETED', '50.00 ILS', [[['To', 'إلى'], ['Demo user B', 'مستخدم تجريبي ب']]]), b.actions([[['Done', 'تم'], 'Home', 'primary'], [['See activity', 'عرض النشاط'], 'Activity list']])]);
  D(I, 'Request money', 'طلب أموال', [
    b.form([[['Amount', 'المبلغ'], 'money', '30.00', null, ILS]], [['Create request', 'إنشاء الطلب'], 'Request money']),
    b.qr(['Show this code to the payer', 'اعرض هذا الرمز على الدافع'], { seed: 11 })]);
  D(I, 'Activity list', 'قائمة النشاط', [b.table('txns', { filters: [['Status', 'الحالة'], ['Date', 'التاريخ']], to: 'Transaction detail', n: 5 })], { empty: [['No activity yet', 'لا يوجد نشاط بعد'], ['Your transfers and payments will appear here.', 'ستظهر هنا تحويلاتك ومدفوعاتك.']] });
  D(I, 'Transaction detail', 'تفاصيل المعاملة', [
    b.status('ST-COMPLETED'), b.kv(['Details', 'التفاصيل'], [[['Amount', 'المبلغ'], '50.00 ILS', 1], [['To', 'إلى'], ['Demo user B', 'مستخدم تجريبي ب']], [['Reference', 'المرجع'], 'TX-1007'], [['Trace ID', 'معرّف التتبّع'], 'TRC-9f3a-20260115']]),
    b.timeline(['Status history', 'سجل الحالة'], [[['Created', 'أُنشئت'], '2026-01-15 09:00'], [['Held', 'محجوزة'], '2026-01-15 09:00'], [['Completed', 'مكتملة'], '2026-01-15 09:01']])]);
  D(I, 'Statements', 'الكشوف', [
    b.form([[['Month', 'الشهر'], 'select', '2026-01'], [['Language', 'اللغة'], 'select', ['English', 'العربية']]], [['Download statement', 'تنزيل الكشف'], 'Statements']),
    b.table('statements', { tools: false, n: 3 }), b.notice('sim', ['Statements carry a simulation watermark.', 'تحمل الكشوف علامة مائية للمحاكاة.'])]);
  D(I, 'Notifications', 'الإشعارات', [b.table('notifications', { tools: false, n: 4 })], { empty: [['No notifications', 'لا توجد إشعارات'], ['We will tell you when something happens.', 'سنخبرك عند حدوث أي شيء.']] });
  D(I, 'Profile', 'الملف الشخصي', [
    b.kv(['Your profile', 'ملفك الشخصي'], [[['Name', 'الاسم'], 'Demo Person'], [['KYC status', 'حالة التحقق'], { st: 'ST-COMPLETED' }], [['Limits (placeholder)', 'الحدود (نائب مؤقت)'], '5,000.00 ILS']]),
    b.form([[['Language', 'اللغة'], 'select', ['English', 'العربية']], [['Biometric lock (simulated)', 'القفل البيومتري (محاكاة)'], 'switch', true], [['Merchant mode', 'وضع التاجر'], 'switch', false]], null, null, null),
    b.cards(['More', 'المزيد'], [[['Consent', 'الموافقات'], '', null, 'Consent'], [['Support', 'الدعم'], '', null, 'Support'], [['Statements', 'الكشوف'], '', null, 'Statements']])]);
  D(I, 'Support', 'الدعم', [
    b.notice('info', ['Support is simulated. Nobody will answer a real request.', 'الدعم محاكى. لن يرد أحد على طلب حقيقي.']),
    b.cards(['Frequently asked', 'الأسئلة الشائعة'], [[['Is this real money?', 'هل هذه أموال حقيقية؟'], '', ['No. Everything is a simulation with pretend data.', 'لا. كل شيء محاكاة ببيانات وهمية.']], [['What does PSH mean?', 'ماذا تعني PSH؟'], '', ['A placeholder name for a proposed instrument. It is not approved or redeemable.', 'اسم مؤقت لأداة مقترحة. غير معتمدة وغير قابلة للاسترداد.']]])]);

  /* ---- pay (J2) ---- */
  D(I, 'Scan QR', 'مسح رمز QR', [
    b.qr(['Point the camera at a merchant QR code', 'وجّه الكاميرا نحو رمز QR الخاص بالتاجر'], { seed: 5 }),
    b.actions([[['Enter code manually', 'إدخال الرمز يدويًا'], 'Pay – enter (scan QR)', 'primary']])]);
  D(I, 'Pay – enter (scan QR)', 'الدفع – إدخال (مسح الرمز)', [
    b.form([[['Payment code', 'رمز الدفع'], 'text', 'PAY-1000']], [['Continue', 'متابعة'], 'Pay – review (pay sheet)'])]);
  D(I, 'Pay – review (pay sheet)', 'الدفع – مراجعة (ورقة الدفع)', [
    b.kv(['Pay this merchant', 'ادفع لهذا التاجر'], [[['Merchant', 'التاجر'], ['Demo Cafe', 'مقهى تجريبي']], [['Amount', 'المبلغ'], '18.25 ILS', 1], [['Fee', 'الرسوم'], '0.00 ILS']]),
    b.qr(['Expires in 04:30', 'ينتهي خلال 04:30'], { seed: 3, expires: '04:30' }), b.notice('sim', SIMN),
    b.actions([[['Pay', 'ادفع'], 'Pay – result', 'primary'], [['Cancel', 'إلغاء'], 'Home']])]);
  D(I, 'Pay – result', 'الدفع – النتيجة', [b.receipt('ST-COMPLETED', '18.25 ILS', [[['Merchant', 'التاجر'], ['Demo Cafe', 'مقهى تجريبي']]]), b.actions([[['Done', 'تم'], 'Home', 'primary'], [['Report a problem', 'الإبلاغ عن مشكلة'], 'Support']])]);

  /* ---- merchant mode (J2) ---- */
  D(I, 'Merchant mode – Charge', 'وضع التاجر – تحصيل', [b.form([[['Amount to charge', 'المبلغ المطلوب'], 'money', '18.25', null, ILS], [['Reference', 'المرجع'], 'text', 'Table 4']], [['Show QR', 'عرض الرمز'], 'Merchant mode – QR display'])]);
  D(I, 'Merchant mode – QR display', 'وضع التاجر – عرض الرمز', [b.qr(['Scan to pay 18.25 ILS', 'امسح للدفع 18.25 ILS'], { seed: 9, expires: '04:30' }), b.status('ST-PENDING', ['Waiting for payment. This updates automatically.', 'بانتظار الدفع. يتحدث تلقائيًا.']), b.actions([[['Back', 'رجوع'], 'Merchant mode – Charge']])]);
  D(I, "Merchant mode – Today's payments", 'وضع التاجر – مدفوعات اليوم', [b.kpis([[['Today\'s sales', 'مبيعات اليوم'], '312.75 ILS', ['Definition: completed payments today', 'التعريف: المدفوعات المكتملة اليوم']]]), b.table('payments', { tools: false, to: 'Merchant mode – Payment detail' })]);
  D(I, 'Merchant mode – Payment detail', 'وضع التاجر – تفاصيل الدفعة', [b.status('ST-COMPLETED'), b.kv(['Payment', 'الدفعة'], [[['Amount', 'المبلغ'], '18.25 ILS', 1], [['Payer', 'الدافع'], ['Demo user A', 'مستخدم تجريبي أ']], [['Reference', 'المرجع'], 'PAY-1000']]), b.actions([[['Refund', 'استرداد'], 'Merchant mode – Refund – enter', 'danger']])]);
  P.flow({ ifc: I, stem: 'Merchant mode – Refund', names: ['Merchant mode – Refund – enter', 'Merchant mode – Refund – review', 'Merchant mode – Refund – result'], ar: ['وضع التاجر – استرداد – إدخال', 'وضع التاجر – استرداد – مراجعة', 'وضع التاجر – استرداد – النتيجة'],
    fields: [[['Payment', 'الدفعة'], 'readonly', 'PAY-1000'], [['Refund amount', 'مبلغ الاسترداد'], 'money', '5.00', null, ILS], [['Reason', 'السبب'], 'textarea', ['Item returned', 'إرجاع الصنف']]],
    reviewRows: [[['Payment', 'الدفعة'], 'PAY-1000'], [['Refund', 'الاسترداد'], '5.00 ILS', 1], [['Reason', 'السبب'], ['Item returned', 'إرجاع الصنف']]], amount: '5.00 ILS', goal: "Merchant mode – Today's payments" });
  D(I, 'Merchant mode – Payouts', 'وضع التاجر – الدفعات', [b.table('settlements', { tools: false })]);

  /* ---- remittance (J3) ---- */
  D(I, 'Remittance – receive info', 'التحويلات – معلومات الاستلام', [
    b.kv(['Share these details with the sender', 'شارك هذه التفاصيل مع المرسل'], [[['Payout code', 'رمز الدفع'], 'SIM-IBAN-0000-0001'], [['Currency to receive', 'العملة المستلمة'], 'ILS']]),
    b.notice('sim', ['The code above is a simulation placeholder. It is not a real account.', 'الرمز أعلاه نائب للمحاكاة. وليس حسابًا حقيقيًا.'], ['SIM', 'محاكاة']), b.actions([[['Track incoming transfers', 'تتبع التحويلات الواردة'], 'Remittance – tracking', 'primary']])]);
  D(I, 'Remittance – tracking', 'التحويلات – التتبع', [
    b.status('ST-PENDING', ['Your transfer is on its way.', 'تحويلك في الطريق.']),
    b.timeline(['Progress', 'التقدم'], [[['Initiated', 'بدأ'], '2026-01-15 08:00'], [['Funded', 'مموّل'], '2026-01-15 08:05'], [['Screening', 'الفحص'], '2026-01-15 08:06'], [['In transit', 'قيد النقل'], '2026-01-15 08:20'], [['Credited', 'تم الإيداع'], '—']]), b.actions([[['Back', 'رجوع'], 'Home']])]);
  D(I, 'Send abroad – enter', 'إرسال للخارج – إدخال', [b.form([[['Country / corridor', 'البلد / الممر'], 'select', ['USD to ILS', 'دولار إلى شيكل']], [['You send', 'ترسل'], 'money', '100.00', null, 'USD']], [['Continue', 'متابعة'], 'Send abroad – beneficiary'])]);
  D(I, 'Send abroad – beneficiary', 'إرسال للخارج – المستفيد', [b.form([[['Beneficiary', 'المستفيد'], 'select', ['Demo user B', 'مستخدم تجريبي ب']], [['Payout code', 'رمز الدفع'], 'text', 'SIM-IBAN-0000-0001']], [['Continue', 'متابعة'], 'Send abroad – quote']), b.notice('info', ['The beneficiary is checked in a synthetic screening step.', 'يُفحص المستفيد في خطوة فحص تجريبية.'])]);
  D(I, 'Send abroad – quote', 'إرسال للخارج – عرض السعر', [b.quote({ rate: '1 USD = 3.62 ILS', fee: '0.00 USD', send: '100.00 USD', recv: '362.00 ILS', exp: '00:30' }), b.actions([[['Continue', 'متابعة'], 'Send abroad – review', 'primary'], [['Back', 'رجوع'], 'Send abroad – enter']])]);
  D(I, 'Send abroad – review', 'إرسال للخارج – مراجعة', [b.kv(['Review before you send', 'راجع قبل الإرسال'], [[['To', 'إلى'], ['Demo user B', 'مستخدم تجريبي ب']], [['You send', 'ترسل'], '100.00 USD'], [['Rate', 'السعر'], '1 USD = 3.62 ILS'], [['Fee', 'الرسوم'], '0.00 USD'], [['Exact amount received', 'المبلغ المستلم بالضبط'], '362.00 ILS', 1]]), b.notice('sim', SIMN), b.actions([[['Confirm and send', 'تأكيد وإرسال'], 'Send abroad – result', 'primary'], [['Back', 'رجوع'], 'Send abroad – quote']])]);
  D(I, 'Send abroad – result', 'إرسال للخارج – النتيجة', [b.receipt('ST-PENDING', '100.00 USD', [[['Exact amount received', 'المبلغ المستلم بالضبط'], '362.00 ILS']]), b.actions([[['Track transfer', 'تتبع التحويل'], 'Remittance – tracking', 'primary']])]);

  D(I, 'Business approvals inbox', 'صندوق موافقات الأعمال', [b.table('payouts', { filters: [['Status', 'الحالة']], to: 'Business approvals inbox' }), b.maker({ title: ['Approve payout request', 'الموافقة على طلب الدفع'] })]);

  /* ---- PSH (J4) ---- */
  var PSHN = ['PSH is a placeholder for a proposed instrument. Simulation only. It is not approved and cannot be redeemed.', 'PSH نائب مؤقت لأداة مقترحة. محاكاة فقط. وهي غير معتمدة ولا يمكن استردادها.'];
  D(I, 'PSH – overview', 'PSH – نظرة عامة', [b.notice('sim', PSHN, ['Placeholder', 'نائب مؤقت']), b.hero(['PSH balance (simulated)', 'رصيد PSH (محاكاة)'], '100.00 PSH', null, [[['Convert', 'تحويل'], 'PSH convert – enter', 'primary'], [['Redeem', 'استرداد'], 'PSH redeem – enter'], [['History', 'السجل'], 'PSH – history']])]);
  P.flow({ ifc: I, stem: 'PSH convert', ar: ['تحويل PSH – إدخال', 'تحويل PSH – مراجعة', 'تحويل PSH – النتيجة'], before: [b.notice('sim', PSHN)],
    fields: [[['From', 'من'], 'select', 'ILS'], [['Amount', 'المبلغ'], 'money', '100.00', null, ILS]], reviewRows: [[['You convert', 'تحوّل'], '100.00 ILS'], [['You receive (simulated)', 'تستلم (محاكاة)'], '100.00 PSH', 1], [['Rate (placeholder)', 'السعر (نائب مؤقت)'], '1 ILS = 1 PSH']], amount: '100.00 PSH', goal: 'PSH – overview' });
  P.flow({ ifc: I, stem: 'PSH redeem', ar: ['استرداد PSH – إدخال', 'استرداد PSH – مراجعة', 'استرداد PSH – النتيجة'], before: [b.notice('sim', PSHN)],
    fields: [[['Amount', 'المبلغ'], 'money', '50.00', null, 'PSH']], reviewRows: [[['You convert back', 'تحوّل مجددًا'], '50.00 PSH'], [['You receive (simulated)', 'تستلم (محاكاة)'], '50.00 ILS', 1]], status: 'ST-PENDING', amount: '50.00 PSH', goal: 'PSH – overview' });
  D(I, 'PSH – history', 'PSH – السجل', [b.notice('sim', PSHN), b.table('txns', { tools: false })]);

  /* ---- markets (J5) ---- */
  var PAPER = ['Paper trading only. Prices and results are simulated.', 'تداول ورقي فقط. الأسعار والنتائج محاكاة.'];
  D(I, 'Markets', 'الأسواق', [b.notice('sim', PAPER), b.table('markets', { to: 'Pair detail', tools: false })]);
  D(I, 'Pair detail', 'تفاصيل الزوج', [b.chart(['Price (simulated)', 'السعر (محاكاة)'], 'line', { pts: [30, 44, 38, 52, 48, 66, 60] }), b.book(), b.table('trades', { title: ['Recent trades', 'آخر الصفقات'], tools: false, n: 3 }), b.actions([[['Trade', 'تداول'], 'Order – enter (order ticket)', 'primary']])]);
  P.flow({ ifc: I, stem: 'Order', names: ['Order – enter (order ticket)', 'Order – review', 'Order – result'], ar: ['أمر – إدخال (تذكرة الأمر)', 'أمر – مراجعة', 'أمر – النتيجة'], before: [b.notice('sim', PAPER)],
    fields: [[['Side', 'الجهة'], 'select', ['Buy', 'شراء']], [['Type', 'النوع'], 'select', ['Limit', 'محدد']], [['Price', 'السعر'], 'money', '41,980.00', null, 'USD'], [['Amount', 'الكمية'], 'text', '0.010']],
    reviewRows: [[['Pair', 'الزوج'], 'BTC / USD (paper)'], [['Side', 'الجهة'], ['Buy', 'شراء']], [['Price', 'السعر'], '41,980.00 USD'], [['Estimated cost incl. fee', 'التكلفة التقديرية مع الرسوم'], '419.80 USD', 1], [['Available balance', 'الرصيد المتاح'], '1,000.00 USD']],
    after: [b.notice('warn', ['Price is outside the protection band: your order may not fill.', 'السعر خارج نطاق الحماية: قد لا يُنفَّذ أمرك.'])], status: 'ST-PENDING', amount: '419.80 USD', goal: 'Open orders' });
  D(I, 'Open orders', 'الأوامر المفتوحة', [b.table('orders', { filters: [['Pair', 'الزوج']], cta: [['New order', 'أمر جديد'], 'Order – enter (order ticket)'] })], { empty: [['No open orders', 'لا توجد أوامر مفتوحة'], ['Your open paper orders will appear here.', 'ستظهر هنا أوامرك الورقية المفتوحة.']] });
  D(I, 'Trades', 'الصفقات', [b.table('trades', { filters: [['Pair', 'الزوج']] })]);
  D(I, 'Portfolio', 'المحفظة الاستثمارية', [b.notice('sim', PAPER), b.table('portfolio', { tools: false })]);
  D(I, 'Crypto deposit (sim)', 'إيداع عملة مشفرة (محاكاة)', [b.notice('danger', ['SIMULATED — do not send real crypto. This address is fake.', 'محاكاة — لا ترسل عملات مشفرة حقيقية. هذا العنوان وهمي.'], ['Warning', 'تحذير']), b.qr(['SIM-ADDR-0000-FAKE', 'SIM-ADDR-0000-FAKE'], { invalid: true, seed: 2 }), b.kv(null, [[['Address (fake)', 'العنوان (وهمي)'], 'SIM-ADDR-0000-FAKE']])]);
  P.flow({ ifc: I, stem: 'Crypto withdraw', names: ['Crypto withdraw – enter (sim)', 'Crypto withdraw – review (sim)', 'Crypto withdraw – result (sim)'], ar: ['سحب عملة مشفرة – إدخال (محاكاة)', 'سحب عملة مشفرة – مراجعة (محاكاة)', 'سحب عملة مشفرة – النتيجة (محاكاة)'], before: [b.notice('sim', ['SIMULATED. No real crypto is sent.', 'محاكاة. لا تُرسل أي عملة مشفرة حقيقية.'])],
    fields: [[['Destination (fake format)', 'الوجهة (صيغة وهمية)'], 'text', 'SIM-ADDR-0000-FAKE'], [['Amount', 'الكمية'], 'text', '0.005']], reviewRows: [[['Destination', 'الوجهة'], 'SIM-ADDR-0000-FAKE'], [['Amount', 'الكمية'], '0.005 BTC (paper)', 1]], status: 'ST-PENDING', amount: '0.005 BTC', goal: 'Portfolio' });

  /* ---- inclusion (phase 11) ---- */
  D(I, 'Explore partners', 'استكشاف الشركاء', [b.notice('info', ['Partners are demonstration examples. No lending or advice is offered.', 'الشركاء أمثلة توضيحية. لا يُقدَّم أي إقراض أو نصيحة.']), b.table('partnerslist', { tools: false, n: 2 })]);
  D(I, 'Consent', 'الموافقات', [b.form([[['Share my activity summary with partners', 'مشاركة ملخص نشاطي مع الشركاء'], 'switch', false], [['Receive learning material', 'استلام مواد تعليمية'], 'switch', true]], [['Save choices', 'حفظ الخيارات'], 'Profile'])]);
  D(I, 'Referrals', 'الإحالات', [b.notice('info', ['A referral only shares information with your consent.', 'لا تشارك الإحالة المعلومات إلا بموافقتك.']), b.table('partnerslist', { tools: false, n: 2 }), b.actions([[['Manage consent', 'إدارة الموافقات'], 'Consent']])]);
})();

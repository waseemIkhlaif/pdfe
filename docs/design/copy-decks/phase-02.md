# Copy deck: phase 02 (platform foundation)

Draft copy for the Phase 2 screens (sign-in, MFA, demo role picker, shells, language switcher, global error, permission denied, admin, config, scenario controller, audit search). Format: `specs/000-ux-design-track/contracts/artifact-formats.md` section 11; rules: `docs/design/copy-decks/TEMPLATE.md`.
Every Arabic string is a **draft**: the implementer review (`AR review`) and the native-speaker spot-check (`Native check`) are still pending (task T077), so no row is approved.

| Key | English | Arabic | Regulated | AR review | Native check | Legal | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| sim.banner | SIMULATION — NOT REAL MONEY | محاكاة — ليست أموالاً حقيقية | yes | pending | pending | pending | draft | Constitution Article VIII; must match exactly |
| auth.signin.title | Sign in | تسجيل الدخول | no | pending | n/a | n/a | draft |  |
| auth.signin.username | Username | اسم المستخدم | no | pending | n/a | n/a | draft |  |
| auth.signin.password | Password | كلمة المرور | no | pending | n/a | n/a | draft |  |
| auth.signin.submit | Sign in | دخول | no | pending | n/a | n/a | draft |  |
| auth.signin.demoNote | Demo accounts only. No real accounts exist. | حسابات تجريبية فقط. لا توجد حسابات حقيقية. | yes | pending | pending | pending | draft | Simulation boundary |
| auth.mfa.title | Enter your code | أدخل الرمز | no | pending | n/a | n/a | draft |  |
| auth.mfa.help | Enter the 6-digit code from your authenticator app. | أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة. | no | pending | n/a | n/a | draft |  |
| roles.picker.title | Choose a demo role | اختر دورًا تجريبيًا | no | pending | n/a | n/a | draft |  |
| roles.picker.note | You are choosing a role inside a simulation. | أنت تختار دورًا داخل محاكاة. | yes | pending | pending | pending | draft | Roles and simulation boundary |
| lang.switch.label | Language | اللغة | no | pending | n/a | n/a | draft |  |
| digits.label | Digits | الأرقام | no | pending | n/a | n/a | draft |  |
| digits.western | Western (0-9) | غربية (0-9) | no | pending | n/a | n/a | draft | Default for amounts, pending research |
| digits.arabicIndic | Arabic-Indic | هندية عربية | no | pending | n/a | n/a | draft |  |
| error.global.title | Something went wrong | حدث خطأ ما | no | pending | n/a | n/a | draft |  |
| error.global.body | We could not complete that. Try again. | تعذّر إكمال هذا. حاول مرة أخرى. | no | pending | n/a | n/a | draft |  |
| error.correlation.label | Reference | المرجع | no | pending | n/a | n/a | draft | Shown with {correlationId} |
| error.correlation.copy | Copy reference | نسخ المرجع | no | pending | n/a | n/a | draft |  |
| error.correlation.copied | Reference copied | تم نسخ المرجع | no | pending | n/a | n/a | draft | Announced to assistive technology |
| error.retry | Try again | حاول مرة أخرى | no | pending | n/a | n/a | draft |  |
| permission.denied.title | You do not have access | ليس لديك صلاحية الوصول | no | pending | n/a | n/a | draft |  |
| permission.denied.body | Ask an administrator for access to this page. | اطلب من المسؤول صلاحية الوصول إلى هذه الصفحة. | yes | pending | pending | pending | draft | Roles |
| status.draft | Draft | مسودة | no | pending | pending | n/a | draft | From the status vocabulary |
| status.pending | Pending | قيد الانتظار | no | pending | pending | n/a | draft | From the status vocabulary |
| status.held | Held | معلّقة | no | pending | pending | n/a | draft | From the status vocabulary |
| status.underReview | Under review | قيد المراجعة | no | pending | pending | n/a | draft | From the status vocabulary |
| status.completed | Completed | مكتملة | no | pending | pending | n/a | draft | From the status vocabulary |
| status.failed | Failed | فشلت | no | pending | pending | n/a | draft | From the status vocabulary |
| status.reversed | Reversed | تم عكسها | no | pending | pending | n/a | draft | From the status vocabulary |
| status.expired | Expired | منتهية الصلاحية | no | pending | pending | n/a | draft | From the status vocabulary |
| admin.users.title | Users | المستخدمون | no | pending | n/a | n/a | draft |  |
| admin.roles.title | Roles | الأدوار | no | pending | n/a | n/a | draft |  |
| config.list.title | Configuration | الإعدادات | no | pending | n/a | n/a | draft |  |
| config.diff.title | Review changes | مراجعة التغييرات | no | pending | n/a | n/a | draft |  |
| config.approve.submit | Approve | موافقة | no | pending | n/a | n/a | draft |  |
| config.approve.selfBlocked | You cannot approve your own change. | لا يمكنك الموافقة على تغيير قمت به. | yes | pending | pending | pending | draft | Separation of duties |
| scenario.run.title | Run a scenario | تشغيل سيناريو | no | pending | n/a | n/a | draft |  |
| scenario.run.note | Scenarios use synthetic data only. | تستخدم السيناريوهات بيانات اصطناعية فقط. | yes | pending | pending | pending | draft | Simulation boundary |
| audit.search.title | Audit search | البحث في سجل التدقيق | no | pending | n/a | n/a | draft |  |
| audit.verify.submit | Verify integrity | التحقق من السلامة | no | pending | n/a | n/a | draft |  |

import type { ErrorText } from './ErrorView';

/**
 * The words of the error screen in Arabic and English. A stand-in for the shared message catalog (`@pdfe/i18n`, keys
 * `errors.*`), which arrives with the navigable-shells story; the keys are the API's `message_key` values.
 */
const TEXT: Record<'ar' | 'en', Record<string, string>> & Record<string, Record<string, string>> = {
  en: {
    'errors.internal': 'Something went wrong on our side. Nothing was changed.',
    'errors.forbidden': 'You do not have permission to do this.',
    'errors.rate_limited': 'Too many requests. Please wait a moment and try again.',
    title: 'Something went wrong',
    reference: 'Reference',
    copy: 'Copy',
    copied: 'Copied',
  },
  ar: {
    'errors.internal': 'حدث خطأ من جانبنا. لم يتغير شيء.',
    'errors.forbidden': 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
    'errors.rate_limited': 'طلبات كثيرة جدًا. انتظر قليلًا ثم حاول مرة أخرى.',
    title: 'حدث خطأ ما',
    reference: 'المرجع',
    copy: 'نسخ',
    copied: 'تم النسخ',
  },
};

export function errorText(locale: string, messageKey = 'errors.internal'): ErrorText {
  const t = TEXT[locale === 'ar' ? 'ar' : 'en']!;
  return {
    title: t.title!,
    message: t[messageKey] ?? t['errors.internal']!,
    reference: t.reference!,
    copy: t.copy!,
    copied: t.copied!,
  };
}

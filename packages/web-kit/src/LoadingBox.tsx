'use client';

import { useParams } from 'next/navigation';
import { StateBox } from '@pdfe/ui-web';
import { isLocale, translate } from '@pdfe/i18n';

/**
 * What an app shows while a page loads (`loading.tsx`): a skeleton marked `aria-busy`, labelled in the language of the URL.
 * It is a client component only to read the `[locale]` segment; the layout above it (banner, frame) is already on screen.
 */
export function LoadingBox() {
  const params = useParams<{ locale?: string }>();
  const locale = isLocale(params.locale) ? params.locale : 'ar';
  return (
    <div className="content" data-testid="loading">
      <StateBox kind="loading" label={translate(locale, 'ui.loading')} />
    </div>
  );
}

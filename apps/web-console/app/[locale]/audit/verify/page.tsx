import { getTranslator } from '@pdfe/i18n/next';
import { Button, Card, KeyValue, Ltr, Notice, TextField } from '@pdfe/ui-web';
import { Screen, localeOf, pageStateOf, type PageProps } from '@pdfe/web-kit';
import { first } from '../../../../src/ui';
import { verifyChain } from './actions';

/** CMP-012: check the hash chain and its anchors. The result of a check is in the address, so it can be shared. */
export default async function VerifyPage({ params, searchParams }: PageProps) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: '/audit/verify' };
  const result = first(sp.result);
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('screen.cmp-012.title')}
      state={pageStateOf(sp.state)}
      render={() => (
        <>
          {result === 'ok' ? (
            <Notice tone="success">
              {t('ui.the-hash-chain-is-intact-for-the-selecte')}{' '}
              <Ltr>{`${first(sp.from) ?? ''}–${first(sp.to) ?? ''}`}</Ltr> (
              <Ltr>{first(sp.events) ?? '0'}</Ltr>)
            </Notice>
          ) : result === 'broken' ? (
            <Notice tone="danger">
              <b>{t('impl.verify.broken')}</b>{' '}
              <Ltr>{`#${first(sp.seq) ?? ''} ${first(sp.reason) ?? ''}`}</Ltr>
            </Notice>
          ) : result === 'error' ? (
            <Notice tone="danger">{t('impl.verify.refused')}</Notice>
          ) : null}
          <Card>
            <form action={verifyChain.bind(null, locale)} className="form">
              <TextField
                id="from_seq"
                label={t('ui.from')}
                type="number"
                min={1}
                step={1}
                style={{ direction: 'ltr' }}
              />
              <TextField
                id="to_seq"
                label={t('ui.to')}
                type="number"
                min={1}
                step={1}
                style={{ direction: 'ltr' }}
              />
              <div className="actions">
                <Button tone="primary">{t('ui.verify-integrity')}</Button>
              </div>
            </form>
          </Card>
          {result === 'ok' ? (
            <KeyValue rows={[{ label: t('ui.status'), value: t('ui.verified') }]} />
          ) : null}
        </>
      )}
    />
  );
}

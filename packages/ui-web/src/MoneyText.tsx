/** Decimal places of the currencies the demo shows. Money is always an integer in minor units (constitution Article III). */
const EXPONENT: Record<string, number> = { ILS: 2, JOD: 3, USD: 2, EUR: 2, USDC: 6 };

/**
 * `120.50 ILS` from 12050 minor units. Integer arithmetic only (no floating point touches an amount), Western digits and a
 * comma for thousands whatever the page language: amounts read the same in Arabic and English, and sit inside `<bdi>`.
 */
export function formatMinor(minor: number | bigint, currency: string): string {
  const exp = EXPONENT[currency] ?? 2;
  const value = typeof minor === 'bigint' ? minor : BigInt(Math.trunc(minor));
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const unit = 10n ** BigInt(exp);
  const whole = (abs / unit).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = exp > 0 ? `.${(abs % unit).toString().padStart(exp, '0')}` : '';
  return `${negative ? '-' : ''}${whole}${fraction} ${currency}`;
}

export function MoneyText({ minor, currency }: { minor: number | bigint; currency: string }) {
  return (
    <bdi className="ltr" dir="ltr" data-money="1">
      {formatMinor(minor, currency)}
    </bdi>
  );
}

/** An identifier, a reference or any other left-to-right token inside running text of either direction. */
export function Ltr({ children }: { children: string | number }) {
  return (
    <bdi className="ltr" dir="ltr">
      {children}
    </bdi>
  );
}

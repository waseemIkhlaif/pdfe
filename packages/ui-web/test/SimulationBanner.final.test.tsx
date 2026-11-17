import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';
import { Z_BANNER, Z_PORTAL } from '../src/layers';
import { SimShell } from '../src/SimShell';
import { SimulationBanner } from '../src/SimulationBanner';

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('SimulationBanner (final)', () => {
  it('accepts no props', () => {
    expectTypeOf(SimulationBanner).parameters.toEqualTypeOf<[]>();
    // @ts-expect-error a page cannot pass props to hide, shorten or restyle the banner
    SimulationBanner({ hidden: true });
  });

  it('is a full-width sticky status region marked data-sim, with the exact text', () => {
    const doc = parse(renderToStaticMarkup(<SimulationBanner />));
    const el = doc.querySelector('[data-sim="1"]') as HTMLElement;
    expect(el.getAttribute('role')).toBe('status');
    expect(el.style.position).toBe('sticky');
    expect(el.style.inlineSize).toBe('100%');
    expect(el.textContent).toContain(SIM_LABEL_EN);
    expect(el.textContent).toContain(SIM_LABEL_AR);
    expect(el.querySelector('bdi[lang="en"]')?.textContent).toBe(SIM_LABEL_EN);
    expect(el.querySelector('bdi[lang="ar"]')?.textContent).toBe(SIM_LABEL_AR);
  });
});

describe('SimShell', () => {
  const shell = (
    children: React.ReactNode = <main id="page">page</main>,
    locale: 'ar' | 'en' = 'en',
  ) => parse(renderToStaticMarkup(<SimShell locale={locale}>{children}</SimShell>));

  it('always renders exactly one banner, whatever the page renders', () => {
    for (const children of [null, <main key="m" />, <div key="d" data-sim="1" />]) {
      const doc = shell(children);
      expect(doc.querySelectorAll('[role="status"][data-sim="1"]').length).toBeGreaterThanOrEqual(
        1,
      );
      expect(doc.querySelectorAll('body > [role="status"][data-sim="1"]')).toHaveLength(1);
    }
  });

  it('puts the banner first in the body, before the page content and the portal container', () => {
    const doc = shell();
    const order = [...doc.body.children].map((c) => c.getAttribute('data-sim') ?? c.id);
    expect(order).toEqual(['1', 'pdfe-content', 'pdfe-portal-root']);
  });

  it('puts the banner above the portal container in the stacking order', () => {
    expect(Z_BANNER).toBeGreaterThan(Z_PORTAL);
    const doc = shell();
    const root = doc.documentElement.getAttribute('style') ?? '';
    expect(root).toContain(`--pdfe-z-banner:${Z_BANNER}`);
    expect(root).toContain(`--pdfe-z-portal:${Z_PORTAL}`);
    expect((doc.getElementById('pdfe-portal-root') as HTMLElement).style.zIndex).toBe(
      String(Z_PORTAL),
    );
  });

  it('sets language and direction from the locale', () => {
    expect(shell(undefined, 'ar').documentElement.getAttribute('dir')).toBe('rtl');
    expect(shell(undefined, 'ar').documentElement.getAttribute('lang')).toBe('ar');
    expect(shell(undefined, 'en').documentElement.getAttribute('dir')).toBe('ltr');
  });
});

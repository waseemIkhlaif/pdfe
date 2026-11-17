import type { CSSProperties } from 'react';
import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';
import { Z_BANNER } from './layers';

const style: CSSProperties = {
  position: 'sticky',
  insetBlockStart: 0,
  zIndex: `var(--pdfe-z-banner, ${Z_BANNER})` as unknown as number,
  inlineSize: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--pdfe-space-8, 8px)',
  padding: 'var(--pdfe-space-4, 4px) var(--pdfe-space-16, 16px)',
  background: 'var(--pdfe-color-simulation-accent-bg, #fde68a)',
  color: 'var(--pdfe-color-simulation-accent-fg, #451a03)',
  borderBlockEnd: '3px solid var(--pdfe-color-simulation-accent, #b45309)',
  fontWeight: 700,
  fontSize: 'var(--pdfe-font-size-12, 12px)',
  textAlign: 'center',
};

/**
 * The simulation banner (constitution Article VIII, FR-022): sticky, full width, a status region, and the same
 * bilingual text on every screen in either language. It takes no props, so a page cannot hide, shorten or restyle it.
 * Pages never render it themselves: SimShell does, in the root layout.
 */
export function SimulationBanner() {
  return (
    <div role="status" data-sim="1" style={style}>
      <bdi lang="en" dir="ltr">
        {SIM_LABEL_EN}
      </bdi>
      <span aria-hidden="true">{' / '}</span>
      <bdi lang="ar" dir="rtl">
        {SIM_LABEL_AR}
      </bdi>
    </div>
  );
}

import type { CSSProperties } from 'react';
import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';

const style: CSSProperties = {
  position: 'sticky',
  insetBlockStart: 0,
  zIndex: 1000,
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
 * Minimal banner (feature 001). It takes no props, so a page cannot hide or change it.
 * The final, locale-aware version replaces it in the labelling story.
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

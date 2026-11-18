import type { CSSProperties } from 'react';
import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';
import { Icon } from './Icon';
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
  // The diagonal hatch of the approved design: the banner is recognisable even without reading it.
  backgroundImage:
    'repeating-linear-gradient(135deg, transparent 0 10px, rgba(245,158,11,.25) 10px 20px)',
};

/** Shows the label in the page language only. The page language is the `lang` of the root element. */
export const HIDE_OTHER_LANGUAGE =
  'html[lang="ar"] .pdfe-sim-en,html[lang="en"] .pdfe-sim-ar{display:none}';

/**
 * The simulation banner (constitution Article VIII, FR-022): sticky, full width, a status region, on every screen.
 * Its visible text is the label in the language of the page (`<html lang>`): `SIMULATION — NOT REAL MONEY` or
 * `محاكاة — ليست أموالاً حقيقية` (contracts/ui-shell.md). Both strings are in the markup and a rule hides the one that
 * does not match, so the label is present in either language even before styles load. It takes no props, so a page
 * cannot hide, shorten or restyle it. Pages never render it themselves: SimShell does, in the root layout.
 */
export function SimulationBanner() {
  return (
    <div role="status" data-sim="1" style={style}>
      <style>{HIDE_OTHER_LANGUAGE}</style>
      <Icon name="info" />
      <bdi className="pdfe-sim-en" lang="en" dir="ltr">
        {SIM_LABEL_EN}
      </bdi>
      <bdi className="pdfe-sim-ar" lang="ar" dir="rtl">
        {SIM_LABEL_AR}
      </bdi>
    </div>
  );
}

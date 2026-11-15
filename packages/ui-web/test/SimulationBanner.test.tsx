import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SIM_LABEL, SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';
import { SimulationBanner } from '../src/SimulationBanner';

afterEach(cleanup);

describe('SimulationBanner (minimal)', () => {
  it('is a status region marked data-sim="1"', () => {
    render(<SimulationBanner />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('data-sim')).toBe('1');
  });

  it('shows the exact bilingual label from the single source', () => {
    render(<SimulationBanner />);
    const el = screen.getByRole('status');
    expect(el.textContent).toBe(SIM_LABEL);
    expect(el.textContent).toContain(SIM_LABEL_EN);
    expect(el.textContent).toContain(SIM_LABEL_AR);
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorView } from '../src/ErrorView';
import { errorText } from '../src/errorText';

afterEach(cleanup);
const ID = 'COR-019bc0ab-2400-70d6-91a3-b4f2199938f3';

describe('ErrorView', () => {
  it('shows the message, and the correlation ID inside a left-to-right <bdi>', () => {
    render(<ErrorView text={errorText('ar')} correlationId={ID} />);
    const id = screen.getByTestId('correlation-id');
    expect(id.tagName).toBe('BDI');
    expect(id.getAttribute('dir')).toBe('ltr');
    expect(id.textContent).toBe(ID);
    expect(screen.getByRole('alert').textContent).toContain(errorText('ar').message);
  });

  it('shows no reference line when there is no ID', () => {
    render(<ErrorView text={errorText('en')} />);
    expect(screen.queryByTestId('correlation-id')).toBeNull();
    expect(screen.queryByTestId('copy-correlation-id')).toBeNull();
  });

  it('the copy button puts the ID on the clipboard and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ErrorView text={errorText('en')} correlationId={ID} />);
    const button = screen.getByTestId('copy-correlation-id');
    expect(button.textContent).toBe('Copy');
    fireEvent.click(button);
    await waitFor(() => expect(button.textContent).toBe('Copied'));
    expect(writeText).toHaveBeenCalledWith(ID);
  });

  it('keeps the label when the browser refuses to copy', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    render(<ErrorView text={errorText('en')} correlationId={ID} />);
    const button = screen.getByTestId('copy-correlation-id');
    fireEvent.click(button);
    await waitFor(() => expect(button.textContent).toBe('Copy'));
    expect(screen.getByTestId('correlation-id').textContent).toBe(ID); // still on screen to copy by hand
  });
});

describe('errorText', () => {
  it('has Arabic and English, falls back to the generic message for an unknown key, and to English for another language', () => {
    expect(errorText('ar').title).not.toBe(errorText('en').title);
    expect(errorText('en', 'errors.no_such_code').message).toBe(errorText('en').message);
    expect(errorText('fr').title).toBe(errorText('en').title);
    expect(errorText('en', 'errors.forbidden').message).not.toBe(errorText('en').message);
  });
});

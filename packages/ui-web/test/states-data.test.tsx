import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Pager, SelectField, StateBox, Switch, Table, TextArea, TextField } from '../src';

afterEach(cleanup);
const ID = 'COR-019bc0ab-2400-70d6-91a3-b4f2199938f3';

describe('StateBox', () => {
  it('empty is a status with a title and a hint', () => {
    render(
      <StateBox
        kind="empty"
        title="Nothing here yet"
        body="New simulated items will appear here."
      />,
    );
    const box = screen.getByRole('status');
    expect(box.getAttribute('data-state')).toBe('empty');
    expect(box.textContent).toContain('Nothing here yet');
  });

  it('loading is a skeleton marked aria-busy with an accessible label', () => {
    const { container } = render(<StateBox kind="loading" label="Loading" />);
    const box = screen.getByRole('status', { name: 'Loading' });
    expect(box.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('.skel').length).toBeGreaterThan(2);
  });

  it('error is an alert with the correlation ID in a <bdi> and a copy button that copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(
      <StateBox
        kind="error"
        title="Something went wrong"
        body="We could not complete that."
        reference="Reference"
        correlationId={ID}
        copy="Copy reference"
        copied="Copied"
        retry={{ label: 'Try again', href: '/en' }}
      />,
    );
    expect(screen.getByRole('alert').getAttribute('data-state')).toBe('error');
    const id = screen.getByTestId('correlation-id');
    expect(id.tagName).toBe('BDI');
    expect(id.textContent).toBe(ID);
    fireEvent.click(screen.getByTestId('copy-correlation-id'));
    await waitFor(() =>
      expect(screen.getByTestId('copy-correlation-id').textContent).toBe('Copied'),
    );
    expect(writeText).toHaveBeenCalledWith(ID);
    expect(screen.getByRole('link', { name: 'Try again' }).getAttribute('href')).toBe('/en');
  });

  it('error without an ID has no reference line', () => {
    render(<StateBox kind="error" title="t" body="b" reference="Reference" copy="c" copied="d" />);
    expect(screen.queryByTestId('correlation-id')).toBeNull();
  });

  it('denied is an alert with a way back', () => {
    render(
      <StateBox
        kind="denied"
        title="You do not have access"
        body="Ask an administrator."
        back={{ label: 'Go back', href: '/en' }}
      />,
    );
    expect(screen.getByRole('alert').getAttribute('data-state')).toBe('denied');
    expect(screen.getByRole('link', { name: 'Go back' }).getAttribute('href')).toBe('/en');
  });
});

describe('Table and Pager', () => {
  it('has column headers with scope, labelled cells for the narrow layout, and a caption', () => {
    const { container } = render(
      <Table
        caption="Settings"
        columns={[
          { key: 'a', label: 'Setting' },
          { key: 'b', label: 'Value' },
        ]}
        rows={[{ a: <a href="/x">Transfer limit</a>, b: '120.50 ILS' }]}
      />,
    );
    expect(screen.getAllByRole('columnheader').map((h) => h.getAttribute('scope'))).toEqual([
      'col',
      'col',
    ]);
    expect(container.querySelector('caption')!.textContent).toBe('Settings');
    expect(container.querySelectorAll('td')[1]!.getAttribute('data-label')).toBe('Value');
    expect(screen.getByRole('link', { name: 'Transfer limit' })).toBeTruthy();
  });

  it('Pager links to the neighbours that exist and disables the rest', () => {
    render(<Pager summary="Showing 1–4 of 4" next={{ label: 'Next', href: '?page=2' }} />);
    expect(screen.getByText('Showing 1–4 of 4')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Next' }).getAttribute('href')).toBe('?page=2');
    expect(screen.queryByRole('link', { name: 'Previous' })).toBeNull();
  });
});

describe('form fields', () => {
  it('a label is tied to its control, and a hint and an error to its description', () => {
    render(<TextField id="reason" label="Reason" hint="Why this change" error="Required" />);
    const input = screen.getByLabelText('Reason');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('reason-hint reason-error');
    expect(screen.getByRole('alert').textContent).toBe('Required');
  });

  it('the control carries its name for a form post, and a field without an error is valid', () => {
    render(<TextArea id="why" label="Why" />);
    const ta = screen.getByLabelText('Why') as HTMLTextAreaElement;
    expect(ta.name).toBe('why');
    expect(ta.getAttribute('aria-invalid')).toBeNull();
    expect(ta.getAttribute('aria-describedby')).toBeNull();
  });

  it('SelectField lists its options and Switch is a labelled switch', () => {
    render(
      <>
        <SelectField
          id="state"
          label="State"
          options={[
            { value: 'a', label: 'Active' },
            { value: 'd', label: 'Draft' },
          ]}
        />
        <Switch id="paper" label="Paper trading" checked />
      </>,
    );
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Active', 'Draft']);
    const sw = screen.getByRole('switch', { name: 'Paper trading' }) as HTMLInputElement;
    expect(sw.checked).toBe(true);
    expect(sw.closest('label')!.className).toContain('on');
  });
});

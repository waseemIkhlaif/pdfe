import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/**
 * Form fields of the approved design: a label above, the control, a hint and an error under it. The label is tied to the
 * control by `htmlFor`/`id`, the hint and the error by `aria-describedby`, so a screen reader reads all of them.
 */
interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

function Wrap({ id, label, hint, error, children }: FieldProps & { children: ReactNode }) {
  return (
    <div className={`field${error ? ' err' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          className="hint"
          id={`${id}-error`}
          role="alert"
          style={{ color: 'var(--pdfe-color-semantic-danger-fg)' }}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;

export function TextField({
  id,
  label,
  hint,
  error,
  ...rest
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>) {
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        name={rest.name ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </Wrap>
  );
}

export function TextArea({
  id,
  label,
  hint,
  error,
  ...rest
}: FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>) {
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        name={rest.name ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </Wrap>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  options,
  ...rest
}: FieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
    options: { value: string; label: string }[];
  }) {
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        name={rest.name ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

/** A labelled on/off switch (a checkbox underneath, so it works without scripts). */
export function Switch({
  id,
  label,
  checked,
  disabled,
  name,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <label className={`switch${checked ? ' on' : ''}`} htmlFor={id}>
      <input
        id={id}
        name={name ?? id}
        type="checkbox"
        role="switch"
        defaultChecked={checked}
        disabled={disabled}
        style={{ position: 'absolute', opacity: 0, inlineSize: 1, blockSize: 1 }}
      />
      <i aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

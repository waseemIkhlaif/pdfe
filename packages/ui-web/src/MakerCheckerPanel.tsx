import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { TextArea } from './fields';

export interface MakerCheckerText {
  title: string;
  requester: ReactNode;
  approver: ReactNode;
  reason: string;
  approve: string;
  reject: string;
  /** The heading and body of the separation-of-duties notice. */
  conflictTitle: string;
  conflictBody: string;
}

type FormAction = (formData: FormData) => void | Promise<void>;

/**
 * The decision form of an approval (maker-checker, FR-016): who asked, who is deciding, the reason, and Approve and Reject.
 * When the person looking is the one who asked, Approve is disabled and the notice says why (the API refuses it too, with
 * 409 SELF_APPROVAL: this is the courtesy, not the control). Both buttons post to the actions the page passes in, so the
 * decision is made on the server with the user's own token.
 */
export function MakerCheckerPanel({
  text,
  requester,
  approver,
  selfRequested,
  decidable = true,
  defaultReason,
  approveAction,
  rejectAction,
  hidden,
}: {
  text: MakerCheckerText;
  requester: ReactNode;
  approver: ReactNode;
  selfRequested: boolean;
  /** False once the request is no longer pending: the form is not shown. */
  decidable?: boolean;
  defaultReason?: string;
  approveAction: FormAction;
  rejectAction: FormAction;
  /** Fields carried with the form (the request ID, where to return to). */
  hidden?: Record<string, string>;
}) {
  const fields = Object.entries(hidden ?? {}).map(([k, v]) => (
    <input key={k} type="hidden" name={k} value={v} />
  ));
  return (
    <section className="card maker" data-testid="maker-checker">
      <h2 className="block-title">{text.title}</h2>
      <dl className="kv">
        <dt>{text.requester}</dt>
        <dd>{requester}</dd>
        <dt>{text.approver}</dt>
        <dd>{approver}</dd>
      </dl>
      {selfRequested ? (
        <div className="notice warn" role="alert" data-testid="sod-notice">
          <Icon name="alert" />
          <div>
            <b>{text.conflictTitle}</b>
            {text.conflictBody}
          </div>
        </div>
      ) : null}
      {decidable ? (
        <form>
          {fields}
          <TextArea
            id="decision-reason"
            name="reason"
            label={text.reason}
            defaultValue={defaultReason ?? ''}
            required
          />
          <div className="actions" style={{ marginBlockStart: 'var(--pdfe-space-12)' }}>
            <button
              className="btn primary"
              type="submit"
              formAction={approveAction}
              disabled={selfRequested}
              data-testid="approve"
            >
              {text.approve}
            </button>
            <button
              className="btn danger"
              type="submit"
              formAction={rejectAction}
              data-testid="reject"
            >
              {text.reject}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

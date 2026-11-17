import { CopyButton } from './CopyButton';

/** Everything the error screen says, in the language of the page. */
export interface ErrorText {
  title: string;
  /** The message for the error code, from its `message_key`. */
  message: string;
  /** Label before the correlation ID: "Reference". */
  reference: string;
  copy: string;
  copied: string;
}

/**
 * The screen a user sees when something failed. It shows the correlation ID of the failed request inside `<bdi>`
 * (an ID is left-to-right text, also in an Arabic sentence) with a button to copy it, so the user can quote it and
 * someone can find the logs, the trace and the audit event of that very request (SC-012).
 */
export function ErrorView({ text, correlationId }: { text: ErrorText; correlationId?: string }) {
  return (
    <main data-testid="error-view" role="alert">
      <h1>{text.title}</h1>
      <p>{text.message}</p>
      {correlationId ? (
        <p data-testid="correlation-reference">
          <span>{text.reference}</span>{' '}
          <bdi dir="ltr" data-testid="correlation-id">
            {correlationId}
          </bdi>{' '}
          <CopyButton value={correlationId} label={text.copy} copiedLabel={text.copied} />
        </p>
      ) : null}
    </main>
  );
}

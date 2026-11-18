import { StateBox } from './StateBox';

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
 * someone can find the logs, the trace and the audit event of that very request (SC-012). It is the `error` state box of
 * the shell, so it looks like every other failed page.
 */
export function ErrorView({
  text,
  correlationId,
  retryHref,
  retryLabel,
}: {
  text: ErrorText;
  correlationId?: string;
  retryHref?: string;
  retryLabel?: string;
}) {
  return (
    <StateBox
      kind="error"
      title={text.title}
      body={text.message}
      reference={text.reference}
      copy={text.copy}
      copied={text.copied}
      {...(correlationId ? { correlationId } : {})}
      {...(retryHref && retryLabel ? { retry: { label: retryLabel, href: retryHref } } : {})}
    />
  );
}

import type { ReactNode } from 'react';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';

/**
 * The five states every route can be in (contracts/ui-shell.md): the populated page itself, and these four boxes. `loading`
 * is a skeleton marked `aria-busy`; `error` carries the correlation ID of the failed request with a button to copy it;
 * `denied` is what a 403 shows. Text comes in already translated.
 */
export type StateBoxProps =
  | { kind: 'empty'; title: string; body: string }
  | { kind: 'loading'; label: string }
  | {
      kind: 'error';
      title: string;
      body: string;
      reference: string;
      correlationId?: string;
      copy: string;
      copied: string;
      retry?: { label: string; href: string };
    }
  | { kind: 'denied'; title: string; body: string; back?: { label: string; href: string } };

export function StateBox(props: StateBoxProps): ReactNode {
  switch (props.kind) {
    case 'empty':
      return (
        <div className="state-box" role="status" data-state="empty">
          <Icon name="inbox" />
          <strong>{props.title}</strong>
          <span className="muted">{props.body}</span>
        </div>
      );
    case 'loading':
      return (
        <div aria-busy="true" role="status" aria-label={props.label} data-state="loading">
          <div className="skel" style={{ blockSize: 28, inlineSize: '40%' }} />
          <div className="skel" style={{ blockSize: 96, marginBlock: 12 }} />
          <div className="skel" style={{ blockSize: 16, marginBlock: 8 }} />
          <div className="skel" style={{ blockSize: 16, inlineSize: '80%', marginBlock: 8 }} />
          <div className="skel" style={{ blockSize: 120, marginBlock: 12 }} />
        </div>
      );
    case 'error':
      return (
        <div className="state-box err" role="alert" data-state="error" data-testid="error-view">
          <Icon name="alert" />
          <strong>{props.title}</strong>
          <span>{props.body}</span>
          {props.correlationId ? (
            <span className="corr" data-testid="correlation-reference">
              <span>{props.reference}</span>
              <bdi className="ltr" dir="ltr" data-testid="correlation-id">
                {props.correlationId}
              </bdi>
              <CopyButton
                value={props.correlationId}
                label={props.copy}
                copiedLabel={props.copied}
              />
            </span>
          ) : null}
          {props.retry ? (
            <a className="btn primary" href={props.retry.href}>
              {props.retry.label}
            </a>
          ) : null}
        </div>
      );
    case 'denied':
      return (
        <div className="state-box den" role="alert" data-state="denied">
          <Icon name="lock" />
          <strong>{props.title}</strong>
          <span>{props.body}</span>
          {props.back ? (
            <a className="btn" href={props.back.href}>
              {props.back.label}
            </a>
          ) : null}
        </div>
      );
  }
}

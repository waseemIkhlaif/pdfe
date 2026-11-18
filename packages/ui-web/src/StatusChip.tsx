import { Icon, type IconName } from './Icon';

/**
 * The status vocabulary of the approved design (docs/design/content/status-vocabulary.md): the same eight words, icons and
 * colours everywhere, so a status is never a colour alone.
 */
export const STATUSES = {
  draft: { icon: 'pencil', tone: 'neutral' },
  pending: { icon: 'clock', tone: 'info' },
  held: { icon: 'pause-circle', tone: 'warning' },
  underReview: { icon: 'search-check', tone: 'warning' },
  completed: { icon: 'check-circle', tone: 'success' },
  failed: { icon: 'x-circle', tone: 'danger' },
  reversed: { icon: 'undo', tone: 'info' },
  expired: { icon: 'timer-off', tone: 'neutral' },
} as const satisfies Record<string, { icon: IconName; tone: string }>;

export type Status = keyof typeof STATUSES;

export function StatusChip({ status, label }: { status: Status; label: string }) {
  const s = STATUSES[status];
  return (
    <span className={`chip st-${s.tone}`} data-status={status}>
      <Icon name={s.icon} />
      <span>{label}</span>
    </span>
  );
}

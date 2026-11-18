import { getTranslator, type Locale, type MessageKey } from '@pdfe/i18n/next';

const ROLE_LABEL: Record<string, MessageKey> = {
  individual: 'ui.individual',
  merchant_owner: 'ui.merchant-owner',
  biz_approver: 'ui.business-approver',
  ops_analyst: 'ui.operations-analyst',
  compliance_analyst: 'sim.compliance-analyst',
  finance_analyst: 'ui.finance-analyst',
  platform_admin: 'ui.platform-admin',
  auditor: 'ui.auditor',
  demo_viewer: 'ui.demo-viewer',
};

/** The label of a role in the page language; a role with no approved label shows its code. */
export function roleLabel(locale: Locale, role: string | undefined): string {
  if (!role) return '';
  const key = ROLE_LABEL[role];
  return key ? getTranslator(locale)(key) : role;
}

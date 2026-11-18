import type { MessageKey } from '@pdfe/i18n';
import type { AppId } from './nav';

/**
 * The demo users each app offers in its role picker (CON-004). The usernames are the realm's (`demo.<name>`, infra/keycloak):
 * synthetic accounts that exist only in the demo realm. Roles that need a second factor are marked, so the picker can say so.
 */
export interface DemoRole {
  username: string;
  title: MessageKey;
  body?: MessageKey;
  /** Asks for the one-time code on the hosted page. */
  privileged: boolean;
}

export const DEMO_ROLES: Record<AppId, DemoRole[]> = {
  consumer: [
    {
      username: 'demo.individual',
      title: 'ui.individual',
      body: 'money.wallet-payments-remittance',
      privileged: false,
    },
    {
      username: 'demo.merchant_owner',
      title: 'ui.merchant',
      body: 'ui.merchant-mode-and-portal',
      privileged: false,
    },
  ],
  merchant: [
    {
      username: 'demo.merchant_owner',
      title: 'ui.merchant-owner',
      body: 'ui.merchant-mode-and-portal',
      privileged: false,
    },
  ],
  business: [{ username: 'demo.biz_approver', title: 'ui.business-approver', privileged: false }],
  console: [
    { username: 'demo.admin.a', title: 'ui.platform-admin', privileged: true },
    { username: 'demo.ops_analyst', title: 'ui.operations-analyst', privileged: true },
    { username: 'demo.compliance_analyst', title: 'sim.compliance-analyst', privileged: true },
    { username: 'demo.finance_analyst', title: 'ui.finance-analyst', privileged: true },
    { username: 'demo.auditor', title: 'ui.auditor', privileged: true },
  ],
  investor: [{ username: 'demo.demo_viewer', title: 'ui.demo-viewer', privileged: false }],
  devportal: [{ username: 'demo.demo_viewer', title: 'ui.developer', privileged: false }],
};

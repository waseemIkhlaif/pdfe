#!/usr/bin/env node
// Generates infra/keycloak/realm-pdfe-demo.json. The output is committed; run `node infra/keycloak/generate-realm.mjs`
// after changing this file. Everything here is SYNTHETIC: demo users, demo passwords, demo one-time-password secrets.
// None of it protects anything real (constitution Article I). See infra/keycloak/README.md.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Fixed tenant IDs: the realm carries them in the `tenant_id` claim, and the seeds create tenants with the same IDs.
export const TENANTS = {
  platform: '22222222-0000-7000-8000-000000000001',
  consumers: '22222222-0000-7000-8000-000000000002',
  'demo-merchant': '22222222-0000-7000-8000-000000000003',
};

// [username suffix, role, tenant code, privileged]. Order fixes the subject numbers.
const PRIVILEGED = new Set([
  'ops_analyst',
  'compliance_analyst',
  'compliance_approver',
  'finance_analyst',
  'finance_approver',
  'issuer_operator',
  'stb_approver',
  'platform_admin',
  'auditor',
]);
const ROWS = [
  ['admin.a', 'platform_admin', 'platform', 'Demo Admin A'],
  ['admin.b', 'platform_admin', 'platform', 'Demo Admin B'],
  ['individual', 'individual', 'consumers', 'Demo Individual'],
  ['merchant_owner', 'merchant_owner', 'demo-merchant', 'Demo Merchant Owner'],
  ['merchant_cashier', 'merchant_cashier', 'demo-merchant', 'Demo Merchant Cashier'],
  ['biz_preparer', 'biz_preparer', 'demo-merchant', 'Demo Business Preparer'],
  ['biz_approver', 'biz_approver', 'demo-merchant', 'Demo Business Approver'],
  ['ops_analyst', 'ops_analyst', 'platform', 'Demo Operations Analyst'],
  ['compliance_analyst', 'compliance_analyst', 'platform', 'Demo Compliance Analyst'],
  ['compliance_approver', 'compliance_approver', 'platform', 'Demo Compliance Approver'],
  ['finance_analyst', 'finance_analyst', 'platform', 'Demo Finance Analyst'],
  ['finance_approver', 'finance_approver', 'platform', 'Demo Finance Approver'],
  ['issuer_operator', 'issuer_operator', 'platform', 'Demo Issuer Operator'],
  ['stb_approver', 'stb_approver', 'platform', 'Demo Stable-Value Approver'],
  ['auditor', 'auditor', 'platform', 'Demo Auditor'],
  ['demo_viewer', 'demo_viewer', 'platform', 'Demo Viewer'],
];

export const DEMO_PASSWORD = 'demo-password'; // synthetic, the same for every demo user
const subject = (n) => `11111111-0000-7000-8000-${String(n).padStart(12, '0')}`;
// Raw secret for the one-time password: its bytes are the HMAC key. Synthetic and public.
const otpSecret = (n) => `pdfe-demo-totp-${String(n).padStart(4, '0')}`;

export const USERS = ROWS.map(([name, role, tenant, display], i) => ({
  username: `demo.${name}`,
  subject: subject(i + 1),
  role,
  tenant,
  tenantId: TENANTS[tenant],
  display,
  privileged: PRIVILEGED.has(role),
  otpSecret: PRIVILEGED.has(role) ? otpSecret(i + 1) : null,
}));

const WEB_APPS = [
  ['web-consumer', 3001],
  ['web-merchant', 3002],
  ['web-business', 3003],
  ['web-console', 3004],
  ['web-investor', 3005],
  ['web-devportal', 3006],
];

const mapper = (name, config) => ({
  name,
  protocol: 'openid-connect',
  protocolMapper: 'oidc-usermodel-attribute-mapper',
  consentRequired: false,
  config: {
    'user.attribute': config.attr,
    'claim.name': config.claim,
    'jsonType.label': 'String',
    'id.token.claim': 'true',
    'access.token.claim': 'true',
    'userinfo.token.claim': 'true',
  },
});

const simple = (name, protocolMapper) => ({
  name,
  protocol: 'openid-connect',
  protocolMapper,
  consentRequired: false,
  config: { 'id.token.claim': 'true', 'access.token.claim': 'true' },
});
const clientScopeMappers = [
  mapper('tenant_id', { attr: 'tenant_id', claim: 'tenant_id' }),
  simple('sub', 'oidc-sub-mapper'),
  simple('amr', 'oidc-amr-mapper'),
];

// Conditional second factor: users holding the realm role `privileged` must enter a one-time password.
const flows = [
  {
    alias: 'browser-pdfe',
    description: 'Browser flow: password, then a one-time password for privileged roles',
    providerId: 'basic-flow',
    topLevel: true,
    builtIn: false,
    authenticationExecutions: [
      {
        authenticator: 'auth-cookie',
        authenticatorFlow: false,
        requirement: 'ALTERNATIVE',
        priority: 10,
        userSetupAllowed: false,
      },
      {
        authenticatorFlow: true,
        requirement: 'ALTERNATIVE',
        priority: 20,
        flowAlias: 'browser-pdfe forms',
        userSetupAllowed: false,
      },
    ],
  },
  {
    alias: 'browser-pdfe forms',
    description: 'Username, password and the conditional one-time password',
    providerId: 'basic-flow',
    topLevel: false,
    builtIn: false,
    authenticationExecutions: [
      {
        authenticator: 'auth-username-password-form',
        authenticatorConfig: 'amr-pwd',
        authenticatorFlow: false,
        requirement: 'REQUIRED',
        priority: 10,
        userSetupAllowed: false,
      },
      {
        authenticatorFlow: true,
        requirement: 'CONDITIONAL',
        priority: 20,
        flowAlias: 'browser-pdfe otp',
        userSetupAllowed: false,
      },
    ],
  },
  {
    alias: 'browser-pdfe otp',
    description: 'One-time password, only for privileged roles',
    providerId: 'basic-flow',
    topLevel: false,
    builtIn: false,
    authenticationExecutions: [
      {
        authenticator: 'conditional-user-role',
        authenticatorConfig: 'privileged-role-condition',
        authenticatorFlow: false,
        requirement: 'REQUIRED',
        priority: 10,
        userSetupAllowed: false,
      },
      {
        authenticator: 'auth-otp-form',
        authenticatorConfig: 'amr-otp',
        authenticatorFlow: false,
        requirement: 'REQUIRED',
        priority: 20,
        userSetupAllowed: false,
      },
    ],
  },
  {
    alias: 'direct-grant-pdfe',
    description:
      'Direct grant for tests and scripts only: password, then a one-time password for privileged roles',
    providerId: 'basic-flow',
    topLevel: true,
    builtIn: false,
    authenticationExecutions: [
      {
        authenticator: 'direct-grant-validate-username',
        authenticatorFlow: false,
        requirement: 'REQUIRED',
        priority: 10,
        userSetupAllowed: false,
      },
      {
        authenticator: 'direct-grant-validate-password',
        authenticatorConfig: 'amr-pwd-dg',
        authenticatorFlow: false,
        requirement: 'REQUIRED',
        priority: 20,
        userSetupAllowed: false,
      },
      {
        authenticatorFlow: true,
        requirement: 'CONDITIONAL',
        priority: 30,
        flowAlias: 'direct-grant-pdfe otp',
        userSetupAllowed: false,
      },
    ],
  },
  {
    alias: 'direct-grant-pdfe otp',
    description: 'One-time password, only for privileged roles',
    providerId: 'basic-flow',
    topLevel: false,
    builtIn: false,
    authenticationExecutions: [
      {
        authenticator: 'conditional-user-role',
        authenticatorConfig: 'privileged-role-condition-dg',
        authenticatorFlow: false,
        requirement: 'REQUIRED',
        priority: 10,
        userSetupAllowed: false,
      },
      {
        authenticator: 'direct-grant-validate-otp',
        authenticatorConfig: 'amr-otp-dg',
        authenticatorFlow: false,
        requirement: 'REQUIRED',
        priority: 20,
        userSetupAllowed: false,
      },
    ],
  },
];

// `amr` in the token: Keycloak lists the method of each authenticator that completed, from this reference value.
// This is what the API checks (`otp` in `amr`) before it lets a privileged role in.
const authenticatorConfig = [
  ...['privileged-role-condition', 'privileged-role-condition-dg'].map((alias) => ({
    alias,
    config: { condUserRole: 'privileged', negate: 'false' },
  })),
  ...[
    ['amr-pwd', 'pwd'],
    ['amr-pwd-dg', 'pwd'],
    ['amr-otp', 'otp'],
    ['amr-otp-dg', 'otp'],
  ].map(([alias, value]) => ({ alias, config: { 'default.reference.value': value } })),
];

const bffClient = ([clientId, port]) => ({
  clientId,
  name: clientId,
  enabled: true,
  protocol: 'openid-connect',
  publicClient: false,
  secret: `demo-secret-${clientId}`, // synthetic
  standardFlowEnabled: true,
  directAccessGrantsEnabled: false,
  implicitFlowEnabled: false,
  serviceAccountsEnabled: false,
  rootUrl: `http://localhost:${port}`,
  baseUrl: '/',
  redirectUris: [`http://localhost:${port}/*`],
  webOrigins: [`http://localhost:${port}`],
  attributes: {
    'pkce.code.challenge.method': 'S256',
    'post.logout.redirect.uris': `http://localhost:${port}/*`,
  },
  authenticationFlowBindingOverrides: {},
  defaultClientScopes: ['pdfe'],
});

// The user profile declares `tenant_id`, so Keycloak keeps it (it drops undeclared attributes) and only admins can edit it.
const userProfile = {
  attributes: [
    {
      name: 'username',
      displayName: '${username}',
      validations: { length: { min: 3, max: 255 } },
      permissions: { view: ['admin', 'user'], edit: ['admin', 'user'] },
    },
    {
      name: 'email',
      displayName: '${email}',
      validations: { email: {}, length: { max: 255 } },
      required: { roles: ['user'] },
      permissions: { view: ['admin', 'user'], edit: ['admin', 'user'] },
    },
    {
      name: 'firstName',
      displayName: '${firstName}',
      validations: { length: { max: 255 } },
      required: { roles: ['user'] },
      permissions: { view: ['admin', 'user'], edit: ['admin', 'user'] },
    },
    {
      name: 'lastName',
      displayName: '${lastName}',
      validations: { length: { max: 255 } },
      required: { roles: ['user'] },
      permissions: { view: ['admin', 'user'], edit: ['admin', 'user'] },
    },
    {
      name: 'tenant_id',
      displayName: 'Tenant',
      validations: { length: { max: 64 } },
      permissions: { view: ['admin'], edit: ['admin'] },
    },
  ],
};

const realm = {
  realm: 'pdfe-demo',
  displayName: 'PDFE demo (synthetic, no real money)',
  enabled: true,
  sslRequired: 'none',
  registrationAllowed: false,
  loginWithEmailAllowed: false,
  duplicateEmailsAllowed: true,
  resetPasswordAllowed: false,
  bruteForceProtected: false,
  accessTokenLifespan: 900,
  ssoSessionIdleTimeout: 1800,
  otpPolicyType: 'totp',
  otpPolicyAlgorithm: 'HmacSHA1',
  otpPolicyDigits: 6,
  otpPolicyPeriod: 30,
  otpPolicyLookAheadWindow: 1,
  browserFlow: 'browser-pdfe',
  directGrantFlow: 'direct-grant-pdfe',
  components: {
    'org.keycloak.userprofile.UserProfileProvider': [
      {
        providerId: 'declarative-user-profile',
        subComponents: {},
        config: { 'kc.user.profile.config': [JSON.stringify(userProfile)] },
      },
    ],
  },
  roles: {
    realm: [
      { name: 'privileged', description: 'Holds a console role: a second factor is required' },
    ],
  },
  groups: [{ name: 'privileged', path: '/privileged' }],
  clientScopes: [
    {
      name: 'pdfe',
      protocol: 'openid-connect',
      attributes: { 'include.in.token.scope': 'true', 'display.on.consent.screen': 'false' },
      protocolMappers: clientScopeMappers,
    },
  ],
  authenticationFlows: flows,
  authenticatorConfig,
  clients: [
    ...WEB_APPS.map(bffClient),
    {
      clientId: 'mobile',
      name: 'mobile',
      enabled: true,
      protocol: 'openid-connect',
      publicClient: true,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      redirectUris: ['pdfe://auth'],
      attributes: { 'pkce.code.challenge.method': 'S256' },
      defaultClientScopes: ['pdfe'],
    },
    {
      clientId: 'pdfe-tests',
      name: 'pdfe-tests',
      description: 'Direct grant, used only by tests and scripts',
      enabled: true,
      protocol: 'openid-connect',
      publicClient: true,
      standardFlowEnabled: false,
      directAccessGrantsEnabled: true,
      defaultClientScopes: ['pdfe'],
    },
  ],
  users: USERS.map((u) => ({
    id: u.subject,
    username: u.username,
    enabled: true,
    emailVerified: true,
    email: `${u.username}@demo.invalid`,
    firstName: u.display,
    lastName: 'Synthetic',
    attributes: { tenant_id: [u.tenantId] },
    credentials: [
      { type: 'password', value: DEMO_PASSWORD, temporary: false },
      ...(u.otpSecret
        ? [
            {
              type: 'otp',
              userLabel: 'demo authenticator',
              secretData: JSON.stringify({ value: u.otpSecret }),
              credentialData: JSON.stringify({
                subType: 'totp',
                digits: 6,
                period: 30,
                algorithm: 'HmacSHA1',
              }),
            },
          ]
        : []),
    ],
    realmRoles: u.privileged ? ['privileged'] : [],
    groups: u.privileged ? ['/privileged'] : [],
    requiredActions: [],
  })),
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(resolve(here, 'realm-pdfe-demo.json'), `${JSON.stringify(realm, null, 2)}\n`);
  console.log(`wrote realm-pdfe-demo.json (${USERS.length} users)`);
}

import { createHmac } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { GenericContainer, Wait } from 'testcontainers';

const KEYCLOAK_IMAGE = 'quay.io/keycloak/keycloak:26.8.2';
const REALM = 'pdfe-demo';
const REALM_FILE = resolve(__dirname, '../../../infra/keycloak/realm-pdfe-demo.json');
const GENERATOR = resolve(__dirname, '../../../infra/keycloak/generate-realm.mjs');

export interface DemoUser {
  username: string;
  /** Keycloak `sub` and the `external_subject` of the matching iam.users row. */
  subject: string;
  role: string;
  tenant: string;
  tenantId: string;
  privileged: boolean;
  otpSecret: string | null;
}

export interface KeycloakHandle {
  /** Realm address as browsers and tokens see it: `http://localhost:<port>/realms/pdfe-demo`. Also the token `iss`. */
  issuer: string;
  jwksUrl: string;
  /** The fixed demo users and tenants of the realm (infra/keycloak/generate-realm.mjs). */
  users: DemoUser[];
  tenants: Record<string, string>;
  /** Access token for a demo user through the test-only client `pdfe-tests`. Pass `otp: true` to add the current code. */
  tokenFor(username: string, opts?: { otp?: boolean | string }): Promise<string>;
  /** The raw token endpoint response, for tests that expect a refusal. */
  tokenResponse(
    username: string,
    opts?: { otp?: boolean | string; password?: string },
  ): Promise<Response>;
  stop(): Promise<void>;
}

/** RFC 6238 code (HMAC-SHA1, 6 digits, 30 s) for a secret whose bytes are the key. */
// eslint-disable-next-line pdfe/no-nondeterminism -- Keycloak checks the code against real time, so a test clock would be rejected
export function totp(secret: string, atMs = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / 1000 / 30)));
  const h = createHmac('sha1', Buffer.from(secret, 'utf8')).update(counter).digest();
  const offset = h[h.length - 1]! & 0x0f;
  return String((h.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

/** Keycloak in a disposable container, with the real realm `pdfe-demo` imported. Takes about half a minute. */
export async function startKeycloak(): Promise<KeycloakHandle> {
  const gen = (await import(pathToFileURL(GENERATOR).href)) as {
    USERS: DemoUser[];
    TENANTS: Record<string, string>;
  };
  const container = await new GenericContainer(KEYCLOAK_IMAGE)
    .withEnvironment({
      KC_BOOTSTRAP_ADMIN_USERNAME: 'admin',
      KC_BOOTSTRAP_ADMIN_PASSWORD: 'admin',
      KC_HTTP_ENABLED: 'true',
    })
    .withCopyFilesToContainer([
      { source: REALM_FILE, target: '/opt/keycloak/data/import/realm-pdfe-demo.json' },
    ])
    .withCommand(['start-dev', '--import-realm'])
    .withExposedPorts(8080)
    .withWaitStrategy(
      Wait.forHttp(`/realms/${REALM}`, 8080).forStatusCode(200).withStartupTimeout(240_000),
    )
    .start();

  const issuer = `http://${container.getHost()}:${container.getMappedPort(8080)}/realms/${REALM}`;
  const tokenUrl = `${issuer}/protocol/openid-connect/token`;

  const tokenResponse: KeycloakHandle['tokenResponse'] = async (username, opts = {}) => {
    const user = gen.USERS.find((u) => u.username === username);
    if (!user) throw new Error(`unknown demo user ${username}`);
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'pdfe-tests',
      username,
      password: opts.password ?? 'demo-password',
    });
    if (opts.otp) {
      body.set('totp', typeof opts.otp === 'string' ? opts.otp : totp(user.otpSecret ?? ''));
    }
    return fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  };

  return {
    issuer,
    jwksUrl: `${issuer}/protocol/openid-connect/certs`,
    users: gen.USERS,
    tenants: gen.TENANTS,
    tokenResponse,
    async tokenFor(username, opts = {}) {
      const res = await tokenResponse(username, opts);
      const json = (await res.json()) as { access_token?: string; error_description?: string };
      if (!json.access_token) {
        throw new Error(`no token for ${username}: ${json.error_description ?? res.status}`);
      }
      return json.access_token;
    },
    async stop() {
      await container.stop();
    },
  };
}

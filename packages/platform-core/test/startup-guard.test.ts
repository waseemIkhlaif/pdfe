import { describe, expect, it } from 'vitest';
import { StartupRefusedError, assertDemoMode, assertSafetyEnv } from '../src/startup-guard';

describe('assertDemoMode', () => {
  it('accepts DEMO', () => {
    expect(() => assertDemoMode({ APP_MODE: 'DEMO' })).not.toThrow();
  });
  it('refuses LIVE with a clear message', () => {
    expect(() => assertDemoMode({ APP_MODE: 'LIVE' })).toThrow(/LIVE mode is not supported/);
  });
  it.each([undefined, '', 'demo', 'Demo', 'STAGING'])('refuses %j', (mode) => {
    expect(() => assertDemoMode({ APP_MODE: mode })).toThrow(StartupRefusedError);
    expect(() => assertDemoMode({ APP_MODE: mode })).toThrow(/APP_MODE must be DEMO/);
  });
});

describe('assertSafetyEnv', () => {
  it('accepts the unset value and the default list', () => {
    expect(() => assertSafetyEnv({})).not.toThrow();
    expect(() =>
      assertSafetyEnv({
        INTERNAL_HOSTS: 'postgres,redis,keycloak,mock-hub,api,worker,lgtm,localhost,127.0.0.1',
      }),
    ).not.toThrow();
  });
  it('accepts the same hosts in another order, with spaces', () => {
    expect(() =>
      assertSafetyEnv({
        INTERNAL_HOSTS: ' 127.0.0.1 ,localhost,lgtm,worker,api,mock-hub,keycloak,redis,postgres',
      }),
    ).not.toThrow();
  });
  it('refuses an added public host and names it', () => {
    const run = () =>
      assertSafetyEnv({
        INTERNAL_HOSTS:
          'postgres,redis,keycloak,mock-hub,api,worker,lgtm,localhost,127.0.0.1,example.com',
      });
    expect(run).toThrow(StartupRefusedError);
    expect(run).toThrow(/example\.com/);
  });
  it('refuses a removed host', () => {
    expect(() => assertSafetyEnv({ INTERNAL_HOSTS: 'localhost' })).toThrow(/INTERNAL_HOSTS/);
  });
});

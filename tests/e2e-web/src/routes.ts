import { routes as business } from '../../../apps/web-business/src/routes.manifest';
import { routes as console_ } from '../../../apps/web-console/src/routes.manifest';
import { routes as consumer } from '../../../apps/web-consumer/src/routes.manifest';
import { routes as devportal } from '../../../apps/web-devportal/src/routes.manifest';
import { routes as investor } from '../../../apps/web-investor/src/routes.manifest';
import { routes as merchant } from '../../../apps/web-merchant/src/routes.manifest';

export interface ManifestRoute {
  path: string;
  roles: readonly string[];
  states?: readonly string[];
  baseline?: string;
}

export interface WebApp {
  name: string;
  port: number;
  routes: readonly ManifestRoute[];
}

/** Every web app with the routes of its manifest (contracts/ui-shell.md). The label check visits exactly these. */
export const APPS: readonly WebApp[] = [
  { name: 'web-consumer', port: 3001, routes: consumer },
  { name: 'web-merchant', port: 3002, routes: merchant },
  { name: 'web-business', port: 3003, routes: business },
  { name: 'web-console', port: 3004, routes: console_ },
  { name: 'web-investor', port: 3005, routes: investor },
  { name: 'web-devportal', port: 3006, routes: devportal },
];

export const LANGS = ['ar', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** `/` in language `ar` is `/ar`; `/sign-in` is `/ar/sign-in`. */
export const pathIn = (lang: Lang, route: string): string =>
  `/${lang}${route === '/' ? '' : route}`;
export const baseUrl = (app: WebApp): string => `http://localhost:${app.port}`;

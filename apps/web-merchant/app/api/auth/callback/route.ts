import { lazyAuthRoutes } from '@pdfe/auth-web';

export const dynamic = 'force-dynamic';

export const GET = (req: Request) => lazyAuthRoutes().callback(req);

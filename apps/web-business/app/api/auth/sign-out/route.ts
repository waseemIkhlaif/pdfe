import { lazyAuthRoutes } from '@pdfe/auth-web';

export const dynamic = 'force-dynamic';

export const POST = (req: Request) => lazyAuthRoutes().signOut(req);

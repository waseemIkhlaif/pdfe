import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  // Trace files from the repository root so the monorepo packages are included in the standalone output.
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  async redirects() {
    return [{ source: '/', destination: '/ar', permanent: false }];
  },
};

export default config;

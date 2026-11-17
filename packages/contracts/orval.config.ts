import { defineConfig } from 'orval';

// Typed clients generated from openapi.json (the document generated from the API routes).
// `pnpm --filter @pdfe/contracts generate` regenerates both; CI fails if the committed files differ.
export default defineConfig({
  pdfe: {
    input: { target: './openapi.json' },
    output: {
      mode: 'tags-split',
      target: './src/clients',
      schemas: './src/clients/model',
      client: 'fetch',
      clean: true,
      prettier: false,
      override: {
        // Every call goes through apiFetch of @pdfe/auth-web, which adds the bearer token and the headers.
        fetch: { includeHttpResponseReturnType: true },
      },
    },
  },
});

## Next.js with Unleash

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FUnleash%2Funleash-nextjs-sdk%2Ftree%2Fmain%2Fexample)
[![Edit in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/Unleash/unleash-nextjs-sdk/tree/main/example)

To run this code locally:

```bash
git clone https://github.com/Unleash/unleash-nextjs-sdk.git
cd unleash-nextjs-sdk/example
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Flag in use is `example-flag`. https://app.unleash-hosted.com/demo/projects/codesandbox/features/example-flag

## Available examples

### App Router

- [`./src/app/page.tsx`](./src/app/page.tsx) - Server-side component page, with loader
- [`./src/app/api-route/route.ts`](./src/app/api-route/route.ts) - JSON API response

### Pages Router

- [`./src/pages/csr.tsx`](./src/pages/csr.tsx) - Client-side rendering - simple use case, with loader
- [`./src/pages/ssr.tsx`](./src/pages/ssr.tsx) - Server-side rendering - when you need to keep some data private
- [`./src/pages/ssg.tsx`](./src/pages/ssg.tsx) - Static site generation - performance optimization

### API

- [`./src/pages/api/hello.ts`](./src/pages/api/hello.ts) - API route responding with JSON

### Middleware

Example of A/B testing with Next.js Middleware.
Redirect users to a different (pre-rendered) page based on a feature flag.

- [`./src/pages/api/proxy-definitions.ts`](./src/pages/api/proxy-definitions.ts) - act as cache for feature flag definitions. This lets this SDK act as a substitute for Unleash Edge or the Unleash proxy that you can deploy on Next.js Edge.
- [`./src/middleware.ts`](./src/middleware.ts) - handle flag evaluation and transparently redirect to one of the pages in `./src/pages/ab` directory
- [`./src/pages/ab/a`](./src/pages/ab/a.tsx) & [`./src/pages/ab/b`](./src/pages/ab/b.tsx) - target pages. Both will be served at the URL `/ab`, but which one you see is decided by the feature flag in `./src/middleware.ts`.

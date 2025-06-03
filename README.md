# Unleash Next.js SDK

This package allows easy integration of [Unleash](https://github.com/unleash/unleash) feature flags in a [Next.js](https://nextjs.org/) application.

## Setup

### Installation

To install, simply run:

```sh
npm install @unleash/nextjs
# or
yarn add @unleash/nextjs
# or
pnpm add @unleash/nextjs
```

There is an [`./example`](./example) project that you can [deploy to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FUnleash%2Funleash-client-nextjs%2Ftree%2Fmain%2Fexample) or [edit in CodeSandbox](https://codesandbox.io/s/github/Unleash/unleash-client-nextjs/tree/main/example).

### Environment variables

This package will attempt to load configuration from
[Next.js Environment variables](https://nextjs.org/docs/basic-features/environment-variables).

When using Unleash **client-side**, with `<FlagProvider />` or `getFrontendFlags()` configure:

- `NEXT_PUBLIC_UNLEASH_FRONTEND_API_URL`. URL should end with `/api/frontend` or `/proxy`
- `NEXT_PUBLIC_UNLEASH_FRONTEND_API_TOKEN` [client-side API token](https://docs.getunleash.io/reference/api-tokens-and-client-keys#front-end-tokens)
  if you're using the [front-end API](https://docs.getunleash.io/reference/front-end-api),
  or a [proxy client key](https://docs.getunleash.io/reference/api-tokens-and-client-keys#proxy-client-keys)
  if you're using a [proxy](https://docs.getunleash.io/reference/unleash-proxy)
- Using [Edge](https://docs.getunleash.io/reference/unleash-edge) is the same as using the frontend API, so you'll need a FRONTEND_API_TOKEN, and your URL should end with `/api/frontend`.

If using **server-side** (SSR, SSG, API), using `getDefinitions()` and `evaluateFlags()`, set:

- `UNLEASH_SERVER_API_URL` of you instance. URL should end with `/api`
- `UNLEASH_SERVER_API_TOKEN` [server-side API client token](https://docs.getunleash.io/reference/api-tokens-and-client-keys#client-tokens)

#### Detailed explanation

| Prefixable     | Variable                     | Default                                                   |
| -------------- | ---------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_` | `UNLEASH_SERVER_API_URL`     | `http://localhost:4242/api`                               |
| `NEXT_PUBLIC_` | `UNLEASH_FRONTEND_API_URL`   | `<(NEXT_PUBLIC_)UNLEASH_SERVER_API_URL>/frontend`         |
| **No**         | `UNLEASH_SERVER_API_TOKEN`   | `default:development.unleash-insecure-api-token`          |
| **No**         | `UNLEASH_SERVER_INSTANCE_ID` | undefined                                                 |
| `NEXT_PUBLIC_` | `UNLEASH_FRONTEND_API_TOKEN` | `default:development.unleash-insecure-frontend-api-token` |
| `NEXT_PUBLIC_` | `UNLEASH_APP_NAME`           | `nextjs`                                                  |

If you plan to use configuration in the browser, add `NEXT_PUBLIC_` prefix.
If both are defined and available, private variable takes priority.
You can use both to have different values on client-side and server-side.

---

💡 **Usage with GitLab's feature flags**: To use this SDK with [GitLab Feature Flags](https://docs.gitlab.com/ee/operations/feature_flags.html), use `UNLEASH_SERVER_INSTANCE_ID` instead of `UNLEASH_SERVER_API_TOKEN` to [authorize with GitLab's service](https://docs.gitlab.com/ee/operations/feature_flags.html#get-access-credentials).

---

# Usage

## A). **App router**

This package is ready for server-side use with [App Router](https://nextjs.org/docs/app/building-your-application/routing).

Refer to [`./example/README.md#App-router`](https://github.com/Unleash/unleash-client-nextjs/tree/main/example#app-router) for an implementation example.

```tsx
import { cookies } from "next/headers";
import { evaluateFlags, flagsClient, getDefinitions } from "@unleash/nextjs";

const getFlag = async () => {
  const cookieStore = cookies();
  const sessionId =
    cookieStore.get("unleash-session-id")?.value ||
    `${Math.floor(Math.random() * 1_000_000_000)}`;

  const definitions = await getDefinitions({
    fetchOptions: {
      next: { revalidate: 15 }, // Cache layer like Unleash Proxy!
    },
  });

  const { toggles } = evaluateFlags(definitions, {
    sessionId,
  });
  const flags = flagsClient(toggles);

  return flags.isEnabled("nextjs-example");
};

export default async function Page() {
  const isEnabled = await getFlag();

  return (
    <p>
      Feature flag is{" "}
      <strong>
        <code>{isEnabled ? "ENABLED" : "DISABLED"}</code>
      </strong>
      .
    </p>
  );
}
```

## B). Middleware

It's possible to run this SDK in Next.js Edge Middleware. This is a great use case for A/B testing, where you can transparently redirect users to different pages based on a feature flag. Target pages can be statically generated, improving performance.

Refer to [`./example/README.md#Middleware`](https://github.com/Unleash/unleash-client-nextjs/tree/main/example#middleware) for an implementation example.

## C). Client-side only - simple use case and for development purposes (CSR)

Fastest way to get started is to connect frontend directly to Unleash.
You can find out more about direct [Front-end API access](https://docs.getunleash.io/reference/front-end-api) in our documentation,
including a guide on how to [setup a client-side SDK key](https://docs.getunleash.io/how-to/how-to-create-api-tokens).

Important: Hooks and provider are only available in `@unleash/nextjs/client`.

```tsx
import type { AppProps } from "next/app";
import { FlagProvider } from "@unleash/nextjs/client";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <FlagProvider>
      <Component {...pageProps} />
    </FlagProvider>
  );
}
```

With `<FlagProvider />` in place you can now use hooks like: `useFlag`, `useVariant`, or `useFlagsStatus` to block rendering until flags are ready.

```jsx
import { useFlag } from "@unleash/nextjs/client";

const YourComponent = () => {
  const isEnabled = useFlag("nextjs-example");

  return <>{isEnabled ? "ENABLED" : "DISABLED"}</>;
};
```

Optionally, you can configure `FlagProvider` with the `config` prop. It will take priority over environment variables.

```jsx
<FlagProvider
  config={{
    url: "http://localhost:4242/api/frontend", // replaces NEXT_PUBLIC_UNLEASH_FRONTEND_API_URL
    clientKey: "<Frontend_API_token>", // replaces NEXT_PUBLIC_UNLEASH_FRONTEND_API_TOKEN
    appName: "nextjs", // replaces NEXT_PUBLIC_UNLEASH_APP_NAME

    refreshInterval: 15, // additional client configuration
    // see https://github.com/Unleash/unleash-proxy-client-js#available-options
  }}
>
```

If you only plan to use [Unleash client-side React SDK](https://github.com/Unleash/proxy-client-react) now also works with Next.js. Check documentation there for more examples.

## D). Static Site Generation, optimized performance (SSG)

With same access as in the client-side example above you can resolve Unleash feature flags when building static pages.

```tsx
import {
  flagsClient,
  getDefinitions,
  evaluateFlags,
  getFrontendFlags,
  type IVariant,
} from "@unleash/nextjs";
import type { GetStaticProps, NextPage } from "next";

type Data = {
  isEnabled: boolean;
  variant: IVariant;
};

const ExamplePage: NextPage<Data> = ({ isEnabled, variant }) => (
  <>
    Flag status: {isEnabled ? "ENABLED" : "DISABLED"}
    <br />
    Variant: {variant.name}
  </>
);

export const getStaticProps: GetStaticProps<Data> = async (_ctx) => {
  /* Using server-side SDK: */
  const definitions = await getDefinitions();
  const context = {}; // optional, see https://docs.getunleash.io/reference/unleash-context
  const { toggles } = evaluateFlags(definitions, context);

  /* Or with the proxy/front-end API */
  // const { toggles } = await getFrontendFlags({ context });

  const flags = flagsClient(toggles);

  return {
    props: {
      isEnabled: flags.isEnabled("nextjs-example"),
      variant: flags.getVariant("nextjs-example"),
    },
  };
};

export default ExamplePage;
```

The same approach will work for [ISR (Incremental Static Regeneration)](https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration).

Both `getDefinitions()` and `getFrontendFlags()` can take arguments overriding URL, token and other request parameters.

## E). Server Side Rendering (SSR)

```tsx
import {
  flagsClient,
  evaluateFlags,
  getDefinitions,
  type IVariant,
} from "@unleash/nextjs";
import type { GetServerSideProps, NextPage } from "next";

type Data = {
  isEnabled: boolean;
};

const ExamplePage: NextPage<Data> = ({ isEnabled }) => (
  <>Flag status: {isEnabled ? "ENABLED" : "DISABLED"}</>
);

export const getServerSideProps: GetServerSideProps<Data> = async (ctx) => {
  const sessionId =
    ctx.req.cookies["unleash-session-id"] ||
    `${Math.floor(Math.random() * 1_000_000_000)}`;
  ctx.res.setHeader("set-cookie", `unleash-session-id=${sessionId}; path=/;`);

  const context = {
    sessionId, // needed for stickiness
    // userId: "123" // etc
  };

  const definitions = await getDefinitions(); // Uses UNLEASH_SERVER_API_URL
  const { toggles } = evaluateFlags(definitions, context);

  const flags = flagsClient(toggles); // instantiates a static (non-syncing) unleash-proxy-client

  return {
    props: {
      isEnabled: flags.isEnabled("nextjs-example")
    },
  };
};

export default ExamplePage;
```

## F). Bootstrapping / rehydration

You can bootstrap Unleash React SDK to have values loaded from the start.
Initial value can be customized server-side.

```tsx
import App, { AppContext, type AppProps } from "next/app";
import {
  FlagProvider,
  getFrontendFlags,
  type IMutableContext,
  type IToggle,
} from "@unleash/nextjs";

type Data = {
  toggles: IToggle[];
  context: IMutableContext;
};

export default function CustomApp({
  Component,
  pageProps,
  toggles,
  context,
}: AppProps & Data) {
  return (
    <FlagProvider
      config={{
        bootstrap: toggles,
        context,
      }}
    >
      <Component {...pageProps} />
    </FlagProvider>
  );
}

CustomApp.getInitialProps = async (ctx: AppContext) => {
  const context = {
    userId: "123",
  };

  const { toggles } = await getFrontendFlags(); // use Unleash Proxy

  return {
    ...(await App.getInitialProps(ctx)),
    bootstrap: toggles,
    context, // pass context along so client can refetch correct values
  };
};
```

# Server-side flags and metrics (new in v1.5.0)

Next.js applications using Server-Side Rendering (SSR) are often deployed in serverless or short-lived environments, such as Vercel. This creates challenges for server-side metrics reporting.

Typically, Unleash backend SDKs (like the [Node.js SDK](https://github.com/Unleash/unleash-client-node) run in long-lived processes, allowing them to cache metrics locally and send them to the Unleash API or Edge API at scheduled intervals.

However, in some short-lived serverless environments where Next.js is commonly hosted (e.g., Vercel), there is no persistent in-memory cache across multiple requests. As a result, metrics must be reported on each request.

To address this, the SDK provides a `sendMetrics` function that can be called wherever needed, but it should be executed after feature flag checks `client.isEnabled()` or variant checks `client.getVariant()`.

We also recommend setting up the [Edge API](https://github.com/Unleash/unleash-edge)  in front of your Unleash API. This helps protect your Unleash API from excessive traffic caused by per-request metrics reporting.

```tsx
const enabled = flags.isEnabled("nextjs-example");

await flags.sendMetrics();
```

## No `setInterval` support (e.g. Vercel)

If your runtime does not allow `setInterval` calls then you can report metrics on each request as shown below. Consider using Unleash Edge in this scenario.

### Next.js 15 and newer

Latest versions of Next.js allow to run code after the response is sent, with [`after` function](https://nextjs.org/docs/app/api-reference/functions/after).

```ts
import { after } from 'next/server'
// ...
export default async function Page() {

  // ...
  const flags = flagsClient(evaluated.toggles)
  const isEnabled = flags.isEnabled("example-flag")

  after(async () => {
    flags.sendMetrics()
  })

  return (
    // ...
  )
}
```

### Next.js 14 and older

#### App router

```tsx
import {evaluateFlags, flagsClient, getDefinitions,} from "@unleash/nextjs";

export default async function Page() {
  const definitions = await getDefinitions({
    fetchOptions: {
      next: { revalidate: 15 }, // Cache layer like Unleash Proxy!
    },
  });
  const context = {};
  const { toggles } = evaluateFlags(definitions, context);
  const flags = flagsClient(toggles);

  const enabled = flags.isEnabled("nextjs-example");

  // await client.sendMetrics().catch(() => {}); // blocking metrics
  flags.sendMetrics().catch(() => {}); // non-blocking metrics

  return  <>Flag status: {enabled ? "ENABLED" : "DISABLED"}</>
}
```

#### Page router
```tsx
import { evaluateFlags, flagsClient, getDefinitions } from "@unleash/nextjs";
import type { GetServerSideProps, NextPage } from "next";

type Data = {
  isEnabled: boolean;
};

export const getServerSideProps: GetServerSideProps<Data> = async () => {
  const definitions = await getDefinitions();
  const context = {};
  const { toggles } = evaluateFlags(definitions, context);
  const flags = flagsClient(toggles);

  const enabled = flags.isEnabled("nextjs-example");

  // await client.sendMetrics().catch(() => {}); // blocking metrics
  flags.sendMetrics().catch(() => {}); // non-blocking metrics

  return {
    props: { isEnabled: enabled },
  };
};

const ExamplePage: NextPage<Data> = ({ isEnabled }) => (
  <>Flag status: {isEnabled ? "ENABLED" : "DISABLED"}</>
);

export default ExamplePage;
```


## Next.js middleware

In `middleware.ts` you can use [`event.waitUntil()`](https://nextjs.org/docs/app/building-your-application/routing/middleware#waituntil-and-nextfetchevent) to reliably send metrics without delaying the response.

```tsx
export async function middleware(req: NextRequest, event: NextFetchEvent) {
    // ...
    const evaluated = evaluateFlags(definitions, context);
    const flags = flagsClient(evaluated.toggles)
    const isEnabled = flags.isEnabled("example-flag")

    event.waitUntil(flags.sendMetrics())
    // ...
}
```

## `setInterval` support (e.g. long-running Node process or AWS lambda)

If your Next application resolves flags only in SSR mode and `setInterval` is supported then you may also consider using [Node.js SDK](https://github.com/Unleash/unleash-client-node) instead, which is less taxing on metrics reporting.
Check [this blog post](https://docs.getunleash.io/feature-flag-tutorials/serverless/lambda) for more information on short-running lambdas that still support `setInterval`.


# ⚗️ CLI (experimental)

You can use `unleash [action] [options]` in your `package.json` `scripts` section, or with:

```sh
npx @unleash/nextjs
```

For the CLI to work, the following [environment variables](#environment-variables) must be configured with appropriate values:

- `UNLEASH_SERVER_API_URL`
- `UNLEASH_SERVER_API_TOKEN`

The CLI will attempt to read environment values from any `.env` files if they're present. You can also set the variables directly when invoking the interface, as in the [CLI usage example](#example).

## Usage

- `get-definitions <outputFile.json>` Download feature flags definitions for bootstrapping (offline use) of server-side SDK.
- `generate-types [options] <outputFile.ts>` Generate types and typed functions from feature flags defined in an Unleash instance.
  It will also generate strictly typed versions of `useFlag`, `useVariant`, `useFlags` and `flagsClient` (unless `--typesOnly` is used).
  - `-t, --typesOnly` don't include typed versions of functions exported from `@unleash/nextjs` (default: false)
  - `-b, --bootstrap <sourceFile.json>` load definitions from a file instead of fetching definitions - work offline
- `-V` Output the version number

## Example

Try it now

```sh
UNLEASH_SERVER_API_URL=https://app.unleash-hosted.com/demo/api \
UNLEASH_SERVER_API_TOKEN=test-server:default.8a090f30679be7254af997864d66b86e44dcfc5291916adff72a0fb5 \
npx @unleash/nextjs generate-types ./unleash.ts
```

# Known limitation

- When used server-side, this SDK does not support the "Hostname" and "IP" strategies. Use custom context fields and constraints instead.

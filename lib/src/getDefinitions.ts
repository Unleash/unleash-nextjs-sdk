import type { ClientFeaturesResponse } from "unleash-client";
import { removeTrailingSlash } from "./utils";
import { version, devDependencies } from "../package.json";

const defaultUrl = "http://localhost:4242/api/client/features";
const defaultToken = "default:development.unleash-insecure-api-token";
const supportedSpecVersion = devDependencies["@unleash/client-specification"];

type FetchOptions = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export const getDefaultConfig = (defaultAppName = "nextjs") => {
  const baseUrl = removeTrailingSlash(
    process.env.UNLEASH_SERVER_API_URL ||
      process.env.NEXT_PUBLIC_UNLEASH_SERVER_API_URL
  );

  const envToken = process.env.UNLEASH_SERVER_API_TOKEN;
  const instanceId = process.env.UNLEASH_SERVER_INSTANCE_ID;

  let token = undefined;

  if (envToken) {
    token = envToken;
  } else if (!instanceId) {
    token = defaultToken;
  }

  return {
    appName:
      process.env.UNLEASH_APP_NAME ||
      process.env.NEXT_PUBLIC_UNLEASH_APP_NAME ||
      defaultAppName,
    url: baseUrl ? `${baseUrl}/client/features` : defaultUrl,
    ...(token ? { token } : {}),
    ...(instanceId ? { instanceId } : {}),
    fetchOptions: {} as FetchOptions,
  };
};

type CacheEntry = {
  etag?: string;
  definitions?: ClientFeaturesResponse;
};

const definitionsCache = new Map<string, CacheEntry>();

const getCacheKey = (
  url: string,
  headers: Record<string, string>
) =>
  JSON.stringify({
    url,
    authorization: headers["authorization"] || "",
    instanceId: headers["unleash-instanceid"] || "",
    appName: headers["unleash-appname"] || "",
  });

/** @internal Test utility to clear the in-memory cache. */
export const __resetDefinitionsCache = () => {
  definitionsCache.clear();
};

/**
 * Fetch Server-side feature flags definitions from Unleash API
 *
 * If you provide `url` in the config parameter, it should be a full endpoint path:
 * @example getDefinitions({ url: `http://localhost:4242/api/client/features` })
 */
export const getDefinitions = async (
  config?: Partial<ReturnType<typeof getDefaultConfig>>
) => {
  const { appName, url, token, instanceId, fetchOptions } = {
    ...getDefaultConfig(),
    ...(config || {}),
  };

  if (url === defaultUrl) {
    console.warn(
      "Using fallback Unleash API URL (http://localhost:4242/api).",
      "Provide a URL or set UNLEASH_SERVER_API_URL environment variable."
    );
  }
  if (token === defaultToken) {
    console.error(
      "Using fallback default token. Pass token or set UNLEASH_SERVER_API_TOKEN environment variable."
    );
  }

  const fetchUrl = new URL(url);

  const sendAuthorizationToken = !instanceId || token !== defaultToken;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": appName,
    "unleash-client-spec": supportedSpecVersion,
    "unleash-sdk": `unleash-nextjs-sdk:${version}`,
    "unleash-appname": appName,
  };

  if (sendAuthorizationToken && token) {
    headers["authorization"] = token;
  }

  if (instanceId) {
    headers["unleash-instanceid"] = instanceId;
  }

  if (fetchOptions.headers) {
    Object.entries(fetchOptions.headers).forEach(([key, value]) => {
      if (value != null) {
        headers[key.toLowerCase()] = String(value);
      }
    });
  }

  const cacheKey = getCacheKey(fetchUrl.toString(), headers);
  const cached = definitionsCache.get(cacheKey);

  if (!headers["if-none-match"] && cached?.etag) {
    headers["if-none-match"] = cached.etag;
  }

  const response = await fetch(fetchUrl.toString(), {
    ...fetchOptions,
    headers,
  });

  if (response.status === 304) {
    if (cached?.definitions) {
      return cached.definitions;
    }
    throw new Error(
      "Unleash: Received 304 Not Modified but no cached definitions are available."
    );
  }

  const definitions = (await response.json()) as ClientFeaturesResponse;

  if (response.ok) {
    const etag = response.headers?.get?.("etag");
    if (etag) {
      definitionsCache.set(cacheKey, {
        etag,
        definitions,
      });
    } else {
      definitionsCache.delete(cacheKey);
    }
  }

  return definitions;
};

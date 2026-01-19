import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientFeaturesResponse, Context } from "unleash-client";
import type { IToggle } from "unleash-proxy-client";

let currentDefinitions: ClientFeaturesResponse = {
  version: 1,
  features: [],
};

let currentEtag: string | undefined = "etag-1";

const getDefinitionsCached = vi.fn(
  async (options?: { cache?: { etag?: string; definitions?: ClientFeaturesResponse } }) => {
    if (options?.cache) {
      options.cache.etag = currentEtag;
      options.cache.definitions = currentDefinitions;
    }
    return currentDefinitions;
  }
);

const createDefinitionsCache = vi.fn(() => {
  const cache: { etag?: string; definitions?: ClientFeaturesResponse } = {};
  return cache;
});

vi.mock("./getDefinitions", () => ({
  createDefinitionsCache,
  getDefinitionsCached,
}));

const evaluateFlags = vi.fn(
  (_definitions: ClientFeaturesResponse, _context: Context) => ({
    toggles: [
      {
        name: "feature-a",
        enabled: true,
        variant: { name: "variant", enabled: true },
        impressionData: false,
      },
    ],
  })
);

vi.mock("./evaluateFlags", () => ({
  evaluateFlags,
}));

const flagsClient = vi.fn((toggles: IToggle[]) => ({
  isEnabled: (name: string) =>
    toggles.some((toggle) => toggle.name === name && toggle.enabled),
  getVariant: (name: string) =>
    toggles.find((toggle) => toggle.name === name)?.variant ?? {
      enabled: false,
      name: "disabled",
    },
}));

vi.mock("./flagsClient", () => ({
  flagsClient,
}));

let flagFn: typeof import("./flag").flag;
let createEvaluationCache: typeof import("./flag").createEvaluationCache;
let createDefinitionsCachePublic: typeof import("./getDefinitions").createDefinitionsCache;

beforeAll(async () => {
  ({ flag: flagFn, createEvaluationCache } = await import("./flag"));
  ({ createDefinitionsCache: createDefinitionsCachePublic } = await import(
    "./getDefinitions"
  ));
});

beforeEach(() => {
  currentDefinitions = { version: 1, features: [] };
  currentEtag = "etag-1";
  getDefinitionsCached.mockClear();
  createDefinitionsCache.mockClear();
  evaluateFlags.mockClear();
  flagsClient.mockClear();
});

describe("flag", () => {
  it("reuses evaluated toggles for identical context and definitions", async () => {
    const cache = createDefinitionsCachePublic();
    const evaluationCache = createEvaluationCache();

    await flagFn("feature-a", { userId: "123" }, { cache, evaluationCache });
    await flagFn("feature-a", { userId: "123" }, { cache, evaluationCache });

    expect(getDefinitionsCached).toHaveBeenCalledTimes(2);
    expect(evaluateFlags).toHaveBeenCalledTimes(1);
  });

  it("re-evaluates when context changes", async () => {
    const cache = createDefinitionsCachePublic();
    const evaluationCache = createEvaluationCache();

    await flagFn("feature-a", { userId: "123" }, { cache, evaluationCache });
    await flagFn("feature-a", { userId: "456" }, { cache, evaluationCache });

    expect(evaluateFlags).toHaveBeenCalledTimes(2);
  });

  it("re-evaluates when definitions change", async () => {
    const cache = createDefinitionsCachePublic();
    const evaluationCache = createEvaluationCache();

    await flagFn("feature-a", { userId: "123" }, { cache, evaluationCache });

    currentEtag = "etag-2";
    currentDefinitions = { version: 2, features: [] };

    await flagFn("feature-a", { userId: "123" }, { cache, evaluationCache });

    expect(evaluateFlags).toHaveBeenCalledTimes(2);
  });

  it("reuses evaluation when no ETag but definitions reference is identical", async () => {
    const cache = createDefinitionsCachePublic();
    const evaluationCache = createEvaluationCache();

    currentEtag = undefined;

    await flagFn("feature-a", { userId: "123" }, { cache, evaluationCache });
    await flagFn("feature-a", { userId: "123" }, { cache, evaluationCache });

    expect(evaluateFlags).toHaveBeenCalledTimes(1);
  });
});

import { evaluateFlags } from "./evaluateFlags";
import { flagsClient } from "./flagsClient";
import {
  createDefinitionsCache,
  getDefinitionsCached,
  type DefinitionsCache,
} from "./getDefinitions";
import type { IVariant, IToggle } from "unleash-proxy-client";
import type { Context, ClientFeaturesResponse } from "unleash-client";

type EvaluationCache = {
  etag?: string;
  definitions?: ClientFeaturesResponse;
  contextKey?: string;
  toggles?: IToggle[];
};

export const createEvaluationCache = (
  initial?: Partial<EvaluationCache>
): EvaluationCache => ({
  etag: initial?.etag,
  definitions: initial?.definitions,
  contextKey: initial?.contextKey,
  toggles: initial?.toggles,
});

const defaultDefinitionsCache = createDefinitionsCache();
const defaultEvaluationCache = createEvaluationCache();

type FlagOptions = Parameters<typeof getDefinitionsCached>[0] & {
  evaluationCache?: EvaluationCache;
};

// Order-sensitive: different key orders produce different cache keys.
const serializeContext = (context: Context = {}) => JSON.stringify(context);

export const flag = async <T extends string, V extends Partial<IVariant>>(
  flag: T,
  context: Context = {},
  options?: FlagOptions
) => {
  const revalidate =
    options?.fetchOptions?.next?.revalidate !== undefined
      ? options?.fetchOptions?.next?.revalidate
      : 15;

  const {
    evaluationCache: providedEvaluationCache,
    cache: providedCache,
    fetchOptions: providedFetchOptions,
    ...restOptions
  } = options || {};

  const definitionsCache: DefinitionsCache =
    providedCache ?? defaultDefinitionsCache;
  const evaluationCache =
    providedEvaluationCache ?? defaultEvaluationCache;

  const mergedFetchOptions = {
    next: { revalidate },
    ...(providedFetchOptions || {}),
  };

  try {
    const definitions = await getDefinitionsCached({
      ...restOptions,
      cache: definitionsCache,
      fetchOptions: mergedFetchOptions,
    });

    const contextKey = serializeContext(context);

    const definitionsMatch =
      evaluationCache.etag && definitionsCache.etag
        ? evaluationCache.etag === definitionsCache.etag
        : evaluationCache.definitions === definitionsCache.definitions;

    let toggles: IToggle[];

    if (
      evaluationCache.toggles &&
      evaluationCache.contextKey === contextKey &&
      definitionsMatch
    ) {
      toggles = evaluationCache.toggles;
    } else {
      const evaluation = evaluateFlags(definitions, context);
      toggles = evaluation.toggles;
      evaluationCache.toggles = toggles;
      evaluationCache.contextKey = contextKey;
      evaluationCache.definitions =
        definitionsCache.definitions ?? definitions;
      evaluationCache.etag = definitionsCache.etag;
    }

    const client = flagsClient(toggles);

    return {
      enabled: client.isEnabled(flag),
      variant: client.getVariant(flag) as V,
    };
  } catch (error: unknown) {
    return {
      enabled: false,
      variant: {} as Partial<IVariant>,
      error,
    };
  }
};

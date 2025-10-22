import { evaluateFlags } from "./evaluateFlags";
import { flagsClient } from "./flagsClient";
import { getDefinitions } from "./getDefinitions";
import type { IVariant } from "unleash-proxy-client";
import type { Context } from "unleash-client";

export const flag = async <T extends string, V extends Partial<IVariant>>(
  flag: T,
  context: Context = {},
  options?: Parameters<typeof getDefinitions>[0]
) => {
  const revalidate =
    options?.fetchOptions?.next?.revalidate !== undefined
      ? options?.fetchOptions?.next?.revalidate
      : 15;

  try {
    const definitions = await getDefinitions({
      ...options,
      fetchOptions: {
        next: { revalidate },
        ...options?.fetchOptions,
      },
    });

    const { toggles } = evaluateFlags(definitions, context);

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

/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { logger } from "matrix-js-sdk/lib/logger";

type AsyncOperation = PromiseLike<unknown> | void;
type AsyncOperationFactory = () => AsyncOperation;

export function fireAndForget(
  operation: AsyncOperation | AsyncOperationFactory,
  context: string,
): void {
  try {
    const result =
      typeof operation === "function"
        ? (operation as AsyncOperationFactory)()
        : operation;

    Promise.resolve(result).catch((error) => {
      logger.error(context, error);
    });
  } catch (error) {
    logger.error(context, error);
  }
}

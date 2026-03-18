/*
Copyright 2023, 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type IOpenIDToken, type MatrixClient } from "matrix-js-sdk";
import { logger } from "matrix-js-sdk/lib/logger";

import {
  createRequestTraceContext,
  resolveResponseTraceContext,
} from "../utils/requestTracing";
import { FailToGetOpenIdToken } from "../utils/errors";
import { doNetworkOperationWithRetry } from "../utils/matrix";

export interface SFUConfig {
  url: string;
  jwt: string;
}

// The bits we need from MatrixClient
export type OpenIDClientParts = Pick<
  MatrixClient,
  "getOpenIdToken" | "getDeviceId" | "getUserId"
>;
/**
 * Gets a bearer token from the homeserver and then use it to authenticate
 * to the matrix RTC backend in order to get acces to the SFU.
 * It has built-in retry for calls to the homeserver with a backoff policy.
 * @param client
 * @param serviceUrl
 * @param matrixRoomId
 * @returns Object containing the token information
 * @throws FailToGetOpenIdToken
 */
export async function getSFUConfigWithOpenID(
  client: OpenIDClientParts,
  serviceUrl: string,
  matrixRoomId: string,
): Promise<SFUConfig> {
  let openIdToken: IOpenIDToken;
  try {
    openIdToken = await doNetworkOperationWithRetry(async () =>
      client.getOpenIdToken(),
    );
  } catch (error) {
    throw new FailToGetOpenIdToken(
      error instanceof Error ? error : new Error("Unknown error"),
    );
  }
  logger.debug("Got openID token", openIdToken);

  logger.debug(`Trying to get JWT for focus ${serviceUrl}...`);
  const sfuConfig = await getLiveKitJWT(
    client,
    serviceUrl,
    matrixRoomId,
    openIdToken,
  );
  logger.debug(`Got JWT from call's active focus URL.`);

  return sfuConfig;
}

async function getLiveKitJWT(
  client: OpenIDClientParts,
  livekitServiceURL: string,
  roomName: string,
  openIDToken: IOpenIDToken,
): Promise<SFUConfig> {
  const traceContext = createRequestTraceContext(
    "livekit_sfu",
    client.getUserId() ?? undefined,
  );
  try {
    logger.info("livekit_sfu_request_started", {
      requestId: traceContext.requestId,
      traceId: traceContext.traceId,
      userId: traceContext.userId,
      roomId: roomName,
      serviceUrl: livekitServiceURL,
    });

    const res = await fetch(
      livekitServiceURL + "/sfu/get",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room: roomName,
          openid_token: openIDToken,
          device_id: client.getDeviceId(),
        }),
      },
    );
    const resolvedTraceContext = resolveResponseTraceContext(res, traceContext);

    if (!res.ok) {
      throw new Error("SFU Config fetch failed with status code " + res.status);
    }

    logger.info("livekit_sfu_request_completed", {
      requestId: resolvedTraceContext.requestId,
      traceId: resolvedTraceContext.traceId,
      userId: resolvedTraceContext.userId,
      roomId: roomName,
      serviceUrl: livekitServiceURL,
      statusCode: res.status,
    });

    return await res.json();
  } catch (e) {
    logger.error("livekit_sfu_request_failed", {
      requestId: traceContext?.requestId,
      traceId: traceContext?.traceId,
      userId: traceContext?.userId,
      roomId: roomName,
      serviceUrl: livekitServiceURL,
    }, e);
    throw new Error("SFU Config fetch failed with exception " + e);
  }
}

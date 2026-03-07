/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  isLivekitTransportConfig,
  type LivekitTransportConfig,
} from "matrix-js-sdk/lib/matrixrtc";
import { type MatrixClient } from "matrix-js-sdk";
import { logger as rootLogger, type Logger } from "matrix-js-sdk/lib/logger";
import { AutoDiscovery } from "matrix-js-sdk/lib/autodiscovery";

import { Config } from "../../../config/Config.ts";
import { type CallTransport } from "../domain/CallTransport.ts";
import {
  type CallTransportDiscoveryPort,
  type CallTransportDiscoveryRequest,
  type DiscoveredCallTransports,
} from "../application/ports/CallTransportDiscoveryPort.ts";

const FOCI_WK_KEY = "org.matrix.msc4143.rtc_foci";

type TransportDiscoveryClient = Pick<MatrixClient, "getDomain">;

export class MatrixCallTransportDiscovery
  implements CallTransportDiscoveryPort
{
  public constructor(
    private readonly client: TransportDiscoveryClient,
    private readonly logger: Logger = rootLogger.getChild(
      "[MatrixCallTransportDiscovery]",
    ),
  ) {}

  public async discover({
    roomId,
    customLivekitServiceUrl,
  }: CallTransportDiscoveryRequest): Promise<DiscoveredCallTransports> {
    const livekitAlias = roomId;
    let developerOverride: CallTransport | undefined;
    let wellKnown: CallTransport | undefined;
    let configuredFallback: CallTransport | undefined;

    if (customLivekitServiceUrl !== null) {
      developerOverride = {
        kind: "livekit",
        serviceUrl: customLivekitServiceUrl,
        roomAlias: livekitAlias,
      };
      this.logger.info(
        "Using LiveKit transport from dev tools: ",
        developerOverride,
      );
    }

    const domain = this.client.getDomain();
    if (domain) {
      const wellKnownFoci = (await AutoDiscovery.getRawClientConfig(domain))?.[
        FOCI_WK_KEY
      ];
      if (Array.isArray(wellKnownFoci)) {
        const wellKnownTransport: LivekitTransportConfig | undefined =
          wellKnownFoci.find((f) => f && isLivekitTransportConfig(f));
        if (wellKnownTransport !== undefined) {
          wellKnown = {
            kind: "livekit",
            serviceUrl: wellKnownTransport.livekit_service_url,
            roomAlias: livekitAlias,
          };
          this.logger.debug(
            "Using LiveKit transport from .well-known: ",
            wellKnown,
          );
        }
      }
    }

    const urlFromConfig = Config.get().livekit?.livekit_service_url;
    if (urlFromConfig) {
      configuredFallback = {
        kind: "livekit",
        serviceUrl: urlFromConfig,
        roomAlias: livekitAlias,
      };
      this.logger.debug(
        "Using LiveKit transport from config: ",
        configuredFallback,
      );
    }

    return {
      developerOverride,
      wellKnown,
      configuredFallback,
    };
  }
}

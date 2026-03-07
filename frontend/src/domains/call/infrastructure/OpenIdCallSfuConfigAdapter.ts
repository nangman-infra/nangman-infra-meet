/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type CallSfuConfigPort } from "../application/ports/CallSfuConfigPort.ts";
import { type CallTransport } from "../domain/CallTransport.ts";
import {
  getSFUConfigWithOpenID,
  type OpenIDClientParts,
} from "../../../livekit/openIDSFU.ts";

export class OpenIdCallSfuConfigAdapter implements CallSfuConfigPort {
  public constructor(private readonly client: OpenIDClientParts) {}

  public async get(transport: CallTransport): ReturnType<CallSfuConfigPort["get"]> {
    return await getSFUConfigWithOpenID(
      this.client,
      transport.serviceUrl,
      transport.roomAlias,
    );
  }
}

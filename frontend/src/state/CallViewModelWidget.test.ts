/*
Copyright 2025 Element Creations Ltd.

  SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { it, vi, expect } from "vitest";
import { fromEvent } from "rxjs";

// import * as ComponentsCore from "@livekit/components-core";
import { withCallViewModel } from "./CallViewModel/CallViewModelTestUtils.ts";
import { type CallViewModel } from "./CallViewModel/CallViewModel.ts";
import { constant } from "./Behavior.ts";
import { aliceParticipant, localRtcMember } from "../utils/test-fixtures.ts";
import { ElementWidgetActions } from "../domains/widget/application/ports/WidgetHostPort.ts";
import { E2eeType } from "../e2ee/e2eeType.ts";

vi.mock("@livekit/components-core", { spy: true });

const widgetActions = vi.hoisted(() => new EventTarget());

vi.mock(
  "../domains/widget/application/services/WidgetActionService.ts",
  () => ({
    observeWidgetAction$: (action: string): ReturnType<typeof fromEvent> =>
      fromEvent(widgetActions, action),
    replyToWidgetAction: vi.fn(),
    sendWidgetAction: vi.fn().mockResolvedValue(undefined),
  }),
);

it("expect leave when ElementWidgetActions.HangupCall is called", async () => {
  const pr = Promise.withResolvers<string>();
  withCallViewModel(
    {
      remoteParticipants$: constant([aliceParticipant]),
      rtcMembers$: constant([localRtcMember]),
    },
    (vm: CallViewModel) => {
      vm.leave$.subscribe((s: string) => {
        pr.resolve(s);
      });

      widgetActions.dispatchEvent(
        new CustomEvent(ElementWidgetActions.HangupCall, {
          detail: {
            action: "im.vector.hangup",
            api: "toWidget",
            data: {},
            requestId: "widgetapi-1761237395918",
            widgetId: "mrUjS9T6uKUOWHMxXvLbSv0F",
          },
        }),
      );
    },
    {
      encryptionSystem: { kind: E2eeType.PER_PARTICIPANT },
    },
  );

  const source = await pr.promise;
  expect(source).toBe("user");
});

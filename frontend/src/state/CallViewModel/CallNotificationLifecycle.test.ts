/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, it } from "vitest";

import { withTestScheduler } from "../../utils/test";
import {
  aliceRtcMember,
  local,
  localRtcMember,
} from "../../utils/test-fixtures";
import {
  createCallNotificationLifecycle$,
  type Props as CallNotificationLifecycleProps,
} from "./CallNotificationLifecycle";
import { trackEpoch } from "../ObservableScope";
import { type ReceivedCallDecline } from "../../domains/call/domain/CallNotification";

interface DeclineReference {
  content?: {
    "m.relates_to"?: {
      event_id?: string;
    };
  };
  sender?: string;
}

describe("waitForCallPickup$", () => {
  it("unknown -> ringing -> timeout when notified and nobody joins", () => {
    withTestScheduler(({ scope, expectObservable, behavior, hot }) => {
      // No one ever joins (only local user)
      const props: CallNotificationLifecycleProps = {
        scope,
        memberships$: scope.behavior(
          behavior("a", { a: [] }).pipe(trackEpoch()),
        ),
        sentCallNotification$: hot("10ms a", {
          a: {
            eventId: "$notif1",
            notificationType: "ring",
            lifetimeMs: 30,
          },
        }),
        receivedDecline$: hot(""),
        options: {
          waitForCallPickup: true,
          autoLeaveWhenOthersLeft: false,
        },
        localUser: localRtcMember,
      };

      const lifecycle = createCallNotificationLifecycle$(props);

      expectObservable(lifecycle.callPickupState$).toBe("a 9ms b 29ms c", {
        a: "unknown",
        b: "ringing",
        c: "timeout",
      });
    });
  });

  it("ringing -> success if someone joins before timeout is reached", () => {
    withTestScheduler(({ scope, hot, behavior, expectObservable }) => {
      // Someone joins at 20ms (both LiveKit participant and MatrixRTC member)
      const props: CallNotificationLifecycleProps = {
        scope,
        memberships$: scope.behavior(
          behavior("a 19ms b", {
            a: [localRtcMember],
            b: [localRtcMember, aliceRtcMember],
          }).pipe(trackEpoch()),
        ),
        sentCallNotification$: hot("5ms a", {
          a: {
            eventId: "$notif2",
            notificationType: "ring",
            lifetimeMs: 100,
          },
        }),
        receivedDecline$: hot(""),
        options: {
          waitForCallPickup: true,
          autoLeaveWhenOthersLeft: false,
        },
        localUser: localRtcMember,
      };
      const lifecycle = createCallNotificationLifecycle$(props);
      expectObservable(lifecycle.callPickupState$).toBe("a 4ms b 14ms c", {
        a: "unknown",
        b: "ringing",
        c: "success",
      });
    });
  });
  it("success when someone joins before we notify", () => {
    withTestScheduler(({ scope, hot, behavior, expectObservable }) => {
      // Someone joins at 20ms (both LiveKit participant and MatrixRTC member)
      const props: CallNotificationLifecycleProps = {
        scope,
        memberships$: scope.behavior(
          behavior("a 9ms b", {
            a: [localRtcMember],
            b: [localRtcMember, aliceRtcMember],
          }).pipe(trackEpoch()),
        ),
        sentCallNotification$: hot("20ms a", {
          a: {
            eventId: "$notif2",
            notificationType: "ring",
            lifetimeMs: 50,
          },
        }),
        receivedDecline$: hot(""),
        options: {
          waitForCallPickup: true,
          autoLeaveWhenOthersLeft: false,
        },
        localUser: localRtcMember,
      };
      const lifecycle = createCallNotificationLifecycle$(props);
      expectObservable(lifecycle.callPickupState$).toBe("a 9ms b", {
        a: "unknown",
        b: "success",
      });
    });
  });
  it("notify without lifetime -> immediate timeout", () => {
    withTestScheduler(({ scope, hot, behavior, expectObservable }) => {
      // Someone joins at 20ms (both LiveKit participant and MatrixRTC member)
      const props: CallNotificationLifecycleProps = {
        scope,
        memberships$: scope.behavior(
          behavior("a", {
            a: [localRtcMember],
          }).pipe(trackEpoch()),
        ),
        sentCallNotification$: hot("10ms a", {
          a: {
            eventId: "$notif2",
            notificationType: "ring",
            lifetimeMs: 0,
          },
        }),
        receivedDecline$: hot(""),
        options: {
          waitForCallPickup: true,
          autoLeaveWhenOthersLeft: false,
        },
        localUser: localRtcMember,
      };
      const lifecycle = createCallNotificationLifecycle$(props);
      expectObservable(lifecycle.callPickupState$).toBe("a 9ms b", {
        a: "unknown",
        b: "timeout",
      });
    });
  });

  it("stays null when waitForCallPickup=false", () => {
    withTestScheduler(({ scope, hot, behavior, expectObservable }) => {
      // Someone joins at 20ms (both LiveKit participant and MatrixRTC member)
      const validProps: CallNotificationLifecycleProps = {
        scope,
        memberships$: scope.behavior(
          behavior("a--b", {
            a: [localRtcMember],
            b: [localRtcMember, aliceRtcMember],
          }).pipe(trackEpoch()),
        ),
        sentCallNotification$: hot("10ms a", {
          a: {
            eventId: "$notif5",
            notificationType: "ring",
            lifetimeMs: 30,
          },
        }),
        receivedDecline$: hot(""),
        options: {
          waitForCallPickup: true,
          autoLeaveWhenOthersLeft: false,
        },
        localUser: localRtcMember,
      };
      const propsDeactivated = {
        ...validProps,
        options: {
          ...validProps.options,
          waitForCallPickup: false,
        },
      };
      const lifecycle = createCallNotificationLifecycle$(propsDeactivated);
      expectObservable(lifecycle.callPickupState$).toBe("n", {
        n: null,
      });
      const lifecycleReference = createCallNotificationLifecycle$(validProps);
      expectObservable(lifecycleReference.callPickupState$).toBe("u--s", {
        u: "unknown",
        s: "success",
      });
    });
  });

  it("decline before timeout window ends -> decline", () => {
    withTestScheduler(({ scope, hot, behavior, expectObservable }) => {
      // Someone joins at 20ms (both LiveKit participant and MatrixRTC member)
      const props: CallNotificationLifecycleProps = {
        scope,
        memberships$: scope.behavior(
          behavior("a", {
            a: [localRtcMember],
          }).pipe(trackEpoch()),
        ),
        sentCallNotification$: hot("10ms a", {
          a: {
            eventId: "$decl1",
            notificationType: "ring",
            lifetimeMs: 50,
          },
        }),
        receivedDecline$: hot("40ms d", {
          d: {
            relatedEventId: "$decl1",
            sender: "@other:example.org",
          } satisfies ReceivedCallDecline,
        }),
        options: {
          waitForCallPickup: true,
          autoLeaveWhenOthersLeft: false,
        },
        localUser: localRtcMember,
      };
      const lifecycle = createCallNotificationLifecycle$(props);
      expectObservable(lifecycle.callPickupState$).toBe("a 9ms b 29ms e", {
        a: "unknown",
        b: "ringing",
        e: "decline",
      });
    });
  });
  it("decline after timeout window ends -> stays timeout", () => {
    withTestScheduler(({ scope, hot, behavior, expectObservable }) => {
      // Someone joins at 20ms (both LiveKit participant and MatrixRTC member)
      const props: CallNotificationLifecycleProps = {
        scope,
        memberships$: scope.behavior(
          behavior("a", {
            a: [localRtcMember],
          }).pipe(trackEpoch()),
        ),
        sentCallNotification$: hot("10ms a", {
          a: {
            eventId: "$decl",
            notificationType: "ring",
            lifetimeMs: 20,
          },
        }),
        receivedDecline$: hot("40ms d", {
          d: {
            relatedEventId: "$decl",
            sender: "@other:example.org",
          } satisfies ReceivedCallDecline,
        }),
        options: {
          waitForCallPickup: true,
          autoLeaveWhenOthersLeft: false,
        },
        localUser: localRtcMember,
      };
      const lifecycle = createCallNotificationLifecycle$(props);
      expectObservable(lifecycle.callPickupState$, "50ms !").toBe(
        "a 9ms b 19ms e",
        {
          a: "unknown",
          b: "ringing",
          e: "timeout",
        },
      );
    });
  });
  //
  function testStaysRinging(
    declineEvent: DeclineReference,
    expectDecline: boolean,
  ): void {
    withTestScheduler(({ scope, hot, behavior, expectObservable }) => {
      // Someone joins at 20ms (both LiveKit participant and MatrixRTC member)
      const props: CallNotificationLifecycleProps = {
        scope,
        memberships$: scope.behavior(
          behavior("a", {
            a: [localRtcMember],
          }).pipe(trackEpoch()),
        ),
        sentCallNotification$: hot("10ms a", {
          a: {
            eventId: "$right",
            notificationType: "ring",
            lifetimeMs: 50,
          },
        }),
        receivedDecline$: hot("20ms d", {
          d: {
            relatedEventId:
              declineEvent.content?.["m.relates_to"]?.event_id ?? undefined,
            sender: declineEvent.sender,
          } satisfies ReceivedCallDecline,
        }),
        options: {
          waitForCallPickup: true,
          autoLeaveWhenOthersLeft: false,
        },
        localUser: localRtcMember,
      };
      const lifecycle = createCallNotificationLifecycle$(props);
      const marbles = expectDecline ? "a 9ms b 9ms d" : "a 9ms b";
      expectObservable(lifecycle.callPickupState$, "21ms !").toBe(marbles, {
        a: "unknown",
        b: "ringing",
        d: "decline",
      });
    });
  }
  const reference = (refId?: string, sender?: string): DeclineReference => ({
    sender: sender ?? "@other:example.org",
    content: {
      "m.relates_to": {
        event_id: refId ?? "$right",
      },
    },
  });
  it("decline reference works", () => {
    testStaysRinging(reference(), true);
  });
  it("decline with wrong id is ignored (stays ringing)", () => {
    testStaysRinging(reference("$wrong"), false);
  });
  it("decline with wrong id is ignored (stays ringing)", () => {
    testStaysRinging(reference(undefined, local.userId), false);
  });
});

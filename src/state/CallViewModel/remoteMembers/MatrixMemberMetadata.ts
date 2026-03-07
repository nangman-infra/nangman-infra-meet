/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { combineLatest, map } from "rxjs";
import { logger as rootLogger } from "matrix-js-sdk/lib/logger";

import { type ObservableScope } from "../../ObservableScope";
import {
  calculateDisplayName,
  shouldDisambiguate,
} from "../../../utils/displayname";
import { type Behavior } from "../../Behavior";
import { type CallMember } from "../../../domains/call/domain/CallMember.ts";
import { type RoomMemberProfileMap } from "../../../domains/room/domain/RoomMemberProfile.ts";
export {
  createDirectMessageMemberProfile$ as createDMMember$,
  createRoomMemberProfiles$ as createRoomMembers$,
  roomToMemberProfilesMap as roomToMembersMap,
} from "../../../domains/room/infrastructure/MatrixRoomMemberProfiles.ts";
export type { RoomMemberProfileMap as RoomMemberMap } from "../../../domains/room/domain/RoomMemberProfile.ts";

const logger = rootLogger.getChild("[MatrixMemberMetadata]");

/**
 * Displayname for each member of the call. This will disambiguate
 * any displayname that clashes with another member. Only members
 * joined to the call are considered here.
 *
 * @returns Map<userId, displayname> uses the Matrix user ID as the key.
 */
// don't do this work more times than we need to. This is achieved by converting to a behavior:
export const memberDisplaynames$ = (
  scope: ObservableScope,
  memberships$: Behavior<CallMember[]>,
  roomMembers$: Behavior<RoomMemberProfileMap>,
): Behavior<Map<string, string>> => {
  // This map tracks userIds that at some point needed disambiguation.
  // This is a memory leak bound to the number of participants.
  // A call application will always increase the memory if there have been more members in a call.
  // Its capped by room member participants.
  const shouldDisambiguateTrackerMap = new Set<string>();
  return scope.behavior(
    combineLatest([
      // Handle call membership changes
      memberships$,
      // Additionally handle display name changes (implicitly reacting to them)
      roomMembers$,
      // TODO: do we need: pauseWhen(this.pretendToBeDisconnected$),
    ]).pipe(
      map(([memberships, roomMembers]) => {
        const displaynameMap = new Map<string, string>();
        // We only consider RTC members for disambiguation as they are the only visible members.
        for (const rtcMember of memberships) {
          const member = roomMembers.get(rtcMember.userId);
          if (!member) {
            logger.debug(`Could not find member for user ${rtcMember.userId}`);
            continue;
          }
          const disambiguateComputed = shouldDisambiguate(
            member,
            memberships,
            roomMembers,
          );

          const disambiguate =
            shouldDisambiguateTrackerMap.has(rtcMember.userId) ||
            disambiguateComputed;
          if (disambiguate) shouldDisambiguateTrackerMap.add(rtcMember.userId);
          displaynameMap.set(
            rtcMember.userId,
            calculateDisplayName(member, disambiguate),
          );
        }
        return displaynameMap;
      }),
    ),
  );
};

export const createMatrixMemberMetadata$ = (
  scope: ObservableScope,
  memberships$: Behavior<CallMember[]>,
  roomMembers$: Behavior<RoomMemberProfileMap>,
): {
  createDisplayNameBehavior$: (userId: string) => Behavior<string | undefined>;
  createAvatarUrlBehavior$: (userId: string) => Behavior<string | undefined>;
  displaynameMap$: Behavior<Map<string, string>>;
  avatarMap$: Behavior<Map<string, string | undefined>>;
} => {
  const displaynameMap$ = memberDisplaynames$(
    scope,
    memberships$,
    roomMembers$,
  );
  const avatarMap$ = scope.behavior(
    roomMembers$.pipe(
      map((roomMembers) =>
        Array.from(roomMembers.keys()).reduce((acc, key) => {
          acc.set(key, roomMembers.get(key)?.avatarUrl);
          return acc;
        }, new Map<string, string | undefined>()),
      ),
    ),
  );
  return {
    createDisplayNameBehavior$: (userId: string) =>
      scope.behavior(
        displaynameMap$.pipe(
          map((displaynameMap) => displaynameMap.get(userId)),
        ),
      ),
    createAvatarUrlBehavior$: (userId: string) =>
      scope.behavior(
        roomMembers$.pipe(map((roomMembers) => roomMembers.get(userId)?.avatarUrl)),
      ),
    // mostly for testing purposes
    displaynameMap$,
    avatarMap$,
  };
};

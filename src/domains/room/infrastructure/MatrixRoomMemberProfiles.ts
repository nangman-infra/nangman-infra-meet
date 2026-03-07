/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type RoomMember, RoomStateEvent } from "matrix-js-sdk";
import {
  KnownMembership,
  type Room as MatrixRoom,
} from "matrix-js-sdk/lib/matrix";
import { fromEvent, map } from "rxjs";

import { type Behavior } from "../../../state/Behavior";
import { type ObservableScope } from "../../../state/ObservableScope";
import {
  type RoomMemberProfile,
  type RoomMemberProfileMap,
} from "../domain/RoomMemberProfile.ts";

type MatrixRoomMemberLike = Pick<
  RoomMember,
  "userId" | "rawDisplayName" | "getMxcAvatarUrl"
>;

export function fromMatrixRoomMember(
  member: MatrixRoomMemberLike,
): RoomMemberProfile {
  return {
    userId: member.userId,
    rawDisplayName: member.rawDisplayName,
    avatarUrl: member.getMxcAvatarUrl() ?? undefined,
  };
}

export function roomToMemberProfilesMap(
  matrixRoom: MatrixRoom,
): RoomMemberProfileMap {
  const members = matrixRoom
    .getMembersWithMembership(KnownMembership.Join)
    .concat(matrixRoom.getMembersWithMembership(KnownMembership.Invite));
  return members.reduce((acc, member) => {
    acc.set(member.userId, fromMatrixRoomMember(member));
    return acc;
  }, new Map<string, RoomMemberProfile>());
}

export function createRoomMemberProfiles$(
  scope: ObservableScope,
  matrixRoom: MatrixRoom,
): Behavior<RoomMemberProfileMap> {
  return scope.behavior(
    fromEvent(matrixRoom, RoomStateEvent.Members).pipe(
      map(() => roomToMemberProfilesMap(matrixRoom)),
    ),
    roomToMemberProfilesMap(matrixRoom),
  );
}

export function createDirectMessageMemberProfile$(
  scope: ObservableScope,
  roomMemberProfiles$: Behavior<RoomMemberProfileMap>,
  matrixRoom: MatrixRoom,
): Behavior<RoomMemberProfile | null> {
  // We cannot use the normal direct check from matrix since we do not have access to the account data.
  // use primitive member count === 2 check instead.
  return scope.behavior(
    roomMemberProfiles$.pipe(
      map((membersMap) => {
        const isDM = membersMap.size === 2;
        if (!isDM) return null;
        return membersMap.get(matrixRoom.guessDMUserId()) ?? null;
      }),
    ),
  );
}

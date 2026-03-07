/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { logger } from "matrix-js-sdk/lib/logger";

import { RoomTerminationError } from "../errors/RoomTerminationError.ts";
import type {
  RoomLifecyclePort,
  RoomMembershipChangeListener,
} from "../ports/RoomLifecyclePort.ts";
import type { RoomCallSessionPort } from "../ports/RoomCallSessionPort.ts";
import type {
  JoinedRoom,
  RoomSummaryView,
} from "../../domain/RoomTypes.ts";

export type GroupCallLoadProgress =
  | {
      kind: "waitForInvite";
      roomSummary: RoomSummaryView;
    }
  | {
      kind: "canKnock";
      roomSummary: RoomSummaryView;
      knock: () => void;
    };

export interface LoadGroupCallRequest {
  roomClient: RoomLifecyclePort;
  roomIdOrAlias: string;
  viaServers: string[];
  widgetMode: boolean;
  onProgress?: (progress: GroupCallLoadProgress) => void;
}

export interface LoadedGroupCall {
  roomId: string;
  rtcSession: RoomCallSessionPort;
}

export interface RoomTerminationSubscriptionRequest {
  roomClient: RoomLifecyclePort;
  roomId: string;
  onTerminated: (error: RoomTerminationError) => void;
}

const MAX_ATTEMPTS_FOR_INVITE_JOIN_FAILURE = 3;
const DELAY_MS_FOR_INVITE_JOIN_FAILURE = 3000;

function createTerminationError(
  kind: RoomTerminationError["kind"],
  leaveReason?: string,
): RoomTerminationError {
  return new RoomTerminationError(kind, leaveReason);
}

function isForbiddenJoinRace(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "errcode" in error &&
    error.errcode === "M_FORBIDDEN"
  );
}

async function joinRoomAfterInvite(
  roomClient: RoomLifecyclePort,
  roomId: string,
  viaServers: string[],
  attempt = 0,
): Promise<JoinedRoom> {
  try {
    return await roomClient.joinRoom(roomId, viaServers);
  } catch (error) {
    if (
      isForbiddenJoinRace(error) &&
      attempt < MAX_ATTEMPTS_FOR_INVITE_JOIN_FAILURE
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_MS_FOR_INVITE_JOIN_FAILURE),
      );
      return await joinRoomAfterInvite(
        roomClient,
        roomId,
        viaServers,
        attempt + 1,
      );
    }
    throw error;
  }
}

async function getRoomByAlias(
  roomClient: RoomLifecyclePort,
  alias: string,
): Promise<JoinedRoom> {
  const lookupResult = await roomClient.resolveRoomAlias(alias.toLowerCase());
  logger.info(`${alias} resolved to ${lookupResult.roomId}`);

  const existingRoom = roomClient.getRoom(lookupResult.roomId);
  if (existingRoom) {
    logger.info(`Already in room ${lookupResult.roomId}, not rejoining.`);
    return existingRoom;
  }

  logger.info(`Room ${lookupResult.roomId} not found, joining.`);
  return await roomClient.joinRoom(lookupResult.roomId, lookupResult.viaServers);
}

async function getRoomByKnocking(
  roomClient: RoomLifecyclePort,
  roomId: string,
  viaServers: string[],
  onKnockSent: () => void,
): Promise<JoinedRoom> {
  await roomClient.knockRoom(roomId, viaServers);
  onKnockSent();

  return await new Promise<JoinedRoom>((resolve, reject) => {
    const onMembershipChange: RoomMembershipChangeListener = ({
      roomId: changedRoomId,
      membership,
      previousMembership,
      leaveReason,
    }): void => {
      if (roomId !== changedRoomId) return;

      if (membership === "invite" && previousMembership === "knock") {
        cleanup();
        void joinRoomAfterInvite(roomClient, changedRoomId, viaServers).then(
          (joinedRoom) => {
            logger.log("Auto-joined %s", joinedRoom.roomId);
            resolve(joinedRoom);
          },
          reject,
        );
      }

      if (membership === "ban") {
        cleanup();
        reject(createTerminationError("banned", leaveReason));
      }

      if (membership === "leave") {
        cleanup();
        reject(createTerminationError("knockRejected", leaveReason));
      }
    };

    const cleanup = (): void => {
      roomClient.offMyMembershipChange(onMembershipChange);
    };

    roomClient.onMyMembershipChange(onMembershipChange);
  });
}

async function fetchOrCreateRoom({
  roomClient,
  roomIdOrAlias,
  viaServers,
  widgetMode,
  onProgress,
}: LoadGroupCallRequest): Promise<JoinedRoom> {
  let room: JoinedRoom | null = null;

  if (roomIdOrAlias[0] === "#") {
    room = await getRoomByAlias(roomClient, roomIdOrAlias);
  } else {
    room = roomClient.getRoom(roomIdOrAlias);
    const membership = room?.membership;

    if (membership === "join") {
      return room!;
    }

    if (widgetMode) {
      throw new Error(
        "Room not found. The widget-api did not pass over the relevant room events/information.",
      );
    }

    if (membership === "ban") {
      throw createTerminationError("banned", room?.leaveReason);
    }

    if (membership === "invite") {
      room = await roomClient.joinRoom(roomIdOrAlias, viaServers);
    } else {
      let roomSummary: RoomSummaryView | undefined;

      try {
        roomSummary = await roomClient.getRoomSummary(roomIdOrAlias, viaServers);
      } catch (error) {
        logger.warn(
          `Could not load room summary to decide whether we want to join or knock.
          EC will fallback to join as if this would be a public room.
          Reach out to your homeserver admin to ask them about supporting the \`/summary\` endpoint (im.nheko.summary):`,
          error,
        );
      }

      if (roomSummary === undefined || roomSummary.joinRule === "public") {
        room = await roomClient.joinRoom(roomIdOrAlias, viaServers);
      } else if (roomSummary.joinRule === "knock") {
        const currentRoomSummary = roomSummary;
        let knock: () => void = () => {};
        const askToJoinPressed = new Promise<void>((resolve) => {
          if (currentRoomSummary.membership !== "knock") {
            knock = resolve;
          } else {
            resolve();
          }
        });

        onProgress?.({
          kind: "canKnock",
          roomSummary: currentRoomSummary,
          knock,
        });

        await askToJoinPressed;

        room = await getRoomByKnocking(
          roomClient,
          currentRoomSummary.roomId,
          viaServers,
          () =>
            onProgress?.({
              kind: "waitForInvite",
              roomSummary: currentRoomSummary,
            }),
        );
      } else {
        throw new Error(
          `Room ${roomSummary.roomId} is not joinable. This likely means, that the conference owner has changed the room settings to private.`,
        );
      }
    }
  }

  logger.info(
    `Joined ${roomIdOrAlias}, waiting room to be ready for group calls`,
  );
  await roomClient.waitUntilRoomReadyForGroupCalls(room.roomId);
  logger.info(`${roomIdOrAlias}, is ready for group calls`);
  return room;
}

export async function loadGroupCall(
  request: LoadGroupCallRequest,
): Promise<LoadedGroupCall> {
  await request.roomClient.waitUntilSyncing();
  const room = await fetchOrCreateRoom(request);
  logger.debug(`Fetched / joined room ${request.roomIdOrAlias}`);

  return {
    roomId: room.roomId,
    rtcSession: request.roomClient.getRoomSession(room.roomId),
  };
}

export function subscribeToRoomTermination({
  roomClient,
  roomId,
  onTerminated,
}: RoomTerminationSubscriptionRequest): () => void {
  const onMembershipChange: RoomMembershipChangeListener = ({
    roomId: changedRoomId,
    membership,
    leaveReason,
  }): void => {
    if (changedRoomId !== roomId) return;

    if (membership === "leave") {
      cleanup();
      onTerminated(createTerminationError("removed", leaveReason));
    }

    if (membership === "ban") {
      cleanup();
      onTerminated(createTerminationError("banned", leaveReason));
    }
  };

  const cleanup = (): void => {
    roomClient.offMyMembershipChange(onMembershipChange);
  };

  roomClient.onMyMembershipChange(onMembershipChange);
  return cleanup;
}

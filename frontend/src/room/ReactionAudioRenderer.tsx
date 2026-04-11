/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type ReactNode, useEffect, useState } from "react";

import { playReactionsSound, useSetting } from "../settings/settings";
import { GenericReaction, ReactionSet } from "../reactions";
import { useAudioContext } from "../useAudioContext";
import { prefetchSounds } from "../soundUtils";
import { useLatest } from "../useLatest";
import { type CallViewModel } from "../state/CallViewModel/CallViewModel";
import { fireAndForget } from "../utils/fireAndForget";

const soundMap = Object.fromEntries([
  ...ReactionSet.filter((v) => v.sound !== undefined).map((v) => [
    v.name,
    v.sound!,
  ]),
  [GenericReaction.name, GenericReaction.sound],
]);

export function ReactionsAudioRenderer({
  vm,
  muted,
}: {
  vm: CallViewModel;
  muted?: boolean;
}): ReactNode {
  const [shouldPlay] = useSetting(playReactionsSound);
  const [soundCache, setSoundCache] = useState<ReturnType<
    typeof prefetchSounds
  > | null>(null);
  const audioEngineCtx = useAudioContext({
    sounds: soundCache,
    latencyHint: "interactive",
    muted,
  });
  const audioEngineRef = useLatest(audioEngineCtx);

  useEffect(() => {
    if (!shouldPlay || soundCache) {
      return;
    }
    // This is fine even if we load the component multiple times,
    // as the browser's cache should ensure once the media is loaded
    // once that future fetches come via the cache.
    setSoundCache(prefetchSounds(soundMap));
  }, [soundCache, shouldPlay]);

  useEffect(() => {
    const sub = vm.audibleReactions$.subscribe((newReactions) => {
      for (const reactionName of newReactions) {
        if (soundMap[reactionName]) {
          fireAndForget(
            audioEngineRef.current?.playSound(reactionName),
            "Failed to play reaction sound",
          );
        } else {
          // Fallback sounds.
          fireAndForget(
            audioEngineRef.current?.playSound("generic"),
            "Failed to play fallback reaction sound",
          );
        }
      }
    });
    return (): void => {
      sub.unsubscribe();
    };
  }, [vm, audioEngineRef]);
  return null;
}

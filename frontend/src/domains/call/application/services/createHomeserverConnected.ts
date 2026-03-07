/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type Observable } from "rxjs";

import { type ObservableScope } from "../../../../state/ObservableScope";
import { type Behavior } from "../../../../state/Behavior";
import { and$ } from "../../../../utils/observable";

export function createHomeserverConnected$(
  scope: ObservableScope,
  syncing$: Observable<boolean>,
  membershipConnected$: Observable<boolean>,
  certainlyConnected$: Observable<boolean>,
): Behavior<boolean> {
  return scope.behavior(
    and$(syncing$, membershipConnected$, certainlyConnected$),
  );
}

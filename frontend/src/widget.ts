/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { registerMatrixWidgetClient } from "./domains/widget/infrastructure/MatrixWidgetClientRegistry.ts";
import { createMatrixWidgetEnvironment } from "./domains/widget/infrastructure/createMatrixWidgetHost.ts";
import { registerWidgetHost } from "./domains/widget/application/services/WidgetHostService.ts";

export {
  ElementWidgetActions,
  type JoinCallData,
  type WidgetHostPort as WidgetHelpers,
} from "./domains/widget/application/ports/WidgetHostPort.ts";

const widgetEnvironment = createMatrixWidgetEnvironment();

registerMatrixWidgetClient(widgetEnvironment?.client ?? null);
registerWidgetHost(widgetEnvironment?.host ?? null);

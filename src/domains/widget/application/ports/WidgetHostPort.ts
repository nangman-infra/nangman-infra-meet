/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import type {
  IWidgetApiRequest,
  IWidgetApiResponseData,
} from "matrix-widget-api";

// Subset of the actions in element-web
export enum ElementWidgetActions {
  JoinCall = "io.element.join",
  HangupCall = "im.vector.hangup",
  Close = "io.element.close",
  TileLayout = "io.element.tile_layout",
  SpotlightLayout = "io.element.spotlight_layout",
  DeviceMute = "io.element.device_mute",
}

export interface JoinCallData {
  audioInput: string | null;
  videoInput: string | null;
}

export interface WidgetTransportPort {
  send(action: string, data: unknown): Promise<unknown>;
  reply<T extends IWidgetApiResponseData = IWidgetApiResponseData>(
    request: IWidgetApiRequest,
    data: T,
  ): void;
  stop(): void | Promise<void>;
}

export interface WidgetApiPort {
  transport: WidgetTransportPort;
  setAlwaysOnScreen(value: boolean): Promise<boolean>;
  sendContentLoaded(): Promise<void>;
  hasCapability(capability: string): boolean;
}

export interface WidgetActionEmitterPort {
  on<T = unknown>(
    event: string,
    listener: (event: CustomEvent<T>) => void,
  ): void;
  off<T = unknown>(
    event: string,
    listener: (event: CustomEvent<T>) => void,
  ): void;
  emit<T = unknown>(event: string, payload: CustomEvent<T>): boolean;
}

export interface WidgetHostPort {
  api: WidgetApiPort;
  lazyActions: WidgetActionEmitterPort;
}

/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useCallback } from "react";
import { createClient, type MatrixClient } from "matrix-js-sdk";

import { type StoredSession as Session } from "../domains/auth/application/ports/SessionStorePort";
import { initClient } from "../utils/matrix";

export function useSSOLogin(): {
  startSSOLogin: (homeserver: string) => void;
  completeSSOLogin: (
    homeserver: string,
    loginToken: string,
  ) => Promise<[MatrixClient, Session]>;
} {
  const startSSOLogin = useCallback((homeserver: string) => {
    const redirectUrl = window.location.origin + "/login";
    window.location.href = `${homeserver}/_matrix/client/v3/login/sso/redirect?redirectUrl=${encodeURIComponent(
      redirectUrl,
    )}`;
  }, []);

  const completeSSOLogin = useCallback(
    async (
      homeserver: string,
      loginToken: string,
    ): Promise<[MatrixClient, Session]> => {
      const authClient = createClient({ baseUrl: homeserver });
      const response = await authClient.loginRequest({
        type: "m.login.token",
        token: loginToken,
      });

      const {
        user_id: userId,
        access_token: accessToken,
        device_id: deviceId,
      } = response;
      const session = {
        user_id: userId,
        access_token: accessToken,
        device_id: deviceId,
        passwordlessUser: false,
      };

      const client = await initClient(
        {
          baseUrl: homeserver,
          accessToken,
          userId,
          deviceId,
        },
        false,
      );

      return [client, session];
    },
    [],
  );

  return { startSSOLogin, completeSSOLogin };
}

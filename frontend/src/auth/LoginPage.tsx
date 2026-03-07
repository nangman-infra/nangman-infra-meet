/*
Copyright 2021-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC, useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@vector-im/compound-web";

import Logo from "../icons/LogoLarge.svg?react";
import { useClient } from "../ClientContext";
import { ErrorMessage } from "../input/Input";
import styles from "./LoginPage.module.css";
import { useSSOLogin } from "./useSSOLogin";
import { usePageTitle } from "../usePageTitle";
import { PosthogAnalytics } from "../analytics/PosthogAnalytics";
import { Config } from "../config/Config";

const LOGIN_REDIRECT_STORAGE_KEY = "element-call-login-redirect";

export const LoginPage: FC = () => {
  const { t } = useTranslation();
  usePageTitle(t("login_title"));

  const { setClient } = useClient();
  const { startSSOLogin, completeSSOLogin } = useSSOLogin();
  const homeserver = Config.defaultHomeserverUrl(); // TODO: Make this configurable
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  // Check for loginToken in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const loginToken = params.get("loginToken");

    if (loginToken && homeserver && setClient) {
      setLoading(true);
      completeSSOLogin(homeserver, loginToken)
        .then(([client, session]) => {
          setClient(client, session);
          const redirectPath =
            sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY) ?? "/";
          sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);
          void navigate(redirectPath);
          PosthogAnalytics.instance.eventLogin.track();
        })
        .catch((error) => {
          setError(error);
          setLoading(false);
        });
    }
  }, [location.search, homeserver, setClient, completeSSOLogin, navigate]);

  const startLogin = useCallback(() => {
    if (!homeserver) {
      setError(Error("Homeserver is undefined"));
      return;
    }

    const fromState = (location.state as { from?: unknown } | null)?.from;
    if (typeof fromState === "string") {
      sessionStorage.setItem(LOGIN_REDIRECT_STORAGE_KEY, fromState);
    } else if (
      fromState &&
      typeof fromState === "object" &&
      "pathname" in fromState
    ) {
      const { pathname, search } = fromState as {
        pathname: string;
        search?: string;
      };
      sessionStorage.setItem(
        LOGIN_REDIRECT_STORAGE_KEY,
        `${pathname}${search ?? ""}`,
      );
    } else {
      sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);
    }

    setLoading(true);
    void startSSOLogin(homeserver);
  }, [homeserver, startSSOLogin, location.state]);
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Logo className={styles.logo} />

        <div className={styles.header}>
          <h2>{t("log_in")}</h2>
          <p className={styles.subheading}>{t("login_subheading")}</p>
        </div>

        <div className={styles.actions}>
          <Button
            className={styles.primaryButton}
            type="button"
            onClick={startLogin}
            disabled={loading}
            data-testid="login_sso"
            kind="primary"
          >
            {loading
              ? t("logging_in")
              : t("login_sso_button", {
                  defaultValue: "Sign in with SSO",
                })}
          </Button>
          <p className={styles.helperText}>
            {t("login_sso_helper", {
              defaultValue:
                "Use your organization account to continue. Guest access and account creation are disabled.",
            })}
          </p>
        </div>

        {error && (
          <div className={styles.errorContainer}>
            <ErrorMessage error={error} />
          </div>
        )}
      </div>
    </div>
  );
};

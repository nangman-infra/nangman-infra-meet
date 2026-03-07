/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { BigIcon, Button, Heading } from "@vector-im/compound-web";
import {
  useCallback,
  type ComponentType,
  type FC,
  type ReactNode,
  type SVGAttributes,
  type ReactElement,
} from "react";
import { useTranslation } from "react-i18next";
import { logger } from "matrix-js-sdk/lib/logger";

import { RageshakeButton } from "./settings/RageshakeButton";
import styles from "./ErrorView.module.css";
import { LinkButton } from "./button";
import {
  closeWidget as closeWidgetHost,
  hasWidgetHost,
} from "./domains/widget/application/services/WidgetHostService.ts";
import { useUiUrlContext } from "./shared/application/readModels/UiUrlContext.ts";

interface Props {
  Icon: ComponentType<SVGAttributes<SVGElement>>;
  title: string;
  /**
   * Show an option to submit a rageshake.
   * @default false
   */
  rageshake?: boolean;
  /**
   * Whether the error is considered fatal, i.e. non-recoverable. Causes the app
   * to fully reload when clicking 'return to home'.
   * @default false
   */
  fatal?: boolean;
  children: ReactNode;
}

export const ErrorView: FC<Props> = ({
  Icon,
  title,
  rageshake,
  fatal,
  children,
}) => {
  const { t } = useTranslation();
  const { confineToRoom } = useUiUrlContext();
  const widgetMode = hasWidgetHost();

  const onReload = useCallback(() => {
    window.location.href = "/";
  }, []);

  const CloseWidgetButton: FC = (): ReactElement => {
    // in widget mode we don't want to show the return home button but a close button
    const onCloseWidget = (): void => {
      void closeWidgetHost().catch((e) => {
        logger.error("Failed to send close action", e);
      });
    };
    return (
      <Button kind="primary" onClick={onCloseWidget}>
        {t("action.close")}
      </Button>
    );
  };

  // Whether the error is considered fatal or pathname is `/` then reload the all app.
  // If not then navigate to home page.
  const ReturnToHomeButton = (): ReactElement => {
    if (fatal || location.pathname === "/") {
      return (
        <Button kind="tertiary" className={styles.homeLink} onClick={onReload}>
          {t("return_home_button")}
        </Button>
      );
    } else {
      return (
        <LinkButton kind="tertiary" className={styles.homeLink} to="/">
          {t("return_home_button")}
        </LinkButton>
      );
    }
  };

  return (
    <div className={styles.error}>
      <BigIcon className={styles.icon}>
        <Icon aria-hidden />
      </BigIcon>
      <Heading as="h1" weight="semibold" size="md">
        {title}
      </Heading>
      {children}
      {rageshake && (
        <RageshakeButton description={`***Error View***: ${title}`} />
      )}
      {widgetMode ? (
        <CloseWidgetButton />
      ) : (
        !confineToRoom && <ReturnToHomeButton />
      )}
    </div>
  );
};

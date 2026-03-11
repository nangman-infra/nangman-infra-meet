/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import { Heading, Glass } from "@vector-im/compound-web";

import styles from "./SidePanel.module.css";

interface SidePanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export const SidePanel: FC<SidePanelProps> = ({ title, onClose, children }) => {
  const { t } = useTranslation();

  return (
    <Glass className={styles.panel} role="complementary" aria-label={title}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Heading as="h2" size="md" weight="semibold">
            {title}
          </Heading>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t("action.close")}
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </Glass>
  );
};

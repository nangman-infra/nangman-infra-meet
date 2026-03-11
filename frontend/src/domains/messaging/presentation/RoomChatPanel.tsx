/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { Button, Heading, Text } from "@vector-im/compound-web";
import { type Room as MatrixRoom } from "matrix-js-sdk";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";

import { Avatar, Size as AvatarSize } from "../../../Avatar";
import { ErrorMessage, InputField } from "../../../input/Input";
import { Modal } from "../../../Modal";
import { SidePanel } from "../../../room/SidePanel";
import { useRoomChat } from "./useRoomChat";
import styles from "./RoomChatPanel.module.css";

interface RoomChatPanelProps {
  matrixRoom: MatrixRoom;
  open: boolean;
  onDismiss: () => void;
  presentation?: "modal" | "inline";
}

function formatMessageTime(sentAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(sentAt);
}

export const RoomChatPanel: FC<RoomChatPanelProps> = ({
  matrixRoom,
  open,
  onDismiss,
  presentation = "modal",
}) => {
  const { t } = useTranslation();
  const { canSend, clearError, error, messages, sendMessage } =
    useRoomChat(matrixRoom);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timelineEndRef = useRef<HTMLDivElement | null>(null);

  const orderedMessages = useMemo(() => messages, [messages]);

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    timelineEndRef.current?.scrollIntoView({ block: "end" });
  }, [open, orderedMessages.length]);

  const submitDraft = async (): Promise<void> => {
    const nextDraft = draft.trim();
    if (!nextDraft || sending) return;

    try {
      setSending(true);
      clearError();
      await sendMessage(nextDraft);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitDraft();
    }
  };

  const content = (
    <div className={styles.panel}>
      <div className={styles.headerBlock}>
        {presentation === "modal" && (
          <Heading size="sm" weight="semibold">
            {t("room_chat.heading")}
          </Heading>
        )}
        <Text as="div" size="sm" className={styles.intro}>
          {t("room_chat.description")}
        </Text>
        {error && (
          <div className={styles.error}>
            <ErrorMessage error={error} />
          </div>
        )}
      </div>

      <div className={styles.timeline}>
        {orderedMessages.length === 0 ? (
          <div className={styles.emptyState}>
            <Text as="div" size="sm">
              {t("room_chat.empty_state")}
            </Text>
          </div>
        ) : (
          orderedMessages.map((message) => (
            <article
              key={message.id}
              className={[
                styles.messageRow,
                message.isOwn ? styles.own : "",
              ].join(" ")}
            >
              <div className={styles.avatarWrap}>
                <Avatar
                  id={message.senderId}
                  name={message.senderName}
                  size={AvatarSize.SM}
                  src={message.senderAvatarUrl ?? undefined}
                />
              </div>
              <div className={styles.bubble}>
                <div className={styles.messageMeta}>
                  <Text as="span" size="sm" weight="semibold">
                    {message.isOwn ? t("room_chat.you") : message.senderName}
                  </Text>
                  <Text as="span" size="sm">
                    {formatMessageTime(message.sentAt)}
                  </Text>
                </div>
                <Text as="div" size="md" className={styles.messageBody}>
                  {message.body}
                </Text>
                {message.status !== "sent" && (
                  <Text as="div" size="sm" className={styles.messageStatus}>
                    {message.status === "failed"
                      ? t("room_chat.failed")
                      : t("room_chat.sending")}
                  </Text>
                )}
              </div>
            </article>
          ))
        )}
        <div ref={timelineEndRef} />
      </div>

      {canSend ? (
        <div className={styles.composerSection}>
          <div className={styles.composer}>
            <InputField
              ref={textareaRef}
              className={styles.composerField}
              type="textarea"
              label={t("room_chat.message_label")}
              placeholder={t("room_chat.message_placeholder")}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              disabled={sending}
              required
              onKeyDown={onComposerKeyDown}
            />
            <Button
              size="lg"
              kind="primary"
              disabled={sending || draft.trim().length === 0}
              onClick={() => {
                void submitDraft();
              }}
            >
              {t("room_chat.send")}
            </Button>
          </div>
          <Text as="div" size="sm" className={styles.composerHint}>
            {t("room_chat.composer_hint")}
          </Text>
        </div>
      ) : (
        <div className={styles.permissionHint}>
          <Text as="div" size="sm">
            {t("room_chat.read_only")}
          </Text>
        </div>
      )}
    </div>
  );

  if (presentation === "inline") {
    return (
      <SidePanel title={t("room_chat.title")} onClose={onDismiss}>
        {content}
      </SidePanel>
    );
  }

  return (
    <Modal
      open={open}
      onDismiss={onDismiss}
      title={t("room_chat.title")}
      className={styles.modalRoot}
      classNameModal={styles.modalDesktop}
      hideDesktopOverlay
    >
      {content}
    </Modal>
  );
};

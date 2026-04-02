/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { Button, Heading, Text } from "@vector-im/compound-web";
import { type Room as MatrixRoom } from "matrix-js-sdk";
import {
  useEffect,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";

import { ErrorMessage, InputField } from "../../../input/Input";
import { Modal } from "../../../Modal";
import { SidePanel } from "../../../room/SidePanel";
import { useRoomNote } from "./useRoomNote";
import styles from "./RoomNotePanel.module.css";

interface RoomNotePanelProps {
  matrixRoom: MatrixRoom;
  open: boolean;
  onDismiss: () => void;
  presentation?: "modal" | "inline";
}

export const RoomNotePanel: FC<RoomNotePanelProps> = ({
  matrixRoom,
  open,
  onDismiss,
  presentation = "modal",
}) => {
  const { t } = useTranslation();
  const { canEdit, clearError, error, note, saveNote } = useRoomNote(matrixRoom);
  const [draft, setDraft] = useState(note);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(note);
  }, [note]);

  useEffect(() => {
    if (!open || !canEdit) return;
    textareaRef.current?.focus();
  }, [canEdit, open]);

  const hasChanges = draft.trim() !== note.trim();

  const submitNote = async (): Promise<void> => {
    if (!canEdit || saving || !hasChanges) return;

    try {
      setSaving(true);
      clearError();
      await saveNote(draft);
    } finally {
      setSaving(false);
    }
  };

  const onComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submitNote();
    }
  };

  const content = (
    <div className={styles.panel}>
      <div>
        {presentation === "modal" && (
          <Heading size="sm" weight="semibold">
            {t("room_note.heading")}
          </Heading>
        )}
        <Text size="sm" className={styles.intro}>
          {t("room_note.description")}
        </Text>
      </div>

      {error && (
        <div className={styles.error}>
          <ErrorMessage error={error} />
        </div>
      )}

      <section className={styles.noteSurface}>
        <div>
          <Heading size="sm" weight="semibold">
            {t("room_note.current_note")}
          </Heading>
        </div>
        {note.trim().length > 0 ? (
          <Text size="md" className={styles.noteText}>
            {note}
          </Text>
        ) : (
          <Text size="sm" className={styles.emptyState}>
            {t("room_note.empty_state")}
          </Text>
        )}
      </section>

      {canEdit ? (
        <div className={styles.composer}>
          <InputField
            ref={textareaRef}
            className={styles.composerField}
            type="textarea"
            label={t("room_note.editor_label")}
            placeholder={t("room_note.editor_placeholder")}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            disabled={saving}
            onKeyDown={onComposerKeyDown}
          />
          <Text size="sm" className={styles.composerHint}>
            {t("room_note.editor_hint")}
          </Text>
          <div className={styles.actions}>
            <Button
              kind="secondary"
              size="lg"
              disabled={saving || !hasChanges}
              onClick={() => {
                setDraft(note);
                clearError();
              }}
            >
              {t("room_note.reset")}
            </Button>
            <Button
              kind="primary"
              size="lg"
              disabled={saving || !hasChanges}
              onClick={() => {
                void submitNote();
              }}
            >
              {t("room_note.save")}
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.permissionHint}>
          <Text size="sm">{t("room_note.read_only")}</Text>
        </div>
      )}
    </div>
  );

  if (presentation === "inline") {
    return (
      <SidePanel title={t("room_note.title")} onClose={onDismiss}>
        {content}
      </SidePanel>
    );
  }

  return (
    <Modal
      open={open}
      onDismiss={onDismiss}
      title={t("room_note.title")}
      className={styles.modalRoot}
      classNameModal={styles.modalDesktop}
      hideDesktopOverlay
    >
      {content}
    </Modal>
  );
};

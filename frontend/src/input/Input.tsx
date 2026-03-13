/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type ChangeEvent,
  type FC,
  type ForwardedRef,
  type KeyboardEventHandler,
  type ReactNode,
  useId,
  type JSX,
  type Ref,
} from "react";
import classNames from "classnames";

import styles from "./Input.module.css";
import CheckIcon from "../icons/Check.svg?react";
import { TranslatedError } from "../TranslatedError";

interface FieldRowProps {
  children: ReactNode;
  rightAlign?: boolean;
  className?: string;
}

export function FieldRow({
  children,
  rightAlign,
  className,
}: FieldRowProps): JSX.Element {
  return (
    <div
      className={classNames(
        styles.fieldRow,
        { [styles.rightAlign]: rightAlign },
        className,
      )}
    >
      {children}
    </div>
  );
}

interface FieldProps {
  children: ReactNode;
  className?: string;
}

function Field({ children, className }: FieldProps): JSX.Element {
  return <div className={classNames(styles.field, className)}>{children}</div>;
}

interface InputFieldProps {
  ref?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  label?: string;
  type: string;
  prefix?: string;
  suffix?: string;
  id?: string;
  checked?: boolean;
  className?: string;
  description?: string | ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  // this is a hack. Those variables should be part of `HTMLAttributes<HTMLInputElement> | HTMLAttributes<HTMLTextAreaElement>`
  // but extending from this union type does not work
  name?: string;
  autoComplete?: string;
  autoCorrect?: string;
  autoCapitalize?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  defaultChecked?: boolean;
  min?: number | string;
  step?: number | string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

export const InputField: FC<InputFieldProps> = ({
  ref,
  id,
  label,
  className,
  type,
  checked,
  prefix,
  suffix,
  description,
  disabled,
  readOnly,
  min,
  step,
  ...rest
}) => {
  const generatedFieldId = useId();
  const fieldId = id ?? generatedFieldId;
  const descriptionId = useId();
  const ariaDescribedBy = description ? descriptionId : undefined;
  const fieldClassName = classNames(
    type === "checkbox" ? styles.checkboxField : styles.inputField,
    {
      [styles.prefix]: !!prefix,
      [styles.disabled]: disabled,
    },
    className,
  );

  const control =
    type === "textarea" ? (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      <textarea
        id={fieldId}
        ref={ref as ForwardedRef<HTMLTextAreaElement>}
        disabled={disabled}
        readOnly={readOnly}
        aria-describedby={ariaDescribedBy}
        {...rest}
      />
    ) : (
      <input
        id={fieldId}
        ref={ref as ForwardedRef<HTMLInputElement>}
        type={type}
        checked={checked}
        disabled={disabled}
        readOnly={readOnly}
        aria-describedby={ariaDescribedBy}
        min={min}
        step={step}
        {...rest}
      />
    );

  const checkboxDescriptionClassName = label
    ? styles.description
    : classNames(styles.description, styles.noLabel);
  const descriptionNode = description ? (
    <p
      id={descriptionId}
      className={
        type === "checkbox"
          ? checkboxDescriptionClassName
          : styles.inputDescription
      }
    >
      {description}
    </p>
  ) : null;

  if (type === "checkbox") {
    return (
      <Field className={fieldClassName}>
        {prefix && <span>{prefix}</span>}
        {control}
        <label htmlFor={fieldId}>
          <div className={styles.checkbox}>
            <CheckIcon />
          </div>
          {label}
        </label>
        {suffix && <span>{suffix}</span>}
        {descriptionNode}
      </Field>
    );
  }

  return (
    <div className={styles.fieldContainer}>
      <Field className={fieldClassName}>
        {prefix && <span>{prefix}</span>}
        {control}
        <label htmlFor={fieldId}>{label}</label>
        {suffix && <span>{suffix}</span>}
      </Field>
      {descriptionNode}
    </div>
  );
};

InputField.displayName = "InputField";

interface ErrorMessageProps {
  error: Error;
}

export const ErrorMessage: FC<ErrorMessageProps> = ({ error }) => (
  <p className={styles.errorMessage}>
    {error instanceof TranslatedError ? error.translatedMessage : error.message}
  </p>
);

/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import loglevel from "loglevel";

const DEFAULT_NAMESPACE = "element-call";
type LogArgument = unknown;
type ConsoleMethodName = "error" | "warn" | "trace" | "info" | "debug";

export interface BaseLogger {
  trace(...msg: LogArgument[]): void;
  debug(...msg: LogArgument[]): void;
  info(...msg: LogArgument[]): void;
  warn(...msg: LogArgument[]): void;
  error(...msg: LogArgument[]): void;
}

export interface Logger extends loglevel.Logger, BaseLogger {
  getChild(namespace: string): Logger;
  log(...msg: LogArgument[]): void;
  prefix?: string;
}

type PrefixedLogger = Logger & { prefix?: string };

function isConsoleMethod(methodName: string): methodName is ConsoleMethodName {
  return (
    methodName === "error" ||
    methodName === "warn" ||
    methodName === "trace" ||
    methodName === "info" ||
    methodName === "debug"
  );
}

loglevel.methodFactory = function (
  methodName,
): (...args: LogArgument[]) => void {
  return function (this: PrefixedLogger, ...args: LogArgument[]): void {
    if (this.prefix) {
      args.unshift(this.prefix);
    }

    /* eslint-disable no-console */
    if (isConsoleMethod(methodName)) {
      const consoleMethod = console[methodName];
      if (typeof consoleMethod === "function") {
        consoleMethod(...args);
        return;
      }
    }

    console.log(...args);
    /* eslint-enable no-console */
  };
};

function getPrefixedLogger(prefix?: string): Logger {
  const loggerName =
    DEFAULT_NAMESPACE + (prefix === undefined ? "" : `-${prefix}`);
  const prefixedLogger = loglevel.getLogger(loggerName) as unknown as PrefixedLogger;

  if (prefixedLogger.getChild === undefined) {
    prefixedLogger.prefix = prefix;
    prefixedLogger.getChild = (childPrefix: string): Logger => {
      const childLogger = getPrefixedLogger(`${prefix ?? ""}${childPrefix}`);
      childLogger.methodFactory = prefixedLogger.methodFactory;
      childLogger.rebuild();
      return childLogger;
    };
    prefixedLogger.log = (...msg: LogArgument[]): void => {
      prefixedLogger.debug(...msg);
    };
    prefixedLogger.setLevel(loglevel.levels.DEBUG, false);
  }

  return prefixedLogger;
}

export const logger = getPrefixedLogger();
export const rootLogger = logger;

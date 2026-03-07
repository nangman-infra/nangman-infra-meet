/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

export class ParamParser {
  private readonly fragmentParams: URLSearchParams;
  private readonly queryParams: URLSearchParams;

  public constructor(search: string, hash: string) {
    this.queryParams = new URLSearchParams(search);

    const fragmentQueryStart = hash.indexOf("?");
    this.fragmentParams = new URLSearchParams(
      fragmentQueryStart === -1 ? "" : hash.substring(fragmentQueryStart),
    );
  }

  // Normally, URL params should be encoded in the fragment so as to avoid
  // leaking them to the server. However, we also check the normal query
  // string for backwards compatibility with versions that only used that.
  public getParam(name: string): string | null {
    return this.fragmentParams.get(name) ?? this.queryParams.get(name);
  }

  public getEnumParam<T extends string>(
    name: string,
    type: { [s: string]: T } | ArrayLike<T>,
  ): T | undefined {
    const value = this.getParam(name);
    if (value !== null && Object.values(type).includes(value as T)) {
      return value as T;
    }
    return undefined;
  }

  public getAllParams(name: string): string[] {
    return [
      ...this.fragmentParams.getAll(name),
      ...this.queryParams.getAll(name),
    ];
  }

  /**
   * Returns true if the flag exists and is not "false".
   */
  public getFlagParam(name: string, defaultValue = false): boolean {
    const param = this.getParam(name);
    return param === null ? defaultValue : param !== "false";
  }

  /**
   * Returns the value of the flag if it exists, or undefined if it does not.
   */
  public getFlag(name: string): boolean | undefined {
    const param = this.getParam(name);
    return param !== null ? param !== "false" : undefined;
  }
}

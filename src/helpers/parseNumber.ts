/**
 * @file Helper function for parsing the given argument as a `Number` type.
 */

import { isNullish } from "radashi";

/**
 * Processes the number.
 * @param argument - The number to attempt to parse.
 * @param defaultValue - The value to return if the parsing fails.
 * @returns The parsed number, or undefined if the number is NaN.
 * @source Parses the provided number.
 * @example
 * - With valid argument.
 * ```ts
 * const argument = "100";
 * const parsedArgument = parseNumber(argument);
 * console.log(parsedArgument); // outputs 100
 * ```
 * - With invalid argument
 * ```ts
 * const argument = "hellothere";
 * const parsedArgument = parseNumber(argument);
 * console.log(parsedArgument); // outputs 'undefined'
 * ```
 * - With default value
 * ```ts
 * const argument = node.height; // is `undefined`
 * const parsedArgument = argument(node.height, 0);
 * console.log(parsedArgument); // outputs `0`
 * ```
 */
export const parseNumber = (
  argument: null | number | string | undefined,
  defaultValue?: number
): number | undefined => {
  try {
    if (isNullish(argument)) {
      return defaultValue;
    }

    const parsedNumber = Number(argument);
    if (Number.isNaN(parsedNumber)) {
      return defaultValue;
    }

    return parsedNumber;
  } catch {
    return defaultValue;
  }
};

/**
 * @file Represents a temperature reading from the raspberry pi.
 */

import type { Id } from "./Id.ts";

/**
 * Represents a singular temperature datum in the database.
 */
export type Temperature = {
  /** Celsius reading. */
  celsius: number;

  /** Fahrenheit number. */
  fahrenheit: number;

  /** PK. */
  id: bigint;

  /**
   * Defines the ids linked to the temperature entry.
   */
  ids?: Id[];

  /** Kelvin representation of the temperature. */
  kelvin: number;

  /** Id denoting the pi (used internally). */
  pi_id: string;

  /** Temperature timestamp (the date of recording). */
  created_at: Date;
};

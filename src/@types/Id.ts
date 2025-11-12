/**
 * @file Represents the `Id` of the raspberry pi stored in the database.
 */

import type { Temperature } from "./Temperature.ts";

/**
 * Represents a single entry of a raspberry pi's metadata in the database.
 */
export type Id = {
  /** The creation date of the id. */
  created_at: Date;

  /** PK. */
  id: bigint;

  /** The name of the pi (used externally). */
  name: null | string;

  /** Id of the pi (used internally). */
  pi_id: null | string;

  /** Temperatures associated with the Pi Id. */
  temperatures?: Temperature[];
};

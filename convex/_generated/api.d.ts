/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as clerkActions from "../clerkActions.js";
import type * as clerkAdmin from "../clerkAdmin.js";
import type * as formats_americano from "../formats/americano.js";
import type * as formats_king_of_the_court from "../formats/king_of_the_court.js";
import type * as formats_knockout from "../formats/knockout.js";
import type * as formats_mexicano from "../formats/mexicano.js";
import type * as formats_round_robin from "../formats/round_robin.js";
import type * as formats_snakes_and_ladders from "../formats/snakes_and_ladders.js";
import type * as leaderboard from "../leaderboard.js";
import type * as lib_auth from "../lib/auth.js";
import type * as matches from "../matches.js";
import type * as organizations from "../organizations.js";
import type * as participants from "../participants.js";
import type * as ratings from "../ratings.js";
import type * as rounds from "../rounds.js";
import type * as scores from "../scores.js";
import type * as seed from "../seed.js";
import type * as teams from "../teams.js";
import type * as tournaments from "../tournaments.js";
import type * as users from "../users.js";
import type * as venues from "../venues.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  clerkActions: typeof clerkActions;
  clerkAdmin: typeof clerkAdmin;
  "formats/americano": typeof formats_americano;
  "formats/king_of_the_court": typeof formats_king_of_the_court;
  "formats/knockout": typeof formats_knockout;
  "formats/mexicano": typeof formats_mexicano;
  "formats/round_robin": typeof formats_round_robin;
  "formats/snakes_and_ladders": typeof formats_snakes_and_ladders;
  leaderboard: typeof leaderboard;
  "lib/auth": typeof lib_auth;
  matches: typeof matches;
  organizations: typeof organizations;
  participants: typeof participants;
  ratings: typeof ratings;
  rounds: typeof rounds;
  scores: typeof scores;
  seed: typeof seed;
  teams: typeof teams;
  tournaments: typeof tournaments;
  users: typeof users;
  venues: typeof venues;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

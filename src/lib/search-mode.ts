/** If node was not found, stop early. */
export const find = false;
/** If node was not found, create it. */
export const make = true;

export type Mode = typeof find | typeof make;

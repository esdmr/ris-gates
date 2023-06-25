/** If node was not found, stop early. */
export const find = 'find';
/** If node was not found, create it. */
export const make = 'make';

export type Mode = typeof find | typeof make;

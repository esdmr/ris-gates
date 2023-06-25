/** If node was not found, stop early. */
export const find = import.meta.env.DEV ? 'find' : false;
/** If node was not found, create it. */
export const make = import.meta.env.DEV ? 'make' : true;

export type Mode = typeof find | typeof make;

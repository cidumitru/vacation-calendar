export { cn } from "cn"

/** "1 day", "3 days". */
export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

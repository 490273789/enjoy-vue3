export const isObject = (val: unknown): boolean =>
  val !== null && typeof val === "object";

export function isFunction(value) {
  return typeof value == "function";
}

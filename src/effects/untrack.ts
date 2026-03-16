import { Context } from "@evgkch/context";

export function Untrack<T>(fn: () => T): T {
  const ctx = new Context(null);
  return ctx.run(fn);
}


export type Bindings<A extends string> = Readonly<Record<A, readonly string[]>>;

/** Returns the action bound to a KeyboardEvent.code, or undefined if none is. */
export function actionForCode<A extends string>(code: string, bindings: Bindings<A>): A | undefined {
  for (const action of Object.keys(bindings) as A[]) {
    if (bindings[action].includes(code)) return action;
  }
  return undefined;
}

/** Lists every code bound to more than one action, so config mistakes are caught in tests. */
export function findBindingConflicts<A extends string>(bindings: Bindings<A>): string[] {
  const owners = new Map<string, A>();
  const conflicts = new Set<string>();
  for (const action of Object.keys(bindings) as A[]) {
    for (const code of bindings[action]) {
      const owner = owners.get(code);
      if (owner !== undefined && owner !== action) conflicts.add(code);
      owners.set(code, action);
    }
  }
  return [...conflicts];
}

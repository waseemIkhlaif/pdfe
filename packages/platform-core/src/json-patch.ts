/**
 * RFC 6902 JSON Patch, for the configuration diff screen: what changed between two versions of a setting. `diff` makes the
 * patch, `apply` applies one (used by tests, and by anything that wants to replay a change). Only `add`, `remove` and
 * `replace` are produced, which is all a diff needs. Neither function changes its inputs.
 */
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type PatchOp =
  { op: 'add' | 'replace'; path: string; value: JsonValue } | { op: 'remove'; path: string };

const has = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

const isObject = (v: JsonValue): v is { [key: string]: JsonValue } =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** RFC 6901: `~` is `~0` and `/` is `~1` inside a path segment. */
const escapeSegment = (s: string): string => s.replace(/~/g, '~0').replace(/\//g, '~1');
const unescapeSegment = (s: string): string => s.replace(/~1/g, '/').replace(/~0/g, '~');

/** Sets an own property, also for a key such as `__proto__`, which plain assignment would treat as the prototype. */
function put(o: { [key: string]: JsonValue }, key: string, value: JsonValue): void {
  Object.defineProperty(o, key, { value, enumerable: true, writable: true, configurable: true });
}

const clone = (v: JsonValue): JsonValue => {
  if (Array.isArray(v)) return v.map(clone);
  if (isObject(v)) {
    const out: { [key: string]: JsonValue } = {};
    for (const [k, x] of Object.entries(v)) put(out, k, clone(x));
    return out;
  }
  return v;
};

export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]!));
  }
  if (isObject(a) && isObject(b)) {
    const ka = Object.keys(a);
    return (
      ka.length === Object.keys(b).length && ka.every((k) => has(b, k) && deepEqual(a[k]!, b[k]!))
    );
  }
  return false;
}

/** The patch that turns `a` into `b`. Empty when they are equal. */
export function diff(a: JsonValue, b: JsonValue): PatchOp[] {
  const ops: PatchOp[] = [];
  walk(a, b, '', ops);
  return ops;
}

function walk(a: JsonValue, b: JsonValue, path: string, ops: PatchOp[]): void {
  if (deepEqual(a, b)) return;
  if (Array.isArray(a) && Array.isArray(b)) {
    const common = Math.min(a.length, b.length);
    for (let i = 0; i < common; i++) walk(a[i]!, b[i]!, `${path}/${i}`, ops);
    // Removals from the end, so earlier indices stay valid; additions in order.
    for (let i = a.length - 1; i >= common; i--) ops.push({ op: 'remove', path: `${path}/${i}` });
    for (let i = common; i < b.length; i++)
      ops.push({ op: 'add', path: `${path}/${i}`, value: clone(b[i]!) });
    return;
  }
  if (isObject(a) && isObject(b)) {
    for (const k of Object.keys(a)) {
      if (!has(b, k)) ops.push({ op: 'remove', path: `${path}/${escapeSegment(k)}` });
    }
    for (const [k, v] of Object.entries(b)) {
      const p = `${path}/${escapeSegment(k)}`;
      if (!has(a, k)) ops.push({ op: 'add', path: p, value: clone(v) });
      else walk(a[k]!, v, p, ops);
    }
    return;
  }
  ops.push({ op: 'replace', path, value: clone(b) });
}

export class PatchError extends Error {}

/** Applies a patch to a copy of `doc`. Throws a PatchError when a path does not exist or an operation is not allowed. */
export function apply(doc: JsonValue, patch: readonly PatchOp[]): JsonValue {
  let root = clone(doc);
  for (const op of patch) {
    if (op.path === '') {
      if (op.op === 'remove') throw new PatchError('cannot remove the document root');
      root = clone(op.value);
      continue;
    }
    const segs = op.path.split('/').slice(1).map(unescapeSegment);
    const last = segs.pop()!;
    let parent: JsonValue = root;
    for (const s of segs) {
      const next: JsonValue | undefined = Array.isArray(parent)
        ? parent[Number(s)]
        : isObject(parent)
          ? has(parent, s)
            ? parent[s]
            : undefined
          : undefined;
      if (next === undefined) throw new PatchError(`no such path: ${op.path}`);
      parent = next;
    }
    if (Array.isArray(parent)) {
      const i = last === '-' ? parent.length : Number(last);
      if (!Number.isInteger(i) || i < 0 || i > parent.length)
        throw new PatchError(`bad index in ${op.path}`);
      if (op.op === 'add') parent.splice(i, 0, clone(op.value));
      else if (i >= parent.length) throw new PatchError(`no such path: ${op.path}`);
      else if (op.op === 'replace') parent[i] = clone(op.value);
      else parent.splice(i, 1);
    } else if (isObject(parent)) {
      if (op.op !== 'add' && !has(parent, last)) throw new PatchError(`no such path: ${op.path}`);
      if (op.op === 'remove') delete parent[last];
      else put(parent, last, clone(op.value));
    } else {
      throw new PatchError(`cannot reach ${op.path}`);
    }
  }
  return root;
}

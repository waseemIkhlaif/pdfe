import 'reflect-metadata';
import { RequestMethod, type Type } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import {
  AUTHENTICATED_ONLY,
  ELEVATION_CONTROL,
  IS_PUBLIC,
  REQUIRE_PERMISSION,
} from '../identity/public.decorator';

export interface RouteInfo {
  /** `GET /v1/approvals/:id`, the key used by the authorization matrix and the registry. */
  key: string;
  method: string;
  /** Nest path, with `:id` parameters. */
  path: string;
  controller: string;
  handler: string;
  public: boolean;
  authenticatedOnly: boolean;
  permission?: string;
  elevationControl: boolean;
  /** `@HttpCode(...)` of the handler, if any. */
  httpCode?: number;
}

const clean = (x: string) => x.replace(/^\/+|\/+$/g, '');

/** Every controller reachable from a module, found in the module metadata (no application boot needed). */
export function collectControllers(
  root: Type<unknown>,
  seen = new Set<Type<unknown>>(),
): Type<unknown>[] {
  if (seen.has(root)) return [];
  seen.add(root);
  const own = (Reflect.getMetadata('controllers', root) ?? []) as Type<unknown>[];
  const imports = (Reflect.getMetadata('imports', root) ?? []) as Type<unknown>[];
  return [...own, ...imports.flatMap((m) => collectControllers(m, seen))];
}

export function routesOf(controller: Type<unknown>): RouteInfo[] {
  const base = String(Reflect.getMetadata(PATH_METADATA, controller) ?? '');
  const classPublic = Reflect.getMetadata(IS_PUBLIC, controller) === true;
  const classElevation = Reflect.getMetadata(ELEVATION_CONTROL, controller) === true;
  const out: RouteInfo[] = [];
  for (const name of Object.getOwnPropertyNames(controller.prototype)) {
    const handler = (controller.prototype as Record<string, unknown>)[name];
    if (typeof handler !== 'function') continue;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
    if (method === undefined) continue;
    const path = `/${[clean(base), clean(String(Reflect.getMetadata(PATH_METADATA, handler) ?? ''))]
      .filter(Boolean)
      .join('/')}`;
    const verb = RequestMethod[method]!;
    out.push({
      key: `${verb} ${path}`,
      method: verb,
      path,
      controller: controller.name,
      handler: name,
      public: classPublic || Reflect.getMetadata(IS_PUBLIC, handler) === true,
      authenticatedOnly: Reflect.getMetadata(AUTHENTICATED_ONLY, handler) === true,
      ...(Reflect.getMetadata(REQUIRE_PERMISSION, handler)
        ? { permission: Reflect.getMetadata(REQUIRE_PERMISSION, handler) as string }
        : {}),
      elevationControl: classElevation || Reflect.getMetadata(ELEVATION_CONTROL, handler) === true,
      ...(Reflect.getMetadata('__httpCode__', handler)
        ? { httpCode: Reflect.getMetadata('__httpCode__', handler) as number }
        : {}),
    });
  }
  return out;
}

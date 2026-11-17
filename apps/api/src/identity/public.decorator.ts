import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'pdfe:public';
/** The route needs no token (health, meta). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const REQUIRE_PERMISSION = 'pdfe:permission';
/** The caller must hold this permission, or 403 FORBIDDEN. */
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRE_PERMISSION, permission);

export const AUTHENTICATED_ONLY = 'pdfe:authenticated-only';
/**
 * Any signed-in caller may reach the route; the service decides per request (for example, the approve
 * permission depends on the action type, and an elevation can be ended only by its owner).
 */
export const AuthenticatedOnly = () => SetMetadata(AUTHENTICATED_ONLY, true);

export const ELEVATION_CONTROL = 'pdfe:elevation-control';
/**
 * The route manages elevations. It is allowed while an elevation is active, and it does not run inside
 * the request transaction (which is read-only during an elevation).
 */
export const ElevationControl = () => SetMetadata(ELEVATION_CONTROL, true);

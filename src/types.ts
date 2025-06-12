import { Request, Response, NextFunction } from 'express';
import { Adminizer } from 'adminizer';

/**
 * Extended Express Request with Adminizer-specific properties
 */
export interface RequestWithAdminizer extends Request {
  adminizer: Adminizer;
  upload: (options?: any) => any;
  i18n: any;
  user?: any;
  session?: any;
  Inertia: any;
}

/**
 * Extended Express Response for Adminizer (no additional properties)
 */
export type ResponseWithAdminizer = Response;

/**
 * Raw middleware function using Adminizer request/response
 */
export type AdminizerRawMiddleware = (
  req: RequestWithAdminizer,
  res: ResponseWithAdminizer,
  next: NextFunction
) => any;

/**
 * Route-based middleware definition for Adminizer
 */
export interface AdminizerRouteMiddleware {
  /** Path under the Adminizer route prefix */
  route: string;
  /** HTTP method or 'use' for generic middleware */
  method?: 'use' | 'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
  handler: (
    req: RequestWithAdminizer,
    res: ResponseWithAdminizer,
    next: NextFunction
  ) => any;
}

/**
 * A middleware item for Adminizer: either a raw function or a route-based definition
 */
export type AdminizerMiddlewareDefinition =
  | AdminizerRawMiddleware
  | AdminizerRouteMiddleware;

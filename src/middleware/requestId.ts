import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export default function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerId = (req.headers["x-request-id"] as string) || undefined;
  const id = headerId || randomUUID();
  // pino-http will expose `req.id` when genReqId is used, but keep a stable field
  (req as any).requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

export const getRequestId = (req: Request) => (req as any).requestId as string | undefined;

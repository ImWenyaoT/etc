import type { NextFunction, Request, Response } from 'express'
import type { StoredUser } from '../repositories/types.js'
import { HttpError } from './errors.js'

declare global {
  // oxlint-disable-next-line typescript/no-namespace -- Express request augmentation
  namespace Express {
    interface Request {
      currentUser: StoredUser | null
    }
  }
}

export const requireAuth = (request: Request, _response: Response, next: NextFunction) => {
  if (!request.currentUser) {
    return next(new HttpError('unauthorized', '请先登录', 401))
  }

  return next()
}

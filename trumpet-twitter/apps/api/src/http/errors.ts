import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AuthError } from '../services/auth.js'

export class HttpError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  if (error instanceof ZodError) {
    return response.status(400).json({
      error: {
        code: 'validation_error',
        message: error.issues[0]?.message ?? '请求格式不正确',
      },
    })
  }

  if (error instanceof HttpError || error instanceof AuthError) {
    return response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
      },
    })
  }

  console.error(error)

  return response.status(500).json({
    error: {
      code: 'internal_error',
      message: '服务暂时不可用',
    },
  })
}

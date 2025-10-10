// Error Handling Utilities
// Standardized error classes and API error handler

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

// Base API Error class
export class ApiError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code || 'API_ERROR'
  }
}

// 400 - Validation Error
export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

// 401 - Unauthorized
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

// 403 - Forbidden
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

// 404 - Not Found
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

// 409 - Conflict
export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

// 429 - Rate Limit
export class RateLimitError extends ApiError {
  retryAfter: number

  constructor(retryAfter: number = 60) {
    super('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

// 500 - Internal Server Error
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR')
    this.name = 'InternalServerError'
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
    requestId?: string
  }
}

// Main error handler for API routes
export function handleApiError(error: unknown, requestId?: string): NextResponse<ErrorResponse> {
  console.error('API Error:', error)

  // Handle custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          requestId,
        },
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
          requestId,
        },
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Resource already exists',
            details: error.meta,
            requestId,
          },
        },
        { status: 409 }
      )
    }

    // Record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            requestId,
          },
        },
        { status: 404 }
      )
    }

    // Foreign key constraint violation
    if (error.code === 'P2003') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid reference to related resource',
            requestId,
          },
        },
        { status: 400 }
      )
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid data provided',
          requestId,
        },
      },
      { status: 400 }
    )
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    // In production, don't leak internal error details
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message,
          requestId,
        },
      },
      { status: 500 }
    )
  }

  // Unknown error type
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        requestId,
      },
    },
    { status: 500 }
  )
}

// Generate unique request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

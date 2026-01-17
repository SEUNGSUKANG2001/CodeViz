import { NextResponse } from 'next/server';

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export function errorResponse(code: string, message: string, status: number): NextResponse<ApiError> {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message },
    },
    { status }
  );
}

export function ERR_UNAUTHORIZED(message = 'Unauthorized'): NextResponse<ApiError> {
  return errorResponse('ERR_UNAUTHORIZED', message, 401);
}

export function ERR_FORBIDDEN(message = 'Forbidden'): NextResponse<ApiError> {
  return errorResponse('ERR_FORBIDDEN', message, 403);
}

export function ERR_NOT_FOUND(message = 'Not Found'): NextResponse<ApiError> {
  return errorResponse('ERR_NOT_FOUND', message, 404);
}

export function ERR_BAD_REQUEST(message = 'Bad Request'): NextResponse<ApiError> {
  return errorResponse('ERR_BAD_REQUEST', message, 400);
}

export function ERR_INTERNAL(message = 'Internal Server Error'): NextResponse<ApiError> {
  return errorResponse('ERR_INTERNAL', message, 500);
}

export function successResponse<T>(data: T, status = 200): NextResponse<{ ok: true; data: T }> {
  return NextResponse.json({ ok: true, data }, { status });
}

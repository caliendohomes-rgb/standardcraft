export class ValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
  }
}

export function requireJson(request: Request): void {
  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new ValidationError('Content-Type must be application/json', 415);
  }
}

export function requireString(value: unknown, field: string, maxLen = 1000): string {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${field} is required`, 400);
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`, 400);
  }
  if (!value.trim()) {
    throw new ValidationError(`${field} is required`, 400);
  }
  if (value.length > maxLen) {
    throw new ValidationError(`${field} must be ${maxLen} characters or fewer`, 400);
  }
  return value.trim();
}

export function optionalString(value: unknown, field: string, maxLen = 1000): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`, 400);
  }
  if (value.length > maxLen) {
    throw new ValidationError(`${field} must be ${maxLen} characters or fewer`, 400);
  }
  return value.trim() || null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function requireEmail(value: unknown, field = 'Email'): string {
  const s = requireString(value, field, 254);
  const lower = s.toLowerCase();
  if (!EMAIL_RE.test(lower)) {
    throw new ValidationError('Please enter a valid email address', 400);
  }
  return lower;
}

export function validationResponse(err: ValidationError): Response {
  return new Response(JSON.stringify({ error: err.message }), {
    status: err.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

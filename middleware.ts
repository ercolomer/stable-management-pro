import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // No hacer nada - las traducciones se manejan via cookies
  // Este middleware está vacío intencionalmente
  return NextResponse.next();
}

export const config = {
  // No aplicar middleware a ninguna ruta
  matcher: []
};

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Allowed origins for CORS (Environment specific + localhost development)
function getAllowedOrigins(request) {
  const allowed = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ]);

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      allowed.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
    } catch (_) {}
  }

  // Automatic Vercel system environments
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    allowed.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.VERCEL_URL) {
    allowed.add(`https://${process.env.VERCEL_URL}`);
  }

  // Trust same-origin matching current Host header
  const host = request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "http";
    allowed.add(`${proto}://${host}`);
  }

  return allowed;
}

export async function middleware(request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins(request);
  const isAllowedOrigin = origin ? allowedOrigins.has(origin) : true;
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  // 1. CORS PREFLIGHT (OPTIONS) HANDLING FOR ALL /api ROUTES
  if (request.method === "OPTIONS" && isApiRoute) {
    if (!isAllowedOrigin) {
      return new NextResponse(null, { status: 403, statusText: "Forbidden" });
    }

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 2. STRICT CROSS-ORIGIN FIREWALL (BLOCKS ALL HTTP VERBS: GET, POST, PUT, DELETE FROM UNTRUSTED ORIGINS)
  if (origin && !isAllowedOrigin && isApiRoute) {
    return NextResponse.json(
      { error: "Forbidden: Cross-origin request rejected by security policy" },
      { status: 403 }
    );
  }

  // 3. MODERN W3C FETCH METADATA FIREWALL (BLOCKS CROSS-SITE ATTACKS ON ALL SENSITIVE APIS)
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site" && isApiRoute) {
    return NextResponse.json(
      { error: "Forbidden: Cross-site API access rejected by security policy" },
      { status: 403 }
    );
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Apply standard CORS headers to API responses for allowed origins
  if (isApiRoute && origin && isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }

  // 4. INITIALIZE SUPABASE SSR CLIENT & REFRESH COOKIE SESSIONS
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              sameSite: options?.sameSite || "lax",
              secure: process.env.NODE_ENV === "production",
            }),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/signup");

  // 5. CENTRALIZED API AUTHENTICATION FIREWALL
  // Whitelist public API routes only; require authentication for everything else by default
  const isPublicApiRoute = pathname === "/api/auth/check-email";

  if (isApiRoute) {
    if (!user && !isPublicApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized: Active authentication session required" },
        { status: 401 }
      );
    }
    return response;
  }

  // 6. PAGE-LEVEL AUTHENTICATION GUARDS
  // If user is not logged in and trying to access private pages
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is logged in and visits login/signup
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

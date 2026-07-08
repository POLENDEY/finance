import { getSessionFromRequest } from "@/lib/auth/session";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname.startsWith("/login");
  const isAuthCallback = pathname.startsWith("/auth");
  const isHome = pathname === "/";

  if (!isHome && !isLoginPage && !isAuthCallback) {
    return NextResponse.next();
  }

  if (!session && isHome) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

import { getSessionFromRequest } from "@/lib/auth/session";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth");

  if (!session && !isLoginPage && !isAuthCallback) {
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

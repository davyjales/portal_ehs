import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type Role = "EMPLOYEE" | "ADMIN";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "ehs-prototype-secret-change-in-production"
);

export const COOKIE_NAME = "ehs-session";

export type SessionUser = {
  id: string;
  prontuario: string;
  name: string;
  role: Role;
};

export async function createSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

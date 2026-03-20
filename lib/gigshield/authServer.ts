import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, getUserById, getUserIdFromSession } from "./mockDb";
import type { User } from "./types";
import { SESSION_COOKIE_NAME } from "./authConstants";

export function getSessionIdFromCookies() {
  return cookies().get(SESSION_COOKIE_NAME)?.value;
}

export function getUserFromCookies(): User | undefined {
  const sessionId = getSessionIdFromCookies();
  if (!sessionId) return undefined;
  const userId = getUserIdFromSession({ sessionId, now: Date.now() });
  if (!userId) return undefined;
  return getUserById(userId);
}

export function requireUser(): User {
  const user = getUserFromCookies();
  if (!user) redirect("/login");
  return user;
}

export function requireAdmin(): User {
  const user = requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

// For server-side debug helpers if needed.
export function getUserCountForDebug() {
  return getDb().usersById.size;
}


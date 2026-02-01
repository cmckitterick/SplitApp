import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { requireAuth } from "./auth";

/**
 * Checks that the request has a valid session.
 * Returns the session or a 401 response.
 */
export async function withAuth() {
  const session = await requireAuth();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

/**
 * Checks that the authenticated user is a member of the specified group.
 * Returns the membership record or a 403 response.
 */
export async function requireGroupMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });

  if (!membership) {
    return {
      membership: null,
      error: NextResponse.json(
        { error: "Forbidden: not a member of this group" },
        { status: 403 }
      ),
    };
  }

  return { membership, error: null };
}

/**
 * Checks that the authenticated user is the owner of the specified group.
 * Returns the membership record or a 403 response.
 */
export async function requireGroupOwner(groupId: string, userId: string) {
  const { membership, error } = await requireGroupMember(groupId, userId);
  if (error) return { membership: null, error };

  if (membership!.role !== "OWNER") {
    return {
      membership: null,
      error: NextResponse.json(
        { error: "Forbidden: only the group owner can perform this action" },
        { status: 403 }
      ),
    };
  }

  return { membership, error: null };
}

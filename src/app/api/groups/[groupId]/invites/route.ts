import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, requireGroupOwner, requireGroupMember } from "@/lib/middleware";
import crypto from "crypto";

// POST /api/groups/[groupId]/invites — generate a new invite link (owner only)
export async function POST(
  _request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const { session, error: authError } = await withAuth();
  if (authError) return authError;

  const { groupId } = params;
  const userId = session!.user.id;

  const { error: ownerError } = await requireGroupOwner(groupId, userId);
  if (ownerError) return ownerError;

  // Verify group exists
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Generate a cryptographically secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.groupInvite.create({
    data: {
      token,
      groupId,
      createdBy: userId,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/join?token=${token}&group=${groupId}`;

  return NextResponse.json(
    {
      token: invite.token,
      inviteUrl,
      expiresAt: invite.expiresAt,
    },
    { status: 201 }
  );
}

// GET /api/groups/[groupId]/invites?token=... — validate and redeem an invite
// This is the ONLY endpoint that does not require prior group membership.
// It DOES require authentication.
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const { session, error: authError } = await withAuth();
  if (authError) return authError;

  const { groupId } = params;
  const userId = session!.user.id;

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: "Invite token is required" },
      { status: 400 }
    );
  }

  // Find the invite
  const invite = await prisma.groupInvite.findFirst({
    where: {
      token,
      groupId,
    },
    include: {
      group: { select: { id: true, name: true } },
    },
  });

  if (!invite) {
    return NextResponse.json(
      { error: "Invalid invite link" },
      { status: 404 }
    );
  }

  // Check if already used
  if (invite.used) {
    return NextResponse.json(
      { error: "This invite link has already been used" },
      { status: 400 }
    );
  }

  // Check if expired
  if (new Date() > invite.expiresAt) {
    return NextResponse.json(
      { error: "This invite link has expired" },
      { status: 400 }
    );
  }

  // Check if user is already a member
  const existingMember = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (existingMember) {
    return NextResponse.json({
      message: "You are already a member of this group",
      group: invite.group,
      alreadyMember: true,
    });
  }

  // Add user as a member and mark invite as used
  await prisma.$transaction([
    prisma.groupMember.create({
      data: {
        userId,
        groupId,
        role: "MEMBER",
      },
    }),
    prisma.groupInvite.update({
      where: { id: invite.id },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({
    message: "Successfully joined the group",
    group: invite.group,
    alreadyMember: false,
  });
}

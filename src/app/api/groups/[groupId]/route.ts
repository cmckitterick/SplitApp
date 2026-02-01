import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, requireGroupMember, requireGroupOwner } from "@/lib/middleware";

// GET /api/groups/[groupId] — group detail
export async function GET(
  _request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const { session, error: authError } = await withAuth();
  if (authError) return authError;

  const { groupId } = params;
  const userId = session!.user.id;

  const { error: memberError } = await requireGroupMember(groupId, userId);
  if (memberError) return memberError;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      expenses: {
        include: {
          payer: { select: { id: true, name: true, email: true } },
          splits: true,
        },
        orderBy: { createdAt: "desc" },
      },
      settlements: {
        include: {
          payer: { select: { id: true, name: true, email: true } },
          payee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json(group);
}

// DELETE /api/groups/[groupId] — delete group (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const { session, error: authError } = await withAuth();
  if (authError) return authError;

  const { groupId } = params;
  const userId = session!.user.id;

  const { error: ownerError } = await requireGroupOwner(groupId, userId);
  if (ownerError) return ownerError;

  await prisma.group.delete({ where: { id: groupId } });

  return NextResponse.json({ message: "Group deleted" });
}

// PATCH /api/groups/[groupId] — update group name (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const { session, error: authError } = await withAuth();
  if (authError) return authError;

  const { groupId } = params;
  const userId = session!.user.id;

  const { error: ownerError } = await requireGroupOwner(groupId, userId);
  if (ownerError) return ownerError;

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name || name.length === 0) {
    return NextResponse.json(
      { error: "Group name is required" },
      { status: 400 }
    );
  }

  if (name.length > 100) {
    return NextResponse.json(
      { error: "Group name must be 100 characters or less" },
      { status: 400 }
    );
  }

  const group = await prisma.group.update({
    where: { id: groupId },
    data: { name },
  });

  return NextResponse.json(group);
}

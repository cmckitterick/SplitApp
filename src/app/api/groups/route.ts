import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";

// GET /api/groups — list all groups for the authenticated user
export async function GET() {
  const { session, error } = await withAuth();
  if (error) return error;

  const userId = session!.user.id;

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const groups = memberships.map((m: any) => ({
    id: m.group.id,
    name: m.group.name,
    role: m.role,
    memberCount: m.group._count.members,
    createdAt: m.group.createdAt,
    members: m.group.members.map((gm: any) => ({
      id: gm.user.id,
      name: gm.user.name,
      email: gm.user.email,
      role: gm.role,
    })),
  }));

  return NextResponse.json(groups);
}

// POST /api/groups — create a new group
export async function POST(request: NextRequest) {
  const { session, error } = await withAuth();
  if (error) return error;

  const userId = session!.user.id;

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

  const group = await prisma.group.create({
    data: {
      name,
      createdBy: userId,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return NextResponse.json(group, { status: 201 });
}

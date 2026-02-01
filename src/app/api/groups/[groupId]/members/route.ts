import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, requireGroupMember, requireGroupOwner } from "@/lib/middleware";
import { computeBalances } from "@/lib/balance";
import Decimal from "decimal.js";

// GET /api/groups/[groupId]/members — list group members
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

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json(members);
}

// DELETE /api/groups/[groupId]/members — remove a member (owner only, or self-remove)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const { session, error: authError } = await withAuth();
  if (authError) return authError;

  const { groupId } = params;
  const currentUserId = session!.user.id;

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetUserId = body.userId?.trim();
  if (!targetUserId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  // If removing someone else, must be owner
  if (targetUserId !== currentUserId) {
    const { error: ownerError } = await requireGroupOwner(groupId, currentUserId);
    if (ownerError) return ownerError;
  } else {
    // Self-remove: must be a member
    const { error: memberError } = await requireGroupMember(groupId, currentUserId);
    if (memberError) return memberError;
  }

  // Check that the target is a member
  const targetMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });

  if (!targetMembership) {
    return NextResponse.json(
      { error: "User is not a member of this group" },
      { status: 404 }
    );
  }

  // Cannot remove the owner
  if (targetMembership.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot remove the group owner" },
      { status: 400 }
    );
  }

  // Check if the user has an outstanding balance
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true },
  });

  const settlements = await prisma.settlement.findMany({
    where: { groupId },
  });

  const balances = computeBalances(
    expenses.map((e: any) => ({
      paidBy: e.paidBy,
      totalAmount: e.totalAmount.toString(),
      splits: e.splits.map((s: any) => ({
        userId: s.userId,
        amount: s.amount.toString(),
      })),
    })),
    settlements.map((s: any) => ({
      payerId: s.payerId,
      payeeId: s.payeeId,
      amount: s.amount.toString(),
    }))
  );

  const userBalance = balances.get(targetUserId) ?? new Decimal(0);
  if (userBalance.abs().greaterThan(new Decimal("0.01"))) {
    return NextResponse.json(
      { error: "Cannot remove a member with an outstanding balance" },
      { status: 400 }
    );
  }

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });

  return NextResponse.json({ message: "Member removed" });
}

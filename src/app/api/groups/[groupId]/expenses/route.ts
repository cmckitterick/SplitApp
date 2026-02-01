import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, requireGroupMember } from "@/lib/middleware";
import Decimal from "decimal.js";

// GET /api/groups/[groupId]/expenses — list all expenses in a group
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

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      payer: { select: { id: true, name: true, email: true } },
      splits: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(expenses);
}

// POST /api/groups/[groupId]/expenses — add a new expense
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const { session, error: authError } = await withAuth();
  if (authError) return authError;

  const { groupId } = params;
  const userId = session!.user.id;

  const { error: memberError } = await requireGroupMember(groupId, userId);
  if (memberError) return memberError;

  let body: {
    description?: string;
    totalAmount?: number | string;
    paidBy?: string;
    splits?: { userId: string; amount: number | string }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate description
  const description = body.description?.trim();
  if (!description || description.length === 0) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    );
  }

  // Validate total amount
  let totalAmount: Decimal;
  try {
    totalAmount = new Decimal(body.totalAmount ?? 0);
  } catch {
    return NextResponse.json(
      { error: "Invalid total amount" },
      { status: 400 }
    );
  }

  if (totalAmount.lessThanOrEqualTo(0)) {
    return NextResponse.json(
      { error: "Total amount must be positive" },
      { status: 400 }
    );
  }

  // Validate paidBy
  const paidBy = body.paidBy?.trim();
  if (!paidBy) {
    return NextResponse.json(
      { error: "paidBy is required" },
      { status: 400 }
    );
  }

  // Verify paidBy is a member of the group
  const payerMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: paidBy, groupId } },
  });
  if (!payerMembership) {
    return NextResponse.json(
      { error: "Payer is not a member of this group" },
      { status: 400 }
    );
  }

  // Validate splits
  if (!body.splits || !Array.isArray(body.splits) || body.splits.length === 0) {
    return NextResponse.json(
      { error: "At least one split is required" },
      { status: 400 }
    );
  }

  // Validate each split
  const splitData: { userId: string; amount: Decimal }[] = [];
  const seenUserIds = new Set<string>();

  for (const split of body.splits) {
    if (!split.userId?.trim()) {
      return NextResponse.json(
        { error: "Each split must have a userId" },
        { status: 400 }
      );
    }

    if (seenUserIds.has(split.userId)) {
      return NextResponse.json(
        { error: `Duplicate userId in splits: ${split.userId}` },
        { status: 400 }
      );
    }
    seenUserIds.add(split.userId);

    let splitAmount: Decimal;
    try {
      splitAmount = new Decimal(split.amount ?? 0);
    } catch {
      return NextResponse.json(
        { error: `Invalid amount for user ${split.userId}` },
        { status: 400 }
      );
    }

    if (splitAmount.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        { error: "Split amounts must be positive" },
        { status: 400 }
      );
    }

    splitData.push({ userId: split.userId, amount: splitAmount });
  }

  // Verify all split users are group members
  const memberUserIds = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });
  const memberIdSet = new Set(memberUserIds.map((m: any) => m.userId));

  for (const split of splitData) {
    if (!memberIdSet.has(split.userId)) {
      return NextResponse.json(
        { error: `User ${split.userId} is not a member of this group` },
        { status: 400 }
      );
    }
  }

  // Verify splits sum to total
  const splitsSum = splitData.reduce(
    (sum, s) => sum.plus(s.amount),
    new Decimal(0)
  );

  if (!splitsSum.equals(totalAmount)) {
    return NextResponse.json(
      {
        error: `Splits sum (${splitsSum.toFixed(2)}) does not equal total amount (${totalAmount.toFixed(2)})`,
      },
      { status: 400 }
    );
  }

  // Create expense with splits
  const expense = await prisma.expense.create({
    data: {
      groupId,
      description,
      totalAmount: totalAmount.toFixed(2),
      paidBy,
      splits: {
        createMany: {
          data: splitData.map((s) => ({
            userId: s.userId,
            amount: s.amount.toFixed(2),
          })),
        },
      },
    },
    include: {
      payer: { select: { id: true, name: true, email: true } },
      splits: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json(expense, { status: 201 });
}

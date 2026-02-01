import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, requireGroupMember } from "@/lib/middleware";
import { computeBalances, computeSettlements } from "@/lib/balance";
import Decimal from "decimal.js";

// GET /api/groups/[groupId]/settle — get suggested settlements
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

  const [expenses, settlements, members] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId },
      include: { splits: true },
    }),
    prisma.settlement.findMany({
      where: { groupId },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

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

  const suggestions = computeSettlements(balances);

  // Enrich with user info
  const memberMap = new Map<string, { id: string; name: string | null; email: string }>(
    members.map((m: any) => [m.userId, m.user])
  );
  const enrichedSuggestions = suggestions.map((s) => {
    const fromUser = memberMap.get(s.from);
    const toUser = memberMap.get(s.to);
    return {
      from: {
        id: s.from,
        name: fromUser?.name ?? fromUser?.email ?? s.from,
        email: fromUser?.email ?? "",
      },
      to: {
        id: s.to,
        name: toUser?.name ?? toUser?.email ?? s.to,
        email: toUser?.email ?? "",
      },
      amount: s.amount,
    };
  });

  return NextResponse.json(enrichedSuggestions);
}

// POST /api/groups/[groupId]/settle — record a settlement
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
    payerId?: string;
    payeeId?: string;
    amount?: number | string;
    note?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payerId = body.payerId?.trim();
  const payeeId = body.payeeId?.trim();

  if (!payerId) {
    return NextResponse.json({ error: "payerId is required" }, { status: 400 });
  }
  if (!payeeId) {
    return NextResponse.json({ error: "payeeId is required" }, { status: 400 });
  }
  if (payerId === payeeId) {
    return NextResponse.json(
      { error: "Payer and payee must be different" },
      { status: 400 }
    );
  }

  let amount: Decimal;
  try {
    amount = new Decimal(body.amount ?? 0);
  } catch {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (amount.lessThanOrEqualTo(0)) {
    return NextResponse.json(
      { error: "Amount must be positive" },
      { status: 400 }
    );
  }

  // Verify both users are group members
  const [payerMember, payeeMember] = await Promise.all([
    prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: payerId, groupId } },
    }),
    prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: payeeId, groupId } },
    }),
  ]);

  if (!payerMember) {
    return NextResponse.json(
      { error: "Payer is not a member of this group" },
      { status: 400 }
    );
  }
  if (!payeeMember) {
    return NextResponse.json(
      { error: "Payee is not a member of this group" },
      { status: 400 }
    );
  }

  const note = body.note?.trim() || null;

  const settlement = await prisma.settlement.create({
    data: {
      groupId,
      payerId,
      payeeId,
      amount: amount.toFixed(2),
      note,
    },
    include: {
      payer: { select: { id: true, name: true, email: true } },
      payee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(settlement, { status: 201 });
}

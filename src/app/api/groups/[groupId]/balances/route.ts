import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, requireGroupMember } from "@/lib/middleware";
import { computeBalances, balancesToRecord } from "@/lib/balance";

// GET /api/groups/[groupId]/balances — computed balances for this group
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

  const balanceRecord = balancesToRecord(balances);

  // Enrich with user info
  const memberMap = new Map<string, { id: string; name: string | null; email: string }>(
    members.map((m: any) => [m.userId, m.user])
  );
  const enrichedBalances = Object.entries(balanceRecord).map(
    ([uid, amount]) => ({
      userId: uid,
      name: memberMap.get(uid)?.name ?? memberMap.get(uid)?.email ?? uid,
      email: memberMap.get(uid)?.email ?? "",
      balance: amount,
    })
  );

  return NextResponse.json(enrichedBalances);
}

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { computeBalances, computeSettlements } from "@/lib/balance";
import SettlePageClient from "./SettlePageClient";

interface SettlePageProps {
  params: { groupId: string };
}

export default async function SettlePage({ params }: SettlePageProps) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;
  const { groupId } = params;

  // Verify membership
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (!membership) {
    notFound();
  }

  const [group, expenses, settlements, members] = await Promise.all([
    prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    }),
    prisma.expense.findMany({
      where: { groupId },
      include: { splits: true },
    }),
    prisma.settlement.findMany({
      where: { groupId },
      include: {
        payer: { select: { id: true, name: true, email: true } },
        payee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  if (!group) {
    notFound();
  }

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

  const rawSuggestions = computeSettlements(balances);

  // Enrich suggestions with user info
  const memberMap = new Map<string, { id: string; name: string | null; email: string }>(
    members.map((m: any) => [m.userId, m.user])
  );
  const suggestions = rawSuggestions.map((s) => {
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

  const pastSettlements = settlements.map((s: any) => ({
    id: s.id,
    payerId: s.payerId,
    payeeId: s.payeeId,
    amount: s.amount.toString(),
    note: s.note,
    createdAt: s.createdAt.toISOString(),
    payer: s.payer,
    payee: s.payee,
  }));

  return (
    <SettlePageClient
      group={group}
      suggestions={suggestions}
      pastSettlements={pastSettlements}
      currentUserId={userId}
    />
  );
}

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { computeBalances } from "@/lib/balance";
import GroupPageClient from "./GroupPageClient";

interface GroupPageProps {
  params: { groupId: string };
}

export default async function GroupPage({ params }: GroupPageProps) {
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
          splits: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      settlements: true,
    },
  });

  if (!group) {
    notFound();
  }

  const balances = computeBalances(
    group.expenses.map((e: any) => ({
      paidBy: e.paidBy,
      totalAmount: e.totalAmount.toString(),
      splits: e.splits.map((s: any) => ({
        userId: s.userId,
        amount: s.amount.toString(),
      })),
    })),
    group.settlements.map((s: any) => ({
      payerId: s.payerId,
      payeeId: s.payeeId,
      amount: s.amount.toString(),
    }))
  );

  const userBalance = balances.get(userId);

  const members = group.members.map((m: any) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  }));

  const expenses = group.expenses.map((e: any) => ({
    id: e.id,
    description: e.description,
    totalAmount: e.totalAmount.toString(),
    paidBy: e.paidBy,
    createdAt: e.createdAt.toISOString(),
    payer: e.payer,
    splits: e.splits.map((s: any) => ({
      userId: s.userId,
      amount: s.amount.toString(),
      user: s.user,
    })),
  }));

  return (
    <GroupPageClient
      group={{
        id: group.id,
        name: group.name,
        createdBy: group.createdBy,
      }}
      members={members}
      expenses={expenses}
      userBalance={userBalance ? userBalance.toFixed(2) : "0.00"}
      currentUserId={userId}
      currentUserRole={membership.role}
    />
  );
}

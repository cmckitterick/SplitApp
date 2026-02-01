import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { computeBalances } from "@/lib/balance";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          expenses: {
            include: { splits: true },
          },
          settlements: true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const groups = memberships.map((m: any) => {
    const balances = computeBalances(
      m.group.expenses.map((e: any) => ({
        paidBy: e.paidBy,
        totalAmount: e.totalAmount.toString(),
        splits: e.splits.map((s: any) => ({
          userId: s.userId,
          amount: s.amount.toString(),
        })),
      })),
      m.group.settlements.map((s: any) => ({
        payerId: s.payerId,
        payeeId: s.payeeId,
        amount: s.amount.toString(),
      }))
    );

    const userBalance = balances.get(userId);

    return {
      id: m.group.id,
      name: m.group.name,
      memberCount: m.group._count.members,
      userBalance: userBalance ? userBalance.toFixed(2) : "0.00",
    };
  });

  return (
    <DashboardClient
      groups={groups}
      userName={session.user.name || session.user.email || "User"}
    />
  );
}

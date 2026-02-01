import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, requireGroupMember } from "@/lib/middleware";

// DELETE /api/groups/[groupId]/expenses/[expenseId] — delete an expense
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { groupId: string; expenseId: string } }
) {
  const { session, error: authError } = await withAuth();
  if (authError) return authError;

  const { groupId, expenseId } = params;
  const userId = session!.user.id;

  const { error: memberError } = await requireGroupMember(groupId, userId);
  if (memberError) return memberError;

  // Verify the expense belongs to this group
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, groupId },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  await prisma.expense.delete({ where: { id: expenseId } });

  return NextResponse.json({ message: "Expense deleted" });
}

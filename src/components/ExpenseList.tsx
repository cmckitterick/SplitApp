"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExpenseSplit {
  userId: string;
  amount: string;
  user: { id: string; name: string | null; email: string };
}

interface Expense {
  id: string;
  description: string;
  totalAmount: string;
  paidBy: string;
  createdAt: string;
  payer: { id: string; name: string | null; email: string };
  splits: ExpenseSplit[];
}

interface ExpenseListProps {
  expenses: Expense[];
  currentUserId: string;
  groupId: string;
}

export default function ExpenseList({
  expenses,
  currentUserId,
  groupId,
}: ExpenseListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(expenseId: string) {
    if (!confirm("Delete this expense?")) return;

    setDeletingId(expenseId);
    try {
      const res = await fetch(
        `/api/groups/${groupId}/expenses/${expenseId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete expense");
      }
    } catch {
      alert("Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-lg">No expenses yet</p>
        <p className="text-sm mt-1">Add one using the + button</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => {
        const userSplit = expense.splits.find(
          (s) => s.userId === currentUserId
        );
        const userShare = userSplit ? parseFloat(userSplit.amount) : 0;
        const total = parseFloat(expense.totalAmount);
        const payerName =
          expense.payer.id === currentUserId
            ? "You"
            : expense.payer.name || expense.payer.email;
        const date = new Date(expense.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        return (
          <div key={expense.id} className="card">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {expense.description}
                </h4>
                <p className="text-sm text-gray-500 mt-0.5">
                  {payerName} paid ${total.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{date}</p>
              </div>
              <div className="ml-4 text-right shrink-0 flex items-start gap-2">
                <div>
                  {userShare > 0 && (
                    <p className="text-sm font-medium text-gray-700">
                      Your share: ${userShare.toFixed(2)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(expense.id)}
                  disabled={deletingId === expense.id}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Delete expense"
                >
                  {deletingId === expense.id ? (
                    <svg
                      className="w-4 h-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

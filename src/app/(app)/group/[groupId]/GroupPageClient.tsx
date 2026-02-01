"use client";

import { useState } from "react";
import Link from "next/link";
import ExpenseList from "@/components/ExpenseList";
import AddExpenseModal from "@/components/AddExpenseModal";
import BottomNav from "@/components/BottomNav";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

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

interface GroupPageClientProps {
  group: { id: string; name: string; createdBy: string };
  members: Member[];
  expenses: Expense[];
  userBalance: string;
  currentUserId: string;
  currentUserRole: string;
}

export default function GroupPageClient({
  group,
  members,
  expenses,
  userBalance,
  currentUserId,
  currentUserRole,
}: GroupPageClientProps) {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const balance = parseFloat(userBalance);
  const isPositive = balance > 0.005;
  const isNegative = balance < -0.005;

  return (
    <>
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/group/${group.id}/settle`}
              className="text-sm text-primary-600 font-medium hover:text-primary-700"
            >
              Settle Up
            </Link>
            <Link
              href={`/group/${group.id}/settings`}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="card mb-6">
          <p className="text-sm text-gray-500">Your balance</p>
          {isPositive && (
            <p className="text-2xl font-bold text-green-600">
              +${balance.toFixed(2)}
            </p>
          )}
          {isNegative && (
            <p className="text-2xl font-bold text-red-600">
              -${Math.abs(balance).toFixed(2)}
            </p>
          )}
          {!isPositive && !isNegative && (
            <p className="text-2xl font-bold text-gray-400">$0.00</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {isPositive && "You are owed this amount"}
            {isNegative && "You owe this amount"}
            {!isPositive && !isNegative && "All settled up!"}
          </p>
        </div>

        {/* Members bar */}
        <div className="flex items-center gap-1 mb-4">
          <span className="text-sm text-gray-500">
            {members.length} {members.length === 1 ? "member" : "members"}:
          </span>
          <div className="flex -space-x-1">
            {members.slice(0, 5).map((m) => (
              <div
                key={m.id}
                className="w-6 h-6 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center"
                title={m.name || m.email}
              >
                <span className="text-xs font-medium text-primary-700">
                  {(m.name || m.email).charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
            {members.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                <span className="text-xs font-medium text-gray-500">
                  +{members.length - 5}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Expenses */}
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Expenses</h2>
        <ExpenseList
          expenses={expenses}
          currentUserId={currentUserId}
          groupId={group.id}
        />
      </div>

      <BottomNav onAddExpense={() => setShowAddExpense(true)} />

      <AddExpenseModal
        groupId={group.id}
        members={members}
        currentUserId={currentUserId}
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
      />
    </>
  );
}

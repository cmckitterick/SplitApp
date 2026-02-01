"use client";

import Link from "next/link";
import SettleUpView from "@/components/SettleUpView";
import BottomNav from "@/components/BottomNav";

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

interface Suggestion {
  from: UserInfo;
  to: UserInfo;
  amount: string;
}

interface Settlement {
  id: string;
  payerId: string;
  payeeId: string;
  amount: string;
  note: string | null;
  createdAt: string;
  payer: { id: string; name: string | null; email: string };
  payee: { id: string; name: string | null; email: string };
}

interface SettlePageClientProps {
  group: { id: string; name: string };
  suggestions: Suggestion[];
  pastSettlements: Settlement[];
  currentUserId: string;
}

export default function SettlePageClient({
  group,
  suggestions,
  pastSettlements,
  currentUserId,
}: SettlePageClientProps) {
  return (
    <>
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/group/${group.id}`}
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settle Up</h1>
            <p className="text-sm text-gray-500">{group.name}</p>
          </div>
        </div>

        <SettleUpView
          suggestions={suggestions}
          pastSettlements={pastSettlements}
          groupId={group.id}
          currentUserId={currentUserId}
        />
      </div>

      <BottomNav />
    </>
  );
}

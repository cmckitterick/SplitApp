"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

interface SettleUpViewProps {
  suggestions: Suggestion[];
  pastSettlements: Settlement[];
  groupId: string;
  currentUserId: string;
}

export default function SettleUpView({
  suggestions,
  pastSettlements,
  groupId,
  currentUserId,
}: SettleUpViewProps) {
  const router = useRouter();
  const [settlingIndex, setSettlingIndex] = useState<number | null>(null);

  async function handleSettle(suggestion: Suggestion, index: number) {
    setSettlingIndex(index);
    try {
      const res = await fetch(`/api/groups/${groupId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerId: suggestion.from.id,
          payeeId: suggestion.to.id,
          amount: suggestion.amount,
          note: `Settlement: ${suggestion.from.name} paid ${suggestion.to.name}`,
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to record settlement");
      }
    } catch {
      alert("Failed to record settlement");
    } finally {
      setSettlingIndex(null);
    }
  }

  const displayName = (user: { id: string; name: string | null; email: string }) => {
    if (user.id === currentUserId) return "You";
    return user.name || user.email;
  };

  return (
    <div className="space-y-6">
      {/* Suggested Settlements */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Suggested Payments
        </h3>
        {suggestions.length === 0 ? (
          <div className="card text-center text-gray-400 py-6">
            All settled up!
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      <span className="text-red-600">
                        {s.from.id === currentUserId ? "You" : s.from.name}
                      </span>
                      <span className="text-gray-400 mx-2">&rarr;</span>
                      <span className="text-green-600">
                        {s.to.id === currentUserId ? "You" : s.to.name}
                      </span>
                    </p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      ${parseFloat(s.amount).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettle(s, i)}
                    disabled={settlingIndex === i}
                    className="btn-primary text-sm ml-3"
                  >
                    {settlingIndex === i ? "Settling..." : "Mark Settled"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Settlements */}
      {pastSettlements.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Completed Settlements
          </h3>
          <div className="space-y-2">
            {pastSettlements.map((s) => (
              <div key={s.id} className="card bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {displayName(s.payer)} &rarr; {displayName(s.payee)}
                    </p>
                    <p className="text-sm font-medium text-gray-700">
                      ${parseFloat(s.amount).toFixed(2)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

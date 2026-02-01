"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface AddExpenseModalProps {
  groupId: string;
  members: Member[];
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddExpenseModal({
  groupId,
  members,
  currentUserId,
  isOpen,
  onClose,
}: AddExpenseModalProps) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [splitMode, setSplitMode] = useState<"even" | "custom">("even");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setTotalAmount("");
      setPaidBy(currentUserId);
      setSplitMode("even");
      setCustomSplits({});
      setError(null);
    }
  }, [isOpen, currentUserId]);

  // Initialize custom splits when members or total change
  useEffect(() => {
    if (splitMode === "custom") {
      const initial: Record<string, string> = {};
      members.forEach((m) => {
        initial[m.id] = customSplits[m.id] || "";
      });
      setCustomSplits(initial);
    }
  }, [splitMode, members]);

  const total = parseFloat(totalAmount) || 0;
  const evenShare = members.length > 0 ? total / members.length : 0;

  const customTotal = Object.values(customSplits).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  );
  const customMismatch =
    splitMode === "custom" && total > 0 && Math.abs(customTotal - total) > 0.01;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (total <= 0) {
      setError("Amount must be positive");
      return;
    }

    let splits: { userId: string; amount: string }[];

    if (splitMode === "even") {
      // Round to 2 decimal places, adjust last person for rounding errors
      const baseShare = Math.floor(evenShare * 100) / 100;
      const remainder =
        Math.round(total * 100) - baseShare * 100 * members.length;
      splits = members.map((m, i) => ({
        userId: m.id,
        amount: (
          baseShare + (i < remainder ? 0.01 : 0)
        ).toFixed(2),
      }));
    } else {
      if (customMismatch) {
        setError(
          `Splits sum to $${customTotal.toFixed(2)} but total is $${total.toFixed(2)}`
        );
        return;
      }
      splits = members
        .filter((m) => parseFloat(customSplits[m.id] || "0") > 0)
        .map((m) => ({
          userId: m.id,
          amount: parseFloat(customSplits[m.id]).toFixed(2),
        }));
      if (splits.length === 0) {
        setError("At least one person must have a share");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          totalAmount: total.toFixed(2),
          paidBy,
          splits,
        }),
      });

      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add expense");
      }
    } catch {
      setError("Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold">Add Expense</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label-text">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner, Groceries"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="label-text">Total Amount ($)</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Paid By</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="input-field"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === currentUserId
                    ? "You"
                    : m.name || m.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text">Split</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSplitMode("even")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  splitMode === "even"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Split Evenly
              </button>
              <button
                type="button"
                onClick={() => setSplitMode("custom")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  splitMode === "custom"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Custom
              </button>
            </div>

            {splitMode === "even" && total > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  ${evenShare.toFixed(2)} per person
                </p>
              </div>
            )}

            {splitMode === "custom" && (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 flex-1 truncate">
                      {m.id === currentUserId ? "You" : m.name || m.email}
                    </span>
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        value={customSplits[m.id] || ""}
                        onChange={(e) =>
                          setCustomSplits((prev) => ({
                            ...prev,
                            [m.id]: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="input-field pl-7 text-right"
                      />
                    </div>
                  </div>
                ))}
                <div
                  className={`text-sm font-medium text-right mt-2 ${
                    customMismatch ? "text-red-600" : "text-green-600"
                  }`}
                >
                  Total: ${customTotal.toFixed(2)} / ${total.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || (splitMode === "custom" && customMismatch)}
            className="btn-primary w-full"
          >
            {submitting ? "Adding..." : "Add Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}

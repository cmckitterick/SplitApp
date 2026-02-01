"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InviteLinkButton from "@/components/InviteLinkButton";
import BottomNav from "@/components/BottomNav";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
  balance: string;
}

interface SettingsPageClientProps {
  group: { id: string; name: string; createdBy: string };
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
}

export default function SettingsPageClient({
  group,
  members,
  currentUserId,
  isOwner,
}: SettingsPageClientProps) {
  const router = useRouter();
  const [groupName, setGroupName] = useState(group.name);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleUpdateName() {
    if (!groupName.trim() || groupName === group.name) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update group name");
      }
    } catch {
      alert("Failed to update group name");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remove this member from the group?")) return;

    setRemovingId(memberId);
    try {
      const res = await fetch(`/api/groups/${group.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove member");
      }
    } catch {
      alert("Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleDeleteGroup() {
    if (!confirm("Delete this group? This action cannot be undone.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete group");
      }
    } catch {
      alert("Failed to delete group");
    } finally {
      setDeleting(false);
    }
  }

  async function handleLeaveGroup() {
    if (!confirm("Leave this group?")) return;

    setRemovingId(currentUserId);
    try {
      const res = await fetch(`/api/groups/${group.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to leave group");
      }
    } catch {
      alert("Failed to leave group");
    } finally {
      setRemovingId(null);
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Group Name */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Group Name</h3>
            {isOwner ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="input-field flex-1"
                  maxLength={100}
                />
                <button
                  onClick={handleUpdateName}
                  disabled={saving || !groupName.trim() || groupName === group.name}
                  className="btn-primary"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : (
              <p className="text-gray-700">{group.name}</p>
            )}
          </div>

          {/* Members */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">
              Members ({members.length})
            </h3>
            <div className="space-y-3">
              {members.map((m) => {
                const balance = parseFloat(m.balance);
                const hasBalance = Math.abs(balance) > 0.01;
                const isCurrentUser = m.id === currentUserId;

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-primary-700">
                          {(m.name || m.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {isCurrentUser ? "You" : m.name || m.email}
                        </p>
                        <p className="text-xs text-gray-400">
                          {m.role === "OWNER" ? "Owner" : "Member"}
                          {hasBalance &&
                            ` · Balance: ${balance > 0 ? "+" : ""}$${balance.toFixed(2)}`}
                        </p>
                      </div>
                    </div>

                    {isOwner && !isCurrentUser && m.role !== "OWNER" && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={removingId === m.id || hasBalance}
                        className="text-sm text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed ml-2"
                        title={hasBalance ? "Cannot remove member with balance" : "Remove member"}
                      >
                        {removingId === m.id ? "Removing..." : "Remove"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invite Link (Owner Only) */}
          {isOwner && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Invite Link</h3>
              <p className="text-sm text-gray-500 mb-3">
                Generate a single-use invite link that expires in 7 days.
              </p>
              <InviteLinkButton groupId={group.id} />
            </div>
          )}

          {/* Danger Zone */}
          <div className="card border-red-100">
            <h3 className="font-semibold text-red-600 mb-3">Danger Zone</h3>
            {isOwner ? (
              <button
                onClick={handleDeleteGroup}
                disabled={deleting}
                className="btn-danger w-full"
              >
                {deleting ? "Deleting..." : "Delete Group"}
              </button>
            ) : (
              <button
                onClick={handleLeaveGroup}
                disabled={removingId === currentUserId}
                className="btn-danger w-full"
              >
                {removingId === currentUserId ? "Leaving..." : "Leave Group"}
              </button>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </>
  );
}

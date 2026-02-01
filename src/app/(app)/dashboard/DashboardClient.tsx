"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import BalanceCard from "@/components/BalanceCard";
import CreateGroupModal from "@/components/CreateGroupModal";
import BottomNav from "@/components/BottomNav";

interface GroupSummary {
  id: string;
  name: string;
  memberCount: number;
  userBalance: string;
}

interface DashboardClientProps {
  groups: GroupSummary[];
  userName: string;
}

export default function DashboardClient({
  groups,
  userName,
}: DashboardClientProps) {
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const totalOwed = groups.reduce((sum, g) => {
    const b = parseFloat(g.userBalance);
    return b > 0 ? sum + b : sum;
  }, 0);

  const totalOwe = groups.reduce((sum, g) => {
    const b = parseFloat(g.userBalance);
    return b < 0 ? sum + Math.abs(b) : sum;
  }, 0);

  return (
    <>
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Hi, {userName}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              You are owed
            </p>
            <p className="text-xl font-bold text-green-600 mt-1">
              ${totalOwed.toFixed(2)}
            </p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              You owe
            </p>
            <p className="text-xl font-bold text-red-600 mt-1">
              ${totalOwe.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Groups */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Your Groups</h2>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="text-sm text-primary-600 font-medium hover:text-primary-700"
          >
            + New Group
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">
            <p className="text-lg">No groups yet</p>
            <p className="text-sm mt-1">Create one to get started</p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="btn-primary mt-4"
            >
              Create Group
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <BalanceCard
                key={group.id}
                groupId={group.id}
                groupName={group.name}
                memberCount={group.memberCount}
                userBalance={group.userBalance}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
    </>
  );
}

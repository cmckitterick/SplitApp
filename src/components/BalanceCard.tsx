"use client";

interface BalanceCardProps {
  groupName: string;
  memberCount: number;
  userBalance: string;
  groupId: string;
}

export default function BalanceCard({
  groupName,
  memberCount,
  userBalance,
  groupId,
}: BalanceCardProps) {
  const balance = parseFloat(userBalance);
  const isPositive = balance > 0.005;
  const isNegative = balance < -0.005;
  const isZero = !isPositive && !isNegative;

  return (
    <a href={`/group/${groupId}`} className="block">
      <div className="card hover:shadow-md transition-shadow duration-150">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{groupName}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </p>
          </div>
          <div className="ml-4 text-right shrink-0">
            {isZero && (
              <span className="text-sm font-medium text-gray-400">
                settled up
              </span>
            )}
            {isPositive && (
              <div>
                <p className="text-sm text-gray-500">you are owed</p>
                <p className="text-lg font-bold text-green-600">
                  ${Math.abs(balance).toFixed(2)}
                </p>
              </div>
            )}
            {isNegative && (
              <div>
                <p className="text-sm text-gray-500">you owe</p>
                <p className="text-lg font-bold text-red-600">
                  ${Math.abs(balance).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

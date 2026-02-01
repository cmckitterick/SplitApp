"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";

export default function JoinPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = searchParams.get("token");
  const groupId = searchParams.get("group");

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      // Save the join URL and redirect to sign in
      signIn(undefined, {
        callbackUrl: `/join?token=${token}&group=${groupId}`,
      });
      return;
    }

    if (!token || !groupId) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }

    // Redeem the invite
    async function redeemInvite() {
      try {
        const res = await fetch(
          `/api/groups/${groupId}/invites?token=${token}`
        );
        const data = await res.json();

        if (res.ok) {
          setMessage(
            data.alreadyMember
              ? `You are already a member of "${data.group.name}"`
              : `Successfully joined "${data.group.name}"!`
          );
          // Redirect to the group after a brief delay
          setTimeout(() => {
            router.push(`/group/${groupId}`);
          }, 1500);
        } else {
          setError(data.error || "Failed to join group");
        }
      } catch {
        setError("Failed to join group");
      } finally {
        setLoading(false);
      }
    }

    redeemInvite();
  }, [status, token, groupId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center">
        {loading && (
          <div className="py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
            <p className="text-gray-500 mt-4">Joining group...</p>
          </div>
        )}

        {message && (
          <div className="py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">{message}</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
          </div>
        )}

        {error && (
          <div className="py-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
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
            </div>
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-primary mt-4"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

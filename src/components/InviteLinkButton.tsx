"use client";

import { useState } from "react";

interface InviteLinkButtonProps {
  groupId: string;
}

export default function InviteLinkButton({ groupId }: InviteLinkButtonProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateLink() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/invites`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setInviteUrl(data.inviteUrl);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to generate invite link");
      }
    } catch {
      setError("Failed to generate invite link");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      {!inviteUrl ? (
        <button
          onClick={generateLink}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? "Generating..." : "Generate Invite Link"}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="bg-gray-50 border rounded-lg p-3 break-all text-sm text-gray-600">
            {inviteUrl}
          </div>
          <button onClick={copyLink} className="btn-primary w-full">
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

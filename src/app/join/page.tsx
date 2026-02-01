import { Suspense } from "react";
import JoinContent from "./JoinContent";

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="card max-w-sm w-full text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
            <p className="text-gray-500 mt-4">Loading...</p>
          </div>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}

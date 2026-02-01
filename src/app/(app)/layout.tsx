import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {children}
    </div>
  );
}

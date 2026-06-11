import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 p-8 bg-surface">{children}</main>
      </div>
    </SessionProvider>
  );
}

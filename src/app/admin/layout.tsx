import { SessionProvider } from "next-auth/react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 p-8 bg-surface">{children}</main>
      </div>
    </SessionProvider>
  );
}

"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider defaultOpen={false}>
      <AdminSidebar />
      <main className="w-full h-screen bg-card flex relative overflow-hidden">{children}</main>
    </SidebarProvider>
  );
};

export default AdminLayout;

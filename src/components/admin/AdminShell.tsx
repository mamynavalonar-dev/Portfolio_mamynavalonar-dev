"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Sidebar from "@/app/admin/Sidebar";
import AdminDataProvider from "./AdminDataProvider";

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Le formulaire de connexion possède son propre écran. Quitter l'admin
  // démonte également le cache de la session précédente.
  if (pathname === "/admin/login") return children;
  return <AdminDataProvider><Sidebar />{children}</AdminDataProvider>;
}

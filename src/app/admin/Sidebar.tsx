"use client";

import Link, { useLinkStatus } from "next/link";
import { useAdminMemoryCache } from "@/components/admin/AdminDataProvider";
import {
  LayoutDashboard,
  Folder,
  Award,
  MessageSquare,
  Inbox,
  Layers,
  FileText,
  Code2,
  GraduationCap,
  Share2,
  Menu,
  X,
  LogOut,
  LoaderCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";

const menus = [
  {
    name: "Tableau de bord",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
  },
  {
    name: "Projets",
    icon: Folder,
    path: "/admin/projects",
  },
  { name: "Services", icon: Code2, path: "/admin/services" },
  { name: "Parcours", icon: GraduationCap, path: "/admin/journey" },
  { name: "Réseaux sociaux", icon: Share2, path: "/admin/social" },
  {
    name: "Certificats",
    icon: Award,
    path: "/admin/certificates",
  },
  {
    name: "CV",
    icon: FileText,
    path: "/admin/cv",
  },
  {
    name: "Commentaires",
    icon: MessageSquare,
    path: "/admin/comments",
  },
  {
    name: "Messages",
    icon: Inbox,
    path: "/admin/messages",
  },
  {
    name: "Technologies",
    icon: Layers,
    path: "/admin/tech",
  },
];

function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return pending ? <span role="status" className="relative z-10 ml-auto inline-flex items-center"><LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /><span className="sr-only">Ouverture…</span></span> : null;
}

function SidebarContent({
  pathname,
  hideTitle = false,
  onNavigate,
  onLogout,
  onPrefetch,
}: {
  pathname: string;
  hideTitle?: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
  onPrefetch: (path: string) => void;
}) {
  return (
    <>
      <div>
        {!hideTitle && (
          <p className="text-lg font-semibold mb-8 tracking-wide text-white">
            Panneau d&apos;administration
          </p>
        )}

        <nav className="space-y-2">
          {menus.map((menu) => {
            const Icon = menu.icon;
            const active =
              pathname === menu.path || pathname.startsWith(`${menu.path}/`);

            return (
              <Link
                key={menu.path}
                href={menu.path}
                prefetch={false}
                onMouseEnter={() => onPrefetch(menu.path)}
                onFocus={() => onPrefetch(menu.path)}
                className="block"
                onClick={onNavigate}
              >
                <motion.div
                  whileHover={{ x: 6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 20,
                  }}
                  className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                    active
                      ? "bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.12)]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {!active && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 rounded-xl bg-gradient-to-r from-white/[0.06] to-transparent" />
                  )}

                  {active && (
                    <motion.div
                      layoutId="activeSidebar"
                      className="absolute left-0 top-2 bottom-2 w-[4px] rounded-full bg-black"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}

                  <motion.div
                    whileHover={{ rotate: -6 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="relative z-10"
                  >
                    <Icon size={17} />
                  </motion.div>

                  <span className="relative z-10 text-sm font-medium tracking-wide">
                    {menu.name}
                  </span>
                  <NavigationFeedback />
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition"
        >
          <LogOut size={17} />
          Se déconnecter
        </button>
        <div className="text-xs text-white/35 tracking-wide">© 2026 Admin</div>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const cache = useAdminMemoryCache();
  const prefetched = useRef(new Set<string>());
  const prefetch = (path: string) => {
    if (path === pathname || prefetched.current.has(path)) return;
    prefetched.current.add(path);
    router.prefetch(path);
  };

  const handleLogout = async () => {
    const { supabase } = await import("@/lib/supabase");
    cache.clear();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <>
        <aside className="fixed left-0 top-0 h-screen w-[250px] bg-black border-r border-white/10 p-6 hidden lg:flex flex-col justify-between gap-8 overflow-y-auto z-50">
          <SidebarContent pathname={pathname} onLogout={handleLogout} onPrefetch={prefetch} />
        </aside>
        <>
          <div className="fixed top-0 left-0 right-0 h-[70px] bg-black/95 backdrop-blur-xl border-b border-white/10 flex lg:hidden items-center justify-between px-5 z-[60]">
            <p className="text-white font-semibold text-base">
              Panneau d&apos;administration
            </p>

            <button
              type="button"
              aria-label="Ouvrir le menu d'administration"
              onClick={() => setOpen(true)}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"
            >
              <Menu size={20} />
            </button>
          </div>

          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] lg:hidden"
                />

                <motion.aside
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 28,
                  }}
                  className="fixed left-0 top-0 h-screen w-[260px] bg-black border-r border-white/10 p-6 flex lg:hidden flex-col justify-between gap-6 overflow-y-auto z-[80]"
                >
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-lg font-semibold text-white">
                      Panneau d&apos;administration
                    </p>

                    <button
                      type="button"
                      aria-label="Fermer le menu d'administration"
                      onClick={() => setOpen(false)}
                      className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <SidebarContent
                      pathname={pathname}
                      onPrefetch={prefetch}
                      hideTitle
                      onNavigate={() => setOpen(false)}
                      onLogout={handleLogout}
                    />
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </>
    </>
  );
}

"use client";

import { createContext, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createAdminMemoryCache, type AdminMemoryCache } from "@/lib/adminMemoryCache";

const AdminDataContext = createContext<AdminMemoryCache | null>(null);

export function useAdminMemoryCache() {
  const shared = useContext(AdminDataContext);
  const [local] = useState(createAdminMemoryCache);
  return shared ?? local;
}

export default function AdminDataProvider({ children }: { children: ReactNode }) {
  const [cache] = useState(createAdminMemoryCache);
  const [sessionGeneration, setSessionGeneration] = useState(0);
  const owner = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void import("@/lib/supabase").then(({ supabase }) => {
      if (!active) return;
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        const id = session?.user.id ?? null;
        if (event === "SIGNED_OUT" || (owner.current !== undefined && owner.current !== id)) {
          cache.clear();
          setSessionGeneration((previous) => previous + 1);
        }
        owner.current = id;
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => { active = false; unsubscribe?.(); };
  }, [cache]);

  return <AdminDataContext.Provider value={cache}><Fragment key={sessionGeneration}>{children}</Fragment></AdminDataContext.Provider>;
}

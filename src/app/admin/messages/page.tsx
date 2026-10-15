"use client";

import useAdminCachedState from "@/hooks/useAdminCachedState";
import { useAdminMemoryCache } from "@/components/admin/AdminDataProvider";

import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, CheckCheck, Inbox, Loader2, MailOpen, RefreshCcw } from "lucide-react";

type MessageStatus = "new" | "read" | "replied" | "archived";

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  message: string;
  status: MessageStatus;
  created_at: string;
};

const statusLabels: Record<MessageStatus, string> = {
  new: "Nouveau",
  read: "Lu",
  replied: "Répondu",
  archived: "Archivé",
};

export default function AdminMessagesPage() {
  const [filter, setFilter] = useState<"all" | MessageStatus>("all");
  const [messages, setMessages, hasSnapshot] = useAdminCachedState<ContactMessage[]>(`messages:${filter}`, []);
  const cache = useAdminMemoryCache();
  const [loading, setLoading] = useState(() => !hasSnapshot());
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const readVersion = useRef(0);
  const mutationBusy = useRef(false);

  const loadMessages = useCallback(async (signal?: AbortSignal) => {
    if (mutationBusy.current) return;
    const version = ++readVersion.current;
    setLoading(!hasSnapshot());
    setError("");

    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      const response = await fetch(`/api/admin/contact-messages${query}`, {
        cache: "no-store",
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        messages?: ContactMessage[];
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Impossible de charger les messages.");
      }

      if (signal?.aborted || version !== readVersion.current) return;
      setMessages(payload.messages ?? []);
    } catch (loadError) {
      if (signal?.aborted || version !== readVersion.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les messages.",
      );
    } finally {
      if (!signal?.aborted && version === readVersion.current) setLoading(false);
    }
  }, [filter, hasSnapshot, setMessages]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadMessages(controller.signal);
    }, 0);

    return () => { window.clearTimeout(timer); controller.abort(); readVersion.current += 1; };
  }, [loadMessages]);

  const updateStatus = async (id: number, status: MessageStatus) => {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    readVersion.current += 1;
    setLoading(false);
    setUpdatingId(id);
    setError("");

    try {
      const response = await fetch("/api/admin/contact-messages", {
        method: "PATCH",
        signal: AbortSignal.timeout(20_000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string | ContactMessage;
      };

      if (!response.ok || !payload.ok || !payload.message || typeof payload.message === "string" || payload.message.id !== id || payload.message.status !== status) {
        throw new Error(
          typeof payload.message === "string"
            ? payload.message
            : "Impossible de mettre à jour le message.",
        );
      }

      const confirmed = payload.message;
      cache.updateMatching("messages:", (value, key) => {
        const rows = value as ContactMessage[];
        const selectedStatus = key.slice("messages:".length);
        const without = rows.filter((item) => item.id !== id);
        return selectedStatus === "all" || selectedStatus === status
          ? [...without, confirmed].sort((a, b) => b.created_at.localeCompare(a.created_at))
          : without;
      });
      if (filter !== "all" && status !== filter) {
        setMessages((current) => current.filter((item) => item.id !== id));
      } else {
        setMessages((current) =>
          current.map((item) =>
            item.id === id ? { ...item, status } : item,
          ),
        );
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Impossible de mettre à jour le message.",
      );
    } finally {
      mutationBusy.current = false;
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      <main className="min-h-screen px-4 pb-10 pt-[95px] sm:px-6 lg:ml-[250px] lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1200px]">
          <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-semibold sm:text-3xl">
                <Inbox aria-hidden="true" />
                Messages reçus
              </h1>
              <p className="mt-2 text-sm text-white/45">
                Les messages du formulaire de contact, accessibles uniquement aux administrateurs.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadMessages()}
              disabled={loading || updatingId !== null}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
              Actualiser
            </button>
          </header>

          <div className="mb-6 flex flex-wrap gap-2" aria-label="Filtrer les messages">
            {(["all", "new", "read", "replied", "archived"] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={filter === status}
                  disabled={updatingId !== null}
                  onClick={() => { if (status !== filter) { readVersion.current += 1; setFilter(status); } }}
                  className={`rounded-full border px-4 py-2 text-xs transition ${
                    filter === status
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
                  }`}
                >
                  {status === "all" ? "Tous" : statusLabels[status]}
                </button>
              ),
            )}
          </div>

          {error && (
            <p role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-white/50">
              <Loader2 className="mr-3 animate-spin" aria-hidden="true" />
              Chargement des messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/40">
              {error ? "La liste n’a pas pu être chargée. Utilisez Actualiser pour réessayer." : "Aucun message dans cette catégorie."}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-5 sm:p-6 ${
                    item.status === "new"
                      ? "border-white/25 bg-white/[0.07]"
                      : "border-white/10 bg-white/[0.035]"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{item.name}</h2>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-white/55">
                          {statusLabels[item.status]}
                        </span>
                      </div>
                      <a className="mt-1 inline-block text-sm text-sky-300 hover:underline" href={`mailto:${item.email}`}>
                        {item.email}
                      </a>
                    </div>
                    <time className="text-xs text-white/40" dateTime={item.created_at}>
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.created_at))}
                    </time>
                  </div>

                  <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-white/75">
                    {item.message}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                    {item.status === "new" && (
                      <button type="button" disabled={updatingId !== null} onClick={() => void updateStatus(item.id, "read")} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-black disabled:opacity-50">
                        <MailOpen size={14} /> Marquer comme lu
                      </button>
                    )}
                    {item.status !== "replied" && item.status !== "archived" && (
                      <button type="button" disabled={updatingId !== null} onClick={() => void updateStatus(item.id, "replied")} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-50">
                        <CheckCheck size={14} /> Réponse envoyée
                      </button>
                    )}
                    {item.status !== "archived" && (
                      <button type="button" disabled={updatingId !== null} onClick={() => void updateStatus(item.id, "archived")} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/65 disabled:opacity-50">
                        <Archive size={14} /> Archiver
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

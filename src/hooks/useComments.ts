"use client";

import { useEffect, useRef, useState } from "react";
import type { PortfolioComment } from "@/types";
import {
  createCommentService,
  likeCommentService,
} from "@/lib/commentService";
import { loadInitialComments } from "@/lib/commentLoading";
import { scheduleVisibleTask } from "@/lib/visibleTask";

export default function useComments() {
  const [comments, setComments] = useState<PortfolioComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pendingLikes = useRef(new Set<number>());

  useEffect(() => {
    const controller = new AbortController();
    const cancel = scheduleVisibleTask("contact", () => {
      void loadInitialComments(controller.signal, setComments, setError);
    });

    return () => {
      cancel();
      controller.abort();
    };
  }, []);

  const addComment = async ({
    name,
    comment,
    image,
  }: {
    name: string;
    comment: string;
    image: File | null;
  }) => {
    setLoading(true);
    setError("");

    try {
      const newComment = await createCommentService({ name, comment, image });
      setComments((current) => [newComment, ...current.filter((item) => item.id !== newComment.id)]);
      return true;
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Impossible de publier le commentaire.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const likeComment = async (id: number) => {
    if (pendingLikes.current.has(id)) return;
    try {
      if (localStorage.getItem(`liked-${id}`)) return;
    } catch { /* Le stockage navigateur est facultatif. */ }

    pendingLikes.current.add(id);
    setError("");

    try {
      const likes = await likeCommentService(id);
      try { localStorage.setItem(`liked-${id}`, "true"); } catch { /* Quota contrôlé côté serveur. */ }
      setComments((current) =>
        current.map((item) => (item.id === id ? { ...item, likes } : item)),
      );
    } catch (likeError) {
      setError(
        likeError instanceof Error
          ? likeError.message
          : "Impossible d'ajouter ce j'aime.",
      );
    } finally {
      pendingLikes.current.delete(id);
    }
  };

  return { comments, loading, error, addComment, likeComment };
}

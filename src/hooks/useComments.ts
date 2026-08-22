"use client";

import { useCallback, useEffect, useState } from "react";
import type { PortfolioComment } from "@/types";
import {
  createCommentService,
  fetchCommentsService,
  likeCommentService,
} from "@/lib/commentService";

export default function useComments() {
  const [comments, setComments] = useState<PortfolioComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchInitialComments = useCallback(async () => {
    try {
      setComments(await fetchCommentsService());
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Impossible de charger les commentaires.",
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchInitialComments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchInitialComments]);

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
      setComments((current) => [newComment, ...current]);
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
    if (localStorage.getItem(`liked-${id}`)) return;

    setError("");

    try {
      const likes = await likeCommentService(id);
      localStorage.setItem(`liked-${id}`, "true");
      setComments((current) =>
        current.map((item) => (item.id === id ? { ...item, likes } : item)),
      );
    } catch (likeError) {
      setError(
        likeError instanceof Error
          ? likeError.message
          : "Impossible d'ajouter ce j'aime.",
      );
    }
  };

  return { comments, loading, error, addComment, likeComment };
}

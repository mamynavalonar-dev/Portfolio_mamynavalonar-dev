import type { PortfolioComment } from "@/types";

async function readPayload(response: Response) {
  return (await response.json()) as {
    ok?: boolean;
    message?: string;
    comments?: PortfolioComment[];
    comment?: PortfolioComment;
    likes?: number;
  };
}

export async function fetchCommentsService() {
  const response = await fetch("/api/comments", { cache: "no-store" });
  const payload = await readPayload(response);

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? "Impossible de charger les commentaires.");
  }

  return payload.comments ?? [];
}

export async function likeCommentService(id: number) {
  const response = await fetch(`/api/comments/${id}/like`, { method: "POST" });
  const payload = await readPayload(response);

  if (!response.ok || !payload.ok || typeof payload.likes !== "number") {
    throw new Error(payload.message ?? "Impossible d'ajouter ce j'aime.");
  }

  return payload.likes;
}

export async function createCommentService({
  name,
  comment,
  image,
}: {
  name: string;
  comment: string;
  image: File | null;
}) {
  const formData = new FormData();
  formData.set("name", name);
  formData.set("comment", comment);
  if (image) formData.set("image", image);

  const response = await fetch("/api/comments", {
    method: "POST",
    body: formData,
  });
  const payload = await readPayload(response);

  if (!response.ok || !payload.ok || !payload.comment) {
    throw new Error(payload.message ?? "Impossible de publier le commentaire.");
  }

  return payload.comment;
}

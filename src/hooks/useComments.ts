'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PortfolioComment } from '@/types'
import {
  fetchCommentsService,
  createCommentService,
  likeCommentService,
  uploadCommentImageService,
} from '@/lib/commentService'

export default function useComments() {
  const [comments, setComments] = useState<PortfolioComment[]>([])
  const [loading, setLoading] = useState(false)

    const fetchInitialComments = useCallback(async () => {
    try {
      const data = await fetchCommentsService()
      setComments(data)
    } catch (err) {
      console.log(err)
    }
  
  }, []);

useEffect(() => {
    const timer = setTimeout(() => {
      void fetchInitialComments()
    }, 0)

    const channel = supabase
      .channel('comments-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        async () => {
          const data = await fetchCommentsService()
          setComments(data)
        }
      )
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [fetchInitialComments])


  const addComment = async ({
    name,
    comment,
    image,
  }: {
    name: string
    comment: string
    image: File | null
  }) => {
    if (!name.trim()) return
    if (!comment.trim()) return

    setLoading(true)

    try {
      let imageUrl: string | null = null

      if (image) {
        imageUrl = await uploadCommentImageService(image)
      }

      const newComment = await createCommentService({
        name,
        comment,
        imageUrl,
      })

      // instant UI update (tanpa nunggu realtime)
      setComments((prev) => [newComment, ...prev])
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  const likeComment = async (
    id: number,
    currentLikes: number
  ) => {
    const liked = localStorage.getItem(`liked-${id}`)

    if (liked) return

    try {
      const newLikes = await likeCommentService(
        id,
        currentLikes
      )

      localStorage.setItem(`liked-${id}`, 'true')

      setComments((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, likes: newLikes }
            : item
        )
      )
    } catch (err) {
      console.log(err)
    }
  }

  return {
    comments,
    loading,
    addComment,
    likeComment,
  }
}

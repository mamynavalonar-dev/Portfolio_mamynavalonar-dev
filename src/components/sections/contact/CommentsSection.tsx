'use client'

import { useState } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Upload, Heart, Pin } from 'lucide-react'
import useComments from '@/hooks/useComments'
import ResponsiveImage from '@/components/ui/ResponsiveImage'

const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.025,
    },
  },
}

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: smoothEase,
    },
  },
}

export default function CommentsSection() {
  const { comments, loading, error, addComment, likeComment } =
    useComments()

  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleImage = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !comment.trim()) return

    const created = await addComment({
      name,
      comment,
      image,
    })

    if (!created) return

    if (preview) URL.revokeObjectURL(preview)
    setName('')
    setComment('')
    setImage(null)
    setPreview(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.25,
        ease: smoothEase,
      }}
      viewport={{ once: true, amount: 0.2 }}
      className="rounded-[28px] md:rounded-[34px] border border-white/10 bg-white/5 p-5 md:p-8 h-full"
    >
      {/* HEADER */}
      <div className="mb-5 md:mb-6">
        <h3 className="text-xl md:text-2xl font-semibold mb-1">
          Commentaires
        </h3>

        <p className="text-xs md:text-sm text-white/40">
          Laissez-moi vos impressions ici
        </p>
      </div>

      {/* FORM */}
      <motion.form
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        onSubmit={handleSubmit}
        className="space-y-3 md:space-y-4 mb-5 md:mb-6"
      >
        <label htmlFor="comment-name" className="sr-only">
          Votre nom
        </label>
        <motion.input
          id="comment-name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          variants={itemVariants}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom"
          className="w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 md:py-4 outline-none focus:border-white"
        />

        <label htmlFor="comment-text" className="sr-only">
          Votre commentaire
        </label>
        <motion.textarea
          id="comment-text"
          name="comment"
          required
          minLength={3}
          maxLength={1000}
          variants={itemVariants}
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Votre commentaire"
          className="w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 md:py-4 outline-none resize-none focus:border-white"
        />

        <motion.label
          variants={itemVariants}
          className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-3 md:p-4 flex items-center gap-3 cursor-pointer"
        >
          <Upload size={16} />

          <span className="text-xs md:text-sm text-white/65">
            Ajouter une image
          </span>

          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImage}
          />
        </motion.label>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        <AnimatePresence>
          {preview && (
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={preview}
              alt="Aperçu"
              className="rounded-2xl h-36 md:h-44 w-full object-cover border border-white/10"
            />
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="w-full rounded-2xl py-3 md:py-4 bg-white/10 border border-white/10 transition-all"
        >
          {loading ? 'Publication...' : 'Publier le commentaire'}
        </motion.button>
      </motion.form>

      {/* COMMENTS LIST */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="rounded-[24px] md:rounded-[28px] border border-white/10 bg-black/20 p-3 h-[320px] md:h-[420px] overflow-y-auto custom-scroll"
      >
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {comments.map((item, i) => (
              <motion.div
                key={item.id || i}
                layout
                initial={{
                  opacity: 0,
                  y: 18,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  scale: 0.96,
                }}
                transition={{
                  duration: 0.22,
                  ease: smoothEase,
                  layout: {
                    duration: 0.2,
                    ease: smoothEase,
                  },
                }}
                className={`rounded-[20px] md:rounded-[24px] border p-3 md:p-4 ${
                  item.is_pinned
                    ? 'border-purple-500/30 bg-purple-500/5'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold shrink-0">
                    {item.name?.charAt(0)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium">
                        {item.name}
                      </p>

                      {item.is_pinned && (
                        <div className="flex items-center gap-1 px-2 py-[3px] rounded-full bg-purple-500/15 border border-purple-500/20 text-[10px] text-purple-300">
                          <Pin size={10} />
                          ÉPINGLÉ
                        </div>
                      )}
                    </div>

                    <p className="text-[12px] md:text-[13px] text-white/55">
                      {item.comment}
                    </p>

                    {item.image_url && (
                      <ResponsiveImage
                        src={item.image_url}
                        alt="Commentaire"
                        className="mt-3 rounded-xl w-full max-h-48 md:max-h-56 object-cover border border-white/10"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label={`Aimer le commentaire de ${item.name}`}
                    onClick={() => likeComment(item.id)}
                    className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white transition-colors"
                  >
                    <Heart size={13} />
                    {item.likes || 0}
                  </button>
                </div>

                {item.replies?.length > 0 && (
                  <div className="ml-12 mt-3 space-y-2 border-l border-white/10 pl-4">
                    {item.replies.map((reply, replyIndex) => (
                      <div key={`${item.id}-${reply.created_at}-${replyIndex}`}>
                        <p className="text-xs font-medium text-white/75">
                          {reply.username}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-white/50">
                          {reply.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

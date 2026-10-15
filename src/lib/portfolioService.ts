import { supabase } from '@/lib/supabase'
import { normalizeProject } from '@/lib/projectFields'
import { PROJECT_PUBLIC_COLUMNS, CERTIFICATE_PUBLIC_COLUMNS, TECH_PUBLIC_COLUMNS } from '@/lib/publicFields'
import type { TechStack } from '@/types'

export const fetchProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_PUBLIC_COLUMNS)
    .order('created_at', {
      ascending: true,
    })

  if (error) throw new Error('Impossible de charger les projets.')
  return (data || []).map((project) => normalizeProject(project))
}

export const fetchCertificates = async () => {
  const { data, error } = await supabase
    .from('certificates')
    .select(CERTIFICATE_PUBLIC_COLUMNS)
    .order('created_at', {
      ascending: true,
    })

  if (error) throw new Error('Impossible de charger les certificats.')
  return data || []
}

export const fetchTechStacks = async () => {
  const initial = await supabase.from('tech_stack')
    .select('id,name,logo_url,created_at,hero_visible,hero_order')
    .order('created_at', { ascending: true })
  let data: TechStack[] | null = initial.data
  let error = initial.error
  if (error?.code === '42703' && /hero_visible|hero_order/.test(error.message)) {
    const legacy = await supabase.from('tech_stack').select(TECH_PUBLIC_COLUMNS)
      .order('created_at', { ascending: true })
    data = legacy.data; error = legacy.error
  }
  if (error) throw new Error('Impossible de charger les technologies.')
  return data || []
}

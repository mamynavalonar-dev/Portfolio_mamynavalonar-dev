import { supabase } from '@/lib/supabase'
import { normalizeProject } from '@/lib/projectFields'

export const fetchProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', {
      ascending: true,
    })

  if (error) throw new Error('Impossible de charger les projets.')
  return (data || []).map((project) => normalizeProject(project))
}

export const fetchCertificates = async () => {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .order('created_at', {
      ascending: true,
    })

  if (error) throw new Error('Impossible de charger les certificats.')
  return data || []
}

export const fetchTechStacks = async () => {
  const { data, error } = await supabase
    .from('tech_stack')
    .select('*')
    .order('created_at', {
      ascending: true,
    })

  if (error) throw new Error('Impossible de charger les technologies.')
  return data || []
}

import { supabase } from '@/lib/supabase'
import { normalizeProject } from '@/lib/projectFields'

export const fetchProjects = async () => {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', {
      ascending: true,
    })

  return (data || []).map((project) => normalizeProject(project))
}

export const fetchCertificates = async () => {
  const { data } = await supabase
    .from('certificates')
    .select('*')
    .order('created_at', {
      ascending: true,
    })

  return data || []
}

export const fetchTechStacks = async () => {
  const { data } = await supabase
    .from('tech_stack')
    .select('*')
    .order('created_at', {
      ascending: true,
    })

  return data || []
}

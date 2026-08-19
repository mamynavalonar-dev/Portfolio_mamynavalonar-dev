'use client'

import { useCallback, useEffect, useState } from 'react'
import { Project, Certificate, TechStack } from '@/types'
import {
  fetchCertificates,
  fetchProjects,
  fetchTechStacks,
} from '@/lib/portfolioService'

export default function usePortfolio() {
  const [projects, setProjects] = useState<Project[]>([])
  const [certificates, setCertificates] =
    useState<Certificate[]>([])
  const [techStacks, setTechStacks] =
    useState<TechStack[]>([])

  const [loading, setLoading] = useState(true)

    const loadPortfolio = useCallback(async () => {
    const cachedProjects =
      sessionStorage.getItem(
        'portfolioProjects'
      )

    const cachedCertificates =
      sessionStorage.getItem(
        'portfolioCertificates'
      )

    const cachedTechStacks =
      sessionStorage.getItem(
        'portfolioTechStacks'
      )

    if (cachedProjects) {
      setProjects(JSON.parse(cachedProjects))
    }

    if (cachedCertificates) {
      setCertificates(
        JSON.parse(cachedCertificates)
      )
    }

    if (cachedTechStacks) {
      setTechStacks(
        JSON.parse(cachedTechStacks)
      )
    }

    const [
      projectsData,
      certificatesData,
      techStacksData,
    ] = await Promise.all([
      fetchProjects(),
      fetchCertificates(),
      fetchTechStacks(),
    ])

    setProjects(projectsData || [])
    setCertificates(certificatesData || [])
    setTechStacks(techStacksData || [])

    sessionStorage.setItem(
      'portfolioProjects',
      JSON.stringify(projectsData || [])
    )

    sessionStorage.setItem(
      'portfolioCertificates',
      JSON.stringify(certificatesData || [])
    )

    sessionStorage.setItem(
      'portfolioTechStacks',
      JSON.stringify(techStacksData || [])
    )

    setLoading(false)
  
  }, []);

useEffect(() => {
    const timer = setTimeout(() => {
      void loadPortfolio()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadPortfolio])


  return {
    projects,
    certificates,
    techStacks,
    loading,
  }
}

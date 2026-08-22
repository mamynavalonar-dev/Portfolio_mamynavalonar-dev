"use client";

import { useCallback, useEffect, useState } from "react";
import { Project, Certificate, TechStack } from "@/types";
import {
  fetchCertificates,
  fetchProjects,
  fetchTechStacks,
} from "@/lib/portfolioService";
import { normalizeProject } from "@/lib/projectFields";
import type { PublicPortfolioData } from "@/types";

export default function usePortfolio(initialPortfolio?: PublicPortfolioData) {
  const [projects, setProjects] = useState<Project[]>(
    initialPortfolio?.projects ?? [],
  );
  const [certificates, setCertificates] = useState<Certificate[]>(
    initialPortfolio?.certificates ?? [],
  );
  const [techStacks, setTechStacks] = useState<TechStack[]>(
    initialPortfolio?.techStacks ?? [],
  );

  const [loading, setLoading] = useState(!initialPortfolio);

  const loadPortfolio = useCallback(async (hydrateFromCache: boolean) => {
    if (hydrateFromCache) {
      try {
        const cachedProjects = sessionStorage.getItem("portfolioProjects");
        const cachedCertificates = sessionStorage.getItem(
          "portfolioCertificates",
        );
        const cachedTechStacks = sessionStorage.getItem("portfolioTechStacks");

        if (cachedProjects) {
          const parsedProjects = JSON.parse(cachedProjects) as Record<
            string,
            unknown
          >[];

          setProjects(
            parsedProjects.map((project) => normalizeProject(project)),
          );
        }

        if (cachedCertificates) {
          setCertificates(JSON.parse(cachedCertificates));
        }

        if (cachedTechStacks) {
          setTechStacks(JSON.parse(cachedTechStacks));
        }
      } catch {
        // Le cache navigateur est uniquement une optimisation facultative.
      }
    }

    try {
      const [projectsData, certificatesData, techStacksData] =
        await Promise.all([
          fetchProjects(),
          fetchCertificates(),
          fetchTechStacks(),
        ]);

      setProjects(projectsData || []);
      setCertificates(certificatesData || []);
      setTechStacks(techStacksData || []);

      try {
        sessionStorage.setItem(
          "portfolioProjects",
          JSON.stringify(projectsData || []),
        );
        sessionStorage.setItem(
          "portfolioCertificates",
          JSON.stringify(certificatesData || []),
        );
        sessionStorage.setItem(
          "portfolioTechStacks",
          JSON.stringify(techStacksData || []),
        );
      } catch {
        // L'interface reste fonctionnelle si le stockage navigateur est bloqué.
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPortfolio(!initialPortfolio);
    }, 0);

    return () => clearTimeout(timer);
  }, [initialPortfolio, loadPortfolio]);

  return {
    projects,
    certificates,
    techStacks,
    loading,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [error, setError] = useState(initialPortfolio?.unavailable?.length
    ? "Certains contenus sont temporairement indisponibles."
    : "");
  const requestId = useRef(0);

  const loadPortfolio = useCallback(async (hydrateFromCache: boolean) => {
    const currentRequest = ++requestId.current;
    if (hydrateFromCache) {
      try {
        const cachedProjects = sessionStorage.getItem("portfolioProjects");
        const cachedCertificates = sessionStorage.getItem(
          "portfolioCertificates",
        );
        const cachedTechStacks = sessionStorage.getItem("portfolioTechStacks");

        if (cachedProjects && Array.isArray(JSON.parse(cachedProjects))) {
          const parsedProjects = JSON.parse(cachedProjects) as Record<
            string,
            unknown
          >[];

          setProjects(
            parsedProjects.filter((project) => project && typeof project === "object").map((project) => normalizeProject(project)),
          );
        }

        if (cachedCertificates && Array.isArray(JSON.parse(cachedCertificates))) {
          setCertificates(JSON.parse(cachedCertificates));
        }

        if (cachedTechStacks && Array.isArray(JSON.parse(cachedTechStacks))) {
          setTechStacks(JSON.parse(cachedTechStacks));
        }
      } catch {
        // Le cache navigateur est uniquement une optimisation facultative.
      }
    }

    try {
      const results = await Promise.allSettled([
          fetchProjects(),
          fetchCertificates(),
          fetchTechStacks(),
        ]);

      if (currentRequest !== requestId.current) return;
      const [projectsResult, certificatesResult, techResult] = results;
      if (projectsResult.status === "fulfilled") setProjects(projectsResult.value);
      if (certificatesResult.status === "fulfilled") setCertificates(certificatesResult.value);
      if (techResult.status === "fulfilled") setTechStacks(techResult.value);
      setError(results.some((result) => result.status === "rejected")
        ? "Certains contenus ne peuvent pas être actualisés. Les contenus déjà chargés restent disponibles."
        : "");

      try {
        const keys = ["portfolioProjects", "portfolioCertificates", "portfolioTechStacks"];
        results.forEach((result, index) => {
          if (result.status === "fulfilled") sessionStorage.setItem(keys[index], JSON.stringify(result.value));
        });
      } catch {
        // L'interface reste fonctionnelle si le stockage navigateur est bloqué.
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPortfolio(!initialPortfolio);
    }, 0);

    return () => {
      clearTimeout(timer);
      requestId.current += 1;
    };
  }, [initialPortfolio, loadPortfolio]);

  return {
    projects,
    certificates,
    techStacks,
    loading,
    error,
    reload: () => loadPortfolio(false),
  };
}

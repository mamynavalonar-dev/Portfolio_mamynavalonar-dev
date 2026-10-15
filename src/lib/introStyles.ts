// Règles dans <head> : premier affichage protégé avant le CSS et l'hydratation.
export const INTRO_CRITICAL_CSS = `
  [data-portfolio-content][data-intro-pending="true"] { visibility: hidden; }
  [data-portfolio-intro] { position: fixed; inset: 0; z-index: 9999; background: #000; }
  [data-portfolio-welcome] { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #000; color: #fff; }
  [data-portfolio-welcome][data-intro-started="false"] > div { visibility: hidden; }
  html:has(:target) [data-portfolio-intro] { display: none !important; }
  html:has(:target) [data-portfolio-content] { visibility: visible !important; }
  @media (prefers-reduced-motion: reduce) {
    [data-portfolio-intro] { display: none !important; }
    [data-portfolio-content] { visibility: visible !important; }
  }
`;
export const INTRO_NOSCRIPT_CSS = `[data-portfolio-intro] { display: none !important; } [data-portfolio-content] { visibility: visible !important; }`;

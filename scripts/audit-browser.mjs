import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const playwright = process.env.AUDIT_PLAYWRIGHT_PATH
  ? require(resolve(process.env.AUDIT_PLAYWRIGHT_PATH)) : require("playwright");
const baseURL = process.env.AUDIT_BASE_URL ?? "http://localhost:3000/";
const output = process.env.AUDIT_OUTPUT ?? "artifacts/audit-final";
const channel = process.env.AUDIT_BROWSER_CHANNEL ?? "msedge";
const expectProjects = process.env.AUDIT_EXPECT_PROJECTS !== "0";
const collectTrace = process.env.AUDIT_TRACE !== "0";
const collectVideo = process.env.AUDIT_VIDEO !== "0";
await mkdir(output, { recursive: true });
const browser = await playwright.chromium.launch({ ...(channel ? { channel } : {}), headless: process.env.AUDIT_HEADLESS !== "0" });
const results = [];

try {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) {
      const name = `${reducedMotion}-${viewport.width}`;
      const context = await browser.newContext({ viewport, reducedMotion, ...(collectVideo ? { recordVideo: { dir: `${output}/videos`, size: viewport } } : {}) });
      await context.addInitScript(() => {
        const phases = []; let current;
        const finish = () => {
          if (!current) return;
          phases.push({ ...current, durationMilliseconds: Math.round(performance.now() - current.started), approximateAnimationFrameRate: current.frames / Math.max(.001, (performance.now() - current.started) / 1000) });
          current = undefined;
        };
        const start = (name) => { finish(); current = { name, started: performance.now(), frames: 0, badgeRenderedFrames: 0, gapsOver32ms: 0, largestGapMilliseconds: 0, longTasks: 0, longestTaskMilliseconds: 0 }; };
        let last;
        const tick = (timestamp) => {
          if (current) {
            current.frames += 1;
            if (last !== undefined && last >= current.started) {
              const gap = timestamp - last;
              if (gap > 32) current.gapsOver32ms += 1;
              current.largestGapMilliseconds = Math.max(current.largestGapMilliseconds, gap);
            }
          }
          last = timestamp; requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) if (current && entry.startTime >= current.started) { current.longTasks += 1; current.longestTaskMilliseconds = Math.max(current.longestTaskMilliseconds, entry.duration); }
        }).observe({ type: "longtask", buffered: true });
        window.__portfolioPerformanceProbe = { badgeFrame: () => { if (current) current.badgeRenderedFrames += 1; }, start, finish, results: () => { finish(); return phases; } };
        start("demarrage");
      });
      if (collectTrace) await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      const page = await context.newPage();
      const errors = [];
      const requests = [];
      const consoleErrors = [];
      let receiveComments;
      const commentsReceived = new Promise((resolve) => { receiveComments = resolve; });
      page.on("response", (response) => {
        if (new URL(response.url()).pathname === "/api/comments") receiveComments(response);
      });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("request", (request) => requests.push({ url: request.url(), type: request.resourceType() }));
      const result = { name, width: viewport.width, reducedMotion };
      try {
        const response = await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 45000 });
        result.status = response?.status();
        assert.equal(result.status, 200, "La page doit répondre 200");
        await page.screenshot({ path: `${output}/premier-affichage-${name}.png` });
        await page.locator("[data-portfolio-intro]").waitFor({ state: "hidden", timeout: 10000 });
        await page.screenshot({ path: `${output}/accueil-${name}.png` });
        assert.equal(await page.locator("h1").count(), 1, "Un seul titre h1");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Débordement horizontal");
        const nameBox = await page.locator('[data-hero-name]').boundingBox();
        const navBox = await page.locator('nav').first().boundingBox();
        if (viewport.width < 768) assert.ok(nameBox && navBox && nameBox.y >= navBox.y + navBox.height, "Le nom doit commencer sous la navbar");
        const promptBox = await page.locator('[data-scroll-anchor] span').boundingBox();
        assert.ok(promptBox && Math.abs(promptBox.x + promptBox.width / 2 - viewport.width / 2) <= 2, "Défiler centré dans l'écran");
        if (reducedMotion === "no-preference" && viewport.width >= 768) {
          await page.locator('[data-badge-ready="true"], [data-badge-fallback]').first().waitFor({ state: "visible", timeout: 30000 });
          result.badge = await page.locator("[data-badge-fallback]").count() ? "repli-apres-erreur" : "canvas-pret";
          // Un environnement sans WebGL ne valide pas le comportement 3D.
          assert.equal(result.badge, "canvas-pret", "Le moteur 3D n'a pas pu être vérifié dans ce navigateur");
          // Le badge d'origine autorise la traction après son verrou de 1 350 ms.
          await page.waitForTimeout(1800);
          const canvas = page.locator("[data-badge-canvas] canvas").first();
          result.webgl = await canvas.evaluate((element) => {
            const gl = element.getContext("webgl2") ?? element.getContext("webgl");
            if (!gl) return null;
            const extension = gl.getExtension("WEBGL_debug_renderer_info");
            return { renderer: gl.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER), vendor: gl.getParameter(extension?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR), version: gl.getParameter(gl.VERSION) };
          });
          const box = await canvas.boundingBox();
          assert.ok(box, "Canvas mesurable");
          let grabPoint;
          for (const x of [0.86, 0.79, 0.93, 0.72, 0.65]) {
            for (const y of [0.55, 0.45, 0.65, 0.35, 0.75]) {
              const point = { x: box.x + box.width * x, y: box.y + box.height * y };
              await page.mouse.move(point.x, point.y);
              if (await page.evaluate(() => document.body.style.cursor === "grab")) { grabPoint = point; break; }
            }
            if (grabPoint) break;
          }
          assert.ok(grabPoint, "Le badge doit proposer la traction au pointeur");
          await page.evaluate(() => window.__portfolioPerformanceProbe.start("traction"));
          await page.mouse.down();
          await page.waitForFunction(() => document.body.style.cursor === "grabbing");
          await page.mouse.move(grabPoint.x - 120, grabPoint.y + 70, { steps: 12 });
          await page.waitForTimeout(400);
          await page.evaluate(() => window.__portfolioPerformanceProbe.finish());
          await page.screenshot({ path: `${output}/badge-tire-${name}.png` });
          await page.evaluate(() => window.__portfolioPerformanceProbe.start("relachement"));
          await page.mouse.up();
          await page.waitForFunction(() => document.body.style.cursor !== "grabbing");
          await page.waitForTimeout(1800);
          await page.evaluate(() => window.__portfolioPerformanceProbe.finish());
          result.badgePointer = "traction-et-relachement";

        } else {
          assert.equal(await page.locator("[data-badge-canvas]").count(), 0, "Pas de moteur 3D en mode réduit ou mobile");
          result.badge = "non-requis";
        }
        result.requestsAtHome = [...requests];
        await page.evaluate(() => window.__portfolioPerformanceProbe.finish());
        result.startupMarks = await page.evaluate(() => performance.getEntriesByType("mark").filter((entry) => entry.name.startsWith("portfolio:")).map((entry) => ({ name: entry.name, milliseconds: Math.round(entry.startTime) })));
        assert.equal(requests.some((request) => /\/api\/comments(?:\?|$)/.test(request.url)), false, "Pas de lecture des commentaires au démarrage");

        await page.evaluate(() => window.__portfolioPerformanceProbe.start("defilement-descente-montee"));
        await page.mouse.move(viewport.width / 2, Math.min(250, viewport.height / 2));
        for (const direction of [1, -1]) for (let step = 0; step < 8; step++) { await page.mouse.wheel(0, direction * 450); await page.waitForTimeout(120); }
        await page.evaluate(() => window.__portfolioPerformanceProbe.finish());

        const serviceSection = page.locator("#services");
        if (await serviceSection.count()) {
          await serviceSection.scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${output}/services-${name}.png` });
          const trigger = serviceSection.getByRole("button", { name: /^Voir les détails : / }).first();
          await trigger.click();
          const serviceDialog = page.getByRole("dialog");
          await serviceDialog.waitFor({ state: "visible" });
          for (let index = 0; index < 6; index++) {
            await page.keyboard.press("Tab");
            assert.equal(await serviceDialog.evaluate((element) => element.contains(document.activeElement)), true, "Focus dans les détails du service");
          }
          await page.screenshot({ path: `${output}/service-details-${name}.png` });
          await page.keyboard.press("Escape");
          await serviceDialog.waitFor({ state: "hidden" });
          assert.equal(await trigger.evaluate((element) => element === document.activeElement), true, "Focus rendu au service");
          result.services = "cartes-et-details";
        }

        const journeySection = page.locator("#qualifications");
        if (await journeySection.count()) {
          await journeySection.scrollIntoViewIfNeeded();
          for (const label of ["Formations", "Expériences", "Projets"]) {
            const tab = journeySection.getByRole("tab", { name: new RegExp(label) });
            await tab.click();
            assert.equal(await tab.getAttribute("aria-selected"), "true", "Catégorie du parcours sélectionnée");
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Parcours sans débordement horizontal");
            await page.screenshot({ path: `${output}/parcours-${label}-${name}.png` });
          }
          result.journey = "trois-onglets";
        }

        const technologyTitle = page.locator("#technology-marquee-title");
        if (await technologyTitle.count()) {
          await technologyTitle.scrollIntoViewIfNeeded();
          const strip = technologyTitle.locator("..").locator("..");
          const track = strip.locator("[data-running]");
          await page.screenshot({ path: `${output}/technologies-${name}.png` });
          if (reducedMotion === "reduce") assert.equal(await track.evaluate((element) => getComputedStyle(element).animationName), "none", "Bandeau statique en mouvement réduit");
          else {
            assert.equal(await strip.getByRole("button").count(), 0, "Aucun bouton Pause dans le bandeau");
            const viewport = strip.getByLabel("Liste des technologies, défilement horizontal");
            if (await page.evaluate(() => matchMedia("(hover: hover)").matches)) {
              await viewport.hover();
              assert.equal(await track.evaluate((element) => getComputedStyle(element).animationPlayState), "paused", "Pause au survol");
            }
            await page.mouse.move(0, 0);
            await viewport.focus();
            assert.equal(await track.evaluate((element) => getComputedStyle(element).animationPlayState), "paused", "Pause au focus clavier");
            await viewport.press("Tab");
            const groupWidth = await track.locator("ul").first().evaluate((element) => element.getBoundingClientRect().width);
            const seconds = await track.evaluate((element) => parseFloat(getComputedStyle(element).animationDuration));
            assert.ok(groupWidth / seconds <= 27, "Vitesse douce indépendante du nombre de technologies");
          }
          result.technologies = "bandeau-et-mouvement-reduit";
        }

        const portfolio = page.locator("#portfolio");
        await portfolio.scrollIntoViewIfNeeded();
        const details = page.getByRole("button", { name: /^Ouvrir les détails du projet / }).first();
        if (expectProjects) {
          await details.waitFor({ state: "visible", timeout: 15000 });
          assert.ok(await page.locator('#portfolio h3 a[href^="/portfolio/"]').count(), "Lien projet présent dans la carte");
          await details.click();
          const dialog = page.getByRole("dialog");
          await dialog.waitFor({ state: "visible" });
          for (let i = 0; i < 12; i++) {
            await page.keyboard.press("Tab");
            assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true, "Focus confiné dans la modale");
          }
          await page.keyboard.press("Escape");
          await dialog.waitFor({ state: "hidden" });
          assert.equal(await details.evaluate((element) => element === document.activeElement), true, "Focus rendu au bouton");
          result.modal = "validee";
        } else result.modal = "non-exigee-config-explicite";

        for (const section of ["about", "portfolio", "contact"]) {
          await page.locator(`#${section}`).scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${output}/${section}-${name}.png` });
        }
        let timeout;
        const commentResponse = await Promise.race([
          commentsReceived,
          new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Lecture des commentaires non reçue près de Contact")), 15000); }),
        ]).finally(() => clearTimeout(timeout));
        assert.equal(commentResponse.status(), 200, "Lecture des commentaires réussie");
        assert.deepEqual(errors, [], "Aucune erreur JavaScript non gérée");
        result.ok = true;
      } catch (error) {
        result.ok = false; result.error = error.message; process.exitCode = 1;
      } finally {
        result.errors = errors; result.consoleErrors = consoleErrors; result.requests = requests;
        result.performance = await page.evaluate(() => window.__portfolioPerformanceProbe?.results() ?? []).catch(() => []);
        if (collectTrace) await context.tracing.stop({ path: `${output}/trace-${name}.zip` });
        await context.close();
        results.push(result);
        await writeFile(`${output}/browser-results.json`, JSON.stringify(results, null, 2));
        console.log(JSON.stringify({ name, ok: result.ok, badge: result.badge, error: result.error }));
      }
    }
  }
  // Les contrôles d'écriture invalide sont réservés à un serveur local.
  if (["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const contact = await page.request.post(new URL("/api/contact", baseURL).href, { data: {} });
      assert.equal(contact.status(), 400, "Le contact invalide est refusé");
      await page.goto(new URL("/admin/dashboard", baseURL).href);
      assert.ok(page.url().includes("/admin/login"), "La navigation admin anonyme est redirigée");
    } finally { await context.close(); }
  }
} finally { await browser.close(); }

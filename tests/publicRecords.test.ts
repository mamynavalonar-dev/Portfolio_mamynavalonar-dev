import { expect, it } from "vitest";
import { retainPublicRecords } from "../src/lib/publicRecords";

it("conserve les références si la réponse JSON est identique, même avec un ordre de clés différent", () => {
  const previous = [{ id: "p1", title: "Projet", gallery: ["one", "two"], metadata: { public: true, order: 1 } }];
  const incoming = [{ metadata: { order: 1, public: true }, gallery: ["one", "two"], title: "Projet", id: "p1" }];
  expect(retainPublicRecords(previous, incoming)).toBe(previous);
});
it("publie une modification de contenu ou de galerie", () => {
  const previous = [{ id: "p1", title: "Projet", gallery: ["one", "two"] }];
  for (const incoming of [
    [{ id: "p1", title: "Nouveau projet", gallery: ["one", "two"] }],
    [{ id: "p1", title: "Projet", gallery: ["two", "one"] }],
    [{ id: "p1", title: "Projet", gallery: ["one"] }],
  ]) expect(retainPublicRecords(previous, incoming)).toBe(incoming);
});
it("ne confond pas suppression, ajout, ordre des lignes et null", () => {
  const previous: unknown[] = [{ id: "a" }, { id: "b" }];
  for (const incoming of [[{ id: "b" }, { id: "a" }], [{ id: "a" }], [...previous, null], [null, { id: "b" }]]) expect(retainPublicRecords(previous, incoming)).toBe(incoming);
});

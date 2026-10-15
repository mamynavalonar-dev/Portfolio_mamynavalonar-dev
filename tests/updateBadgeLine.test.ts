import { describe, expect, it } from "vitest";
import { MeshLineGeometry } from "meshline";
import { CatmullRomCurve3, Vector3, type BufferAttribute } from "three";
import { createBadgeLineUpdater } from "@/lib/updateBadgeLine";
const curve = () => new CatmullRomCurve3([new Vector3(2, -3, 0), new Vector3(1, -2, .1), new Vector3(.5, -1, .2), new Vector3(0, 0, 0)], false, "chordal");
function sameLine(actual: MeshLineGeometry, expected: MeshLineGeometry) {
  for (const name of Object.keys(expected.attributes)) expect([...actual.getAttribute(name).array], name).toEqual([...expected.getAttribute(name).array]);
  expect([...actual.index!.array]).toEqual([...expected.index!.array]);
  expect(actual.boundingBox).toEqual(expected.boundingBox);
  expect(actual.boundingSphere).toEqual(expected.boundingSphere);
}
describe("badge line rendering", () => {
  it("draws exactly the original MeshLine across 120 moving chordal curves", () => {
    const value = curve(); const expected = new MeshLineGeometry(); const actual = new MeshLineGeometry(); const update = createBadgeLineUpdater();
    for (let frame = 0; frame < 120; frame++) {
      value.points[0].x = 2 + Math.sin(frame / 9); value.points[1].z = Math.cos(frame / 13) * .5;
      expected.setPoints(value.getPoints(32).flatMap((point) => point.toArray())); update(actual, value); sameLine(actual, expected);
    }
    actual.dispose(); expected.dispose();
  });
  it("retains the GPU buffers and does not reupload topology or UVs each frame", () => {
    const value = curve(); const geometry = new MeshLineGeometry(); const update = createBadgeLineUpdater(); update(geometry, value);
    const attributes = { ...geometry.attributes } as Record<string, BufferAttribute>; const index = geometry.index; const staticVersions = [attributes.side, attributes.width, attributes.uv, attributes.counters, index!].map((attribute) => attribute.version);
    for (let frame = 0; frame < 100; frame++) { value.points[1].y -= .01; update(geometry, value); }
    for (const name of Object.keys(attributes)) expect(geometry.getAttribute(name)).toBe(attributes[name]);
    expect(geometry.index).toBe(index); expect([attributes.side, attributes.width, attributes.uv, attributes.counters, index!].map((attribute) => attribute.version)).toEqual(staticVersions);
    geometry.dispose();
  });
  it("handles a replacement geometry and preserves the original closed endpoint rules", () => {
    const value = curve(); value.points[3].copy(value.points[0]); const update = createBadgeLineUpdater();
    for (let frame = 0; frame < 2; frame++) { const actual = new MeshLineGeometry(); const expected = new MeshLineGeometry(); expected.setPoints(value.getPoints(32).flatMap((point) => point.toArray())); update(actual, value); sameLine(actual, expected); actual.dispose(); expected.dispose(); }
  });
});

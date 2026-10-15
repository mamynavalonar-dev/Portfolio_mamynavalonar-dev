import { DynamicDrawUsage, type BufferAttribute, type BufferGeometry, type CatmullRomCurve3, Vector3 } from "three";

type LineGeometry = BufferGeometry & { setPoints(points: Float32Array): void };
export function createBadgeLineUpdater(divisions = 32) {
  const samples = Array.from({ length: divisions + 1 }, () => new Vector3());
  let initialized: LineGeometry | undefined;
  return (geometry: LineGeometry, curve: CatmullRomCurve3) => {
    for (let index = 0; index <= divisions; index++) curve.getPoint(index / divisions, samples[index]);
    if (initialized !== geometry) {
      const initial = new Float32Array(samples.length * 3);
      for (let index = 0; index < samples.length; index++) {
        initial[index * 3] = samples[index].x; initial[index * 3 + 1] = samples[index].y; initial[index * 3 + 2] = samples[index].z;
      }
      geometry.setPoints(initial);
      for (const name of ["position", "previous", "next"]) (geometry.getAttribute(name) as BufferAttribute).setUsage(DynamicDrawUsage);
      initialized = geometry;
    }
    const position = geometry.getAttribute("position") as BufferAttribute;
    const previous = geometry.getAttribute("previous") as BufferAttribute;
    const next = geometry.getAttribute("next") as BufferAttribute;
    const closed = samples[0].equals(samples[divisions]);
    for (let index = 0; index <= divisions; index++) {
      const point = samples[index];
      const before = samples[index === 0 ? (closed ? divisions - 1 : 0) : index - 1];
      const after = samples[index === divisions ? (closed ? 1 : divisions) : index + 1];
      for (let side = 0; side < 2; side++) {
        const vertex = index * 2 + side;
        position.setXYZ(vertex, point.x, point.y, point.z);
        previous.setXYZ(vertex, before.x, before.y, before.z);
        next.setXYZ(vertex, after.x, after.y, after.z);
      }
    }
    position.needsUpdate = previous.needsUpdate = next.needsUpdate = true;
    // La topologie, les UV, la largeur et l'indice restent ceux de MeshLine.
    // Les bornes restent à jour pour les éventuels consommateurs de la géométrie.
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
  };
}

import { describe, expect, it } from "vitest";
import {
  CV_MAX_BYTES,
  hasPdfSignature,
  sanitizeCvFileName,
} from "@/lib/cvValidation";

describe("cvValidation", () => {
  it("accepte la signature PDF standard", () => {
    expect(
      hasPdfSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])),
    ).toBe(true);
  });

  it("rejette un contenu qui n'est pas un PDF", () => {
    expect(
      hasPdfSignature(new Uint8Array([0x50, 0x4e, 0x47, 0x00, 0x00])),
    ).toBe(false);
  });

  it("normalise le nom du CV", () => {
    expect(sanitizeCvFileName("CV Mamy 2026.pdf")).toBe("CV-Mamy-2026.pdf");
    expect(sanitizeCvFileName("nouveau cv")).toBe("nouveau-cv.pdf");
  });

  it("limite le CV a 3 Mio", () => {
    expect(CV_MAX_BYTES).toBe(3 * 1024 * 1024);
  });
});

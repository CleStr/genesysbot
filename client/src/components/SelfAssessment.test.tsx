import { describe, it, expect } from "vitest";
import { deriveEnergySecurity } from "./SelfAssessment";

describe("P4: deriveEnergySecurity — transparentes Mapping der Energieversorgung", () => {
  it("beide Angaben gut (Zuverlässigkeit 5, keine Kostenbelastung 1) → high", () => {
    expect(
      deriveEnergySecurity({ energyReliability: "5", energyAffordability: "1" })
    ).toBe("high");
  });

  it("beide Angaben schlecht (Zuverlässigkeit 1, sehr starke Belastung 5) → low", () => {
    expect(
      deriveEnergySecurity({ energyReliability: "1", energyAffordability: "5" })
    ).toBe("low");
  });

  it("Mittelwerte (3 / 3) → moderate", () => {
    expect(
      deriveEnergySecurity({ energyReliability: "3", energyAffordability: "3" })
    ).toBe("moderate");
  });

  it("Schwelle high: Score genau 3.5 → high", () => {
    // rel 4, aff 3 → (4 + 3) / 2 = 3.5
    expect(
      deriveEnergySecurity({ energyReliability: "4", energyAffordability: "3" })
    ).toBe("high");
  });

  it("Schwelle moderate: Score genau 2.5 → moderate", () => {
    // rel 2, aff 3 → (2 + 3) / 2 = 2.5
    expect(
      deriveEnergySecurity({ energyReliability: "2", energyAffordability: "3" })
    ).toBe("moderate");
  });

  it("Score knapp unter 2.5 → low", () => {
    // rel 2, aff 4 → (2 + 2) / 2 = 2.0
    expect(
      deriveEnergySecurity({ energyReliability: "2", energyAffordability: "4" })
    ).toBe("low");
  });

  it("nur Zuverlässigkeit angegeben (N/A bei Bezahlbarkeit) → zählt allein", () => {
    expect(
      deriveEnergySecurity({ energyReliability: "5", energyAffordability: "na" })
    ).toBe("high");
    expect(
      deriveEnergySecurity({ energyReliability: "1", energyAffordability: "na" })
    ).toBe("low");
    expect(
      deriveEnergySecurity({ energyReliability: "3", energyAffordability: "na" })
    ).toBe("moderate");
  });

  it("nur Bezahlbarkeit angegeben (N/A bei Zuverlässigkeit) → zählt allein (invertiert)", () => {
    // aff 1 → 6-1 = 5 → high; aff 5 → 6-5 = 1 → low
    expect(
      deriveEnergySecurity({ energyReliability: "na", energyAffordability: "1" })
    ).toBe("high");
    expect(
      deriveEnergySecurity({ energyReliability: "na", energyAffordability: "5" })
    ).toBe("low");
    expect(
      deriveEnergySecurity({ energyReliability: "na", energyAffordability: "3" })
    ).toBe("moderate");
  });

  it("beide N/A → neutraler Mittelpunkt moderate", () => {
    expect(
      deriveEnergySecurity({ energyReliability: "na", energyAffordability: "na" })
    ).toBe("moderate");
  });

  it("fehlende Angaben werden wie N/A behandelt → moderate bzw. Einzelwert", () => {
    expect(deriveEnergySecurity({})).toBe("moderate");
    expect(
      deriveEnergySecurity({ energyReliability: "4" })
    ).toBe("high");
  });

  it("hohe Zuverlässigkeit kann starke Kostenbelastung nicht komplett ausgleichen (Mittelung)", () => {
    // rel 5, aff 5 → (5 + 1) / 2 = 3.0 → moderate, nicht high
    expect(
      deriveEnergySecurity({ energyReliability: "5", energyAffordability: "5" })
    ).toBe("moderate");
  });
});

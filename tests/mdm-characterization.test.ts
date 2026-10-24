import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateTierMDM,
  calculateSchoolMDM,
  calculateGrainStock,
  DEFAULT_MDM_RATES,
  type MDMItemsServed,
  type MDMRates,
} from "@/lib/mdm-engine";

// Mock dependencies for saveMDMFruitLogAction
vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      count: vi.fn(),
    },
    attendance: {
      findMany: vi.fn(),
    },
    mDMDailyLog: {
      upsert: vi.fn(),
    },
    mDMStudentAttendance: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => {
      return callback({
        mDMDailyLog: {
          upsert: vi.fn().mockResolvedValue({ id: "log-123" }),
        },
        mDMStudentAttendance: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      });
    }),
  },
}));

vi.mock("@/lib/rbac", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/data/academic-session", () => ({
  getCurrentSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveMDMFruitLogAction } from "@/app/actions/save-mdm";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getCurrentSession } from "@/lib/data/academic-session";

describe("MDM Engine - Characterization Tests (Golden Master)", () => {
  const allItems: MDMItemsServed = {
    rice: true,
    wheat: true,
    fruits: true,
    nutrition: true,
    milk: true,
  };

  const sampleRates: MDMRates = {
    grainPrimaryGrams: 100,
    grainJuniorGrams: 150,
    conversionCostPrimary: 6.78,
    conversionCostJunior: 10.17,
    fruitCostPerStudent: 4.0,
    nutritionCostPerStudent: 5.0,
    milkMlPrimary: 150,
    milkMlJunior: 200,
  };

  describe("Tier calculations characterization", () => {
    it("matches exact golden outputs for primary tier (60 students, 50 ate fruit)", () => {
      const primary = calculateTierMDM(
        "primary",
        { presentStudents: 60, fruitsEaten: 50 },
        allItems,
        sampleRates
      );

      expect(primary).toEqual({
        present: 60,
        wheatGrams: 6000,
        riceGrams: 6000,
        wheatKg: 6,
        riceKg: 6,
        fruitsEaten: 50,
        fruitCost: 200,
        conversionCost: 406.8,
        nutritionCost: 300,
        milkStudents: 60,
        milkLitres: 9,
      });
    });

    it("matches exact golden outputs for junior tier (40 students, 35 ate fruit)", () => {
      const junior = calculateTierMDM(
        "junior",
        { presentStudents: 40, fruitsEaten: 35 },
        allItems,
        sampleRates
      );

      expect(junior).toEqual({
        present: 40,
        wheatGrams: 6000,
        riceGrams: 6000,
        wheatKg: 6,
        riceKg: 6,
        fruitsEaten: 35,
        fruitCost: 140,
        conversionCost: 406.8,
        nutritionCost: 200,
        milkStudents: 40,
        milkLitres: 8,
      });
    });
  });

  describe("Combined School Day Total characterization", () => {
    it("matches exact combined golden values across primary and junior tiers", () => {
      const combined = calculateSchoolMDM(
        { presentStudents: 60, fruitsEaten: 50 },
        { presentStudents: 40, fruitsEaten: 35 },
        allItems,
        sampleRates
      );

      expect(combined.totalPresent).toBe(100);
      expect(combined.totalWheatKg).toBe(12);
      expect(combined.totalRiceKg).toBe(12);
      expect(combined.totalConversionCost).toBe(813.6);
      expect(combined.totalFruitCost).toBe(340);
      expect(combined.totalNutritionCost).toBe(500);
      expect(combined.totalMilkLitres).toBe(17);
      expect(combined.grandTotalCost).toBe(1653.6);
    });
  });

  describe("Stock Ledger characterization", () => {
    it("matches exact stock ledger balances for sample opening, received, and consumed quantities", () => {
      const ledger = calculateGrainStock(75.5, 150.0, 180.25);

      expect(ledger).toEqual({
        openingBalanceKg: 75.5,
        receivedKg: 150.0,
        consumedKg: 180.25,
        closingBalanceKg: 45.25,
      });
    });
  });

  describe("saveMDMFruitLogAction characterization", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      (requireRole as any).mockResolvedValue({
        user: { id: "admin-user-1", role: "ADMIN" },
      });
      (getCurrentSession as any).mockResolvedValue({
        id: "sess-2026",
        label: "2026-2027",
      });
      (prisma.student.count as any).mockResolvedValue(120);
      (prisma.attendance.findMany as any).mockResolvedValue([
        { studentId: "s-1" },
        { studentId: "s-2" },
      ]);
    });

    it("rejects missing date parameter", async () => {
      const res = await saveMDMFruitLogAction({
        dateString: "",
        fruitEntries: [],
      });
      expect(res).toEqual({
        success: false,
        message: "Missing date parameter.",
      });
    });

    it("rejects invalid date parameter", async () => {
      const res = await saveMDMFruitLogAction({
        dateString: "not-a-date",
        fruitEntries: [],
      });
      expect(res).toEqual({
        success: false,
        message: "Invalid date provided.",
      });
    });

    it("successfully creates MDM daily log with statutory description and records fruit attendance", async () => {
      const res = await saveMDMFruitLogAction({
        dateString: "2026-10-15",
        fruitEntries: [
          { studentId: "s-1", didEat: true },
          { studentId: "s-2", didEat: false },
        ],
        locale: "en",
      });

      expect(res.success).toBe(true);
      expect(res.message).toBe("Updated fruit consumption: 1 students recorded as ate fruit.");
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});

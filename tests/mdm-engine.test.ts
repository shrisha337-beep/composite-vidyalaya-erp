import { describe, it, expect } from "vitest";
import {
  calculateTierMDM,
  calculateSchoolMDM,
  calculateGrainStock,
  isPrimaryClass,
  DEFAULT_MDM_RATES,
  type MDMRates,
  type MDMItemsServed,
} from "@/lib/mdm-engine";

describe("Mid-Day Meal (MDM) Statutory Engine", () => {
  const allItems: MDMItemsServed = {
    rice: true,
    wheat: true,
    fruits: true,
    nutrition: true,
    milk: true,
  };

  const noItems: MDMItemsServed = {
    rice: false,
    wheat: false,
    fruits: false,
    nutrition: false,
    milk: false,
  };

  describe("Tier-Specific Calculations (Primary 100g/₹6.78 vs Junior 150g/₹10.17)", () => {
    it("calculates primary tier standard rations and costs accurately", () => {
      // 50 primary students present
      const res = calculateTierMDM("primary", { presentStudents: 50 }, allItems, DEFAULT_MDM_RATES);

      expect(res.present).toBe(50);
      // 50 * 100g = 5,000g = 5.0 kg
      expect(res.wheatGrams).toBe(5000);
      expect(res.wheatKg).toBe(5);
      expect(res.riceGrams).toBe(5000);
      expect(res.riceKg).toBe(5);
      // 50 * ₹6.78 = ₹339.00
      expect(res.conversionCost).toBe(339);
      // 50 * ₹4.00 fruit = ₹200.00
      expect(res.fruitsEaten).toBe(50);
      expect(res.fruitCost).toBe(200);
      // 50 * ₹5.00 nutrition = ₹250.00
      expect(res.nutritionCost).toBe(250);
      // 50 * 150 mL = 7,500 mL = 7.5 Litres
      expect(res.milkStudents).toBe(50);
      expect(res.milkLitres).toBe(7.5);
    });

    it("calculates junior tier standard rations and costs accurately", () => {
      // 40 junior students present
      const res = calculateTierMDM("junior", { presentStudents: 40 }, allItems, DEFAULT_MDM_RATES);

      expect(res.present).toBe(40);
      // 40 * 150g = 6,000g = 6.0 kg
      expect(res.wheatGrams).toBe(6000);
      expect(res.wheatKg).toBe(6);
      expect(res.riceGrams).toBe(6000);
      expect(res.riceKg).toBe(6);
      // 40 * ₹10.17 = ₹406.80
      expect(res.conversionCost).toBe(406.8);
      // 40 * ₹4.00 fruit = ₹160.00
      expect(res.fruitsEaten).toBe(40);
      expect(res.fruitCost).toBe(160);
      // 40 * ₹5.00 nutrition = ₹200.00
      expect(res.nutritionCost).toBe(200);
      // 40 * 200 mL = 8,000 mL = 8.0 Litres
      expect(res.milkStudents).toBe(40);
      expect(res.milkLitres).toBe(8);
    });
  });

  describe("Zero Attendance", () => {
    it("handles zero attendance cleanly with zero food, cost, and milk", () => {
      const res = calculateTierMDM("primary", { presentStudents: 0 }, allItems);

      expect(res.present).toBe(0);
      expect(res.wheatGrams).toBe(0);
      expect(res.wheatKg).toBe(0);
      expect(res.riceGrams).toBe(0);
      expect(res.riceKg).toBe(0);
      expect(res.conversionCost).toBe(0);
      expect(res.fruitCost).toBe(0);
      expect(res.nutritionCost).toBe(0);
      expect(res.milkLitres).toBe(0);
    });
  });

  describe("Items Selection Toggles", () => {
    it("calculates zero grain and milk when items are not served on that day", () => {
      const res = calculateTierMDM(
        "primary",
        { presentStudents: 30 },
        noItems
      );

      expect(res.wheatGrams).toBe(0);
      expect(res.riceGrams).toBe(0);
      expect(res.fruitCost).toBe(0);
      expect(res.nutritionCost).toBe(0);
      expect(res.milkLitres).toBe(0);
      // Base conversion cost is still applicable if attendance > 0
      expect(res.conversionCost).toBe(30 * 6.78);
    });

    it("respects partial fruit consumption counts (e.g. absent or opted-out students)", () => {
      // 50 present, but only 38 ate fruit
      const res = calculateTierMDM(
        "primary",
        { presentStudents: 50, fruitsEaten: 38 },
        allItems
      );

      expect(res.fruitsEaten).toBe(38);
      expect(res.fruitCost).toBe(38 * 4);
    });
  });

  describe("Rates Read from Settings (Custom Configuration)", () => {
    it("computes accurately when administrative rates update via SchoolSettings", () => {
      const customRates: MDMRates = {
        grainPrimaryGrams: 110,
        grainJuniorGrams: 160,
        conversionCostPrimary: 7.5,
        conversionCostJunior: 11.25,
        fruitCostPerStudent: 5.0,
        nutritionCostPerStudent: 6.0,
        milkMlPrimary: 175,
        milkMlJunior: 225,
      };

      const res = calculateTierMDM("junior", { presentStudents: 20 }, allItems, customRates);

      expect(res.wheatGrams).toBe(20 * 160);
      expect(res.conversionCost).toBe(20 * 11.25);
      expect(res.fruitCost).toBe(20 * 5.0);
      expect(res.nutritionCost).toBe(20 * 6.0);
      expect(res.milkLitres).toBe((20 * 225) / 1000);
    });
  });

  describe("School-Wide Mixed Tier Combined Calculation", () => {
    it("aggregates primary and junior into school-wide totals with proper rounding", () => {
      const combined = calculateSchoolMDM(
        { presentStudents: 65, fruitsEaten: 60 },
        { presentStudents: 45, fruitsEaten: 42 },
        allItems,
        DEFAULT_MDM_RATES
      );

      expect(combined.totalPresent).toBe(110);
      // Primary: 65 * 100g = 6.5 kg; Junior: 45 * 150g = 6.75 kg -> Total 13.25 kg
      expect(combined.totalWheatKg).toBe(13.25);
      expect(combined.totalRiceKg).toBe(13.25);
      // Primary conversion: 65 * 6.78 = 440.7; Junior conversion: 45 * 10.17 = 457.65 -> 898.35
      expect(combined.totalConversionCost).toBe(898.35);
      // Fruit: (60 + 42) * 4 = 102 * 4 = 408
      expect(combined.totalFruitCost).toBe(408);
      // Nutrition: (65 + 45) * 5 = 110 * 5 = 550
      expect(combined.totalNutritionCost).toBe(550);
      // Milk: 65*0.15 = 9.75L + 45*0.2 = 9.0L -> 18.75L
      expect(combined.totalMilkLitres).toBe(18.75);
      // Grand total cost
      expect(combined.grandTotalCost).toBe(898.35 + 408 + 550);
    });
  });

  describe("Grain Stock Balance Carry-Over", () => {
    it("correctly reconciles opening stock, receipts, consumption, and closing balance", () => {
      // Opening balance 120.5 kg, received 250 kg from PDS, consumed 285.25 kg
      const ledger = calculateGrainStock(120.5, 250, 285.25);

      expect(ledger.openingBalanceKg).toBe(120.5);
      expect(ledger.receivedKg).toBe(250);
      expect(ledger.consumedKg).toBe(285.25);
      // 120.5 + 250 - 285.25 = 85.25 kg
      expect(ledger.closingBalanceKg).toBe(85.25);
    });

    it("carries over closing balance as next month's opening balance", () => {
      const month1 = calculateGrainStock(100, 200, 220);
      expect(month1.closingBalanceKg).toBe(80);

      // Month 2 opens with Month 1 closing balance
      const month2 = calculateGrainStock(month1.closingBalanceKg, 150, 190);
      expect(month2.openingBalanceKg).toBe(80);
      expect(month2.closingBalanceKg).toBe(40);
    });
  });

  describe("Class Level Helper", () => {
    it("correctly identifies primary vs junior classes", () => {
      expect(isPrimaryClass("1")).toBe(true);
      expect(isPrimaryClass("2")).toBe(true);
      expect(isPrimaryClass("5")).toBe(true);
      expect(isPrimaryClass("6")).toBe(false);
      expect(isPrimaryClass("7")).toBe(false);
      expect(isPrimaryClass("8")).toBe(false);
      expect(isPrimaryClass("invalid")).toBe(false);
    });
  });
});

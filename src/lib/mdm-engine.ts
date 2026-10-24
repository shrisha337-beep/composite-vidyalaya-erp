/**
 * Pure calculation functions for the Mid-Day Meal (MDM) engine.
 * Implements Uttar Pradesh Basic Shiksha Parishad statutory rules.
 */

export interface MDMRates {
  grainPrimaryGrams: number;      // Statutory standard: 100g
  grainJuniorGrams: number;       // Statutory standard: 150g
  conversionCostPrimary: number;  // Standard: ₹6.78
  conversionCostJunior: number;   // Standard: ₹10.17
  fruitCostPerStudent: number;    // Standard: ₹4.00
  nutritionCostPerStudent: number;// Standard: ₹5.00
  milkMlPrimary: number;          // Standard: 150 mL
  milkMlJunior: number;           // Standard: 200 mL
}

export const DEFAULT_MDM_RATES: MDMRates = {
  grainPrimaryGrams: 100,
  grainJuniorGrams: 150,
  conversionCostPrimary: 6.78,
  conversionCostJunior: 10.17,
  fruitCostPerStudent: 4.0,
  nutritionCostPerStudent: 5.0,
  milkMlPrimary: 150,
  milkMlJunior: 200,
};

export const MILK_ML_PRIMARY = DEFAULT_MDM_RATES.milkMlPrimary;
export const MILK_ML_JUNIOR = DEFAULT_MDM_RATES.milkMlJunior;

export interface MDMItemsServed {
  rice: boolean;
  wheat: boolean;
  fruits: boolean;
  nutrition: boolean;
  milk: boolean;
}

export interface DailyTierInput {
  presentStudents: number;
  fruitsEaten?: number;
}

export interface TierMDMResult {
  present: number;
  wheatGrams: number;
  riceGrams: number;
  wheatKg: number;
  riceKg: number;
  fruitsEaten: number;
  fruitCost: number;
  conversionCost: number;
  nutritionCost: number;
  milkStudents: number;
  milkLitres: number;
}

export interface CombinedMDMResult {
  primary: TierMDMResult;
  junior: TierMDMResult;
  totalPresent: number;
  totalWheatKg: number;
  totalRiceKg: number;
  totalConversionCost: number;
  totalFruitCost: number;
  totalNutritionCost: number;
  totalMilkLitres: number;
  grandTotalCost: number;
}

export function isPrimaryClass(className: string): boolean {
  return ["1", "2", "3", "4", "5"].includes(String(className).trim());
}

/**
 * Calculates daily MDM quantities and costs for a single tier (Primary or Junior).
 */
export function calculateTierMDM(
  tier: "primary" | "junior",
  input: DailyTierInput,
  items: MDMItemsServed,
  rates: MDMRates = DEFAULT_MDM_RATES
): TierMDMResult {
  const present = Math.max(0, input.presentStudents);
  const grainGrams = tier === "primary" ? rates.grainPrimaryGrams : rates.grainJuniorGrams;
  const conversionRate = tier === "primary" ? rates.conversionCostPrimary : rates.conversionCostJunior;
  const milkMl = tier === "primary" ? rates.milkMlPrimary : rates.milkMlJunior;

  // Grain calculations
  const wheatGrams = items.wheat ? present * grainGrams : 0;
  const riceGrams = items.rice ? present * grainGrams : 0;
  const wheatKg = Math.round((wheatGrams / 1000) * 100) / 100;
  const riceKg = Math.round((riceGrams / 1000) * 100) / 100;

  // Fruit calculations
  const fruitsEaten = items.fruits ? Math.min(present, Math.max(0, input.fruitsEaten ?? present)) : 0;
  const fruitCost = Math.round(fruitsEaten * rates.fruitCostPerStudent * 100) / 100;

  // Conversion & Nutrition cost
  const conversionCost = present > 0 ? Math.round(present * conversionRate * 100) / 100 : 0;
  const nutritionCost = items.nutrition && present > 0 ? Math.round(present * rates.nutritionCostPerStudent * 100) / 100 : 0;

  // Milk volume
  const milkStudents = items.milk ? present : 0;
  const milkLitres = items.milk ? Math.round(((present * milkMl) / 1000) * 100) / 100 : 0;

  return {
    present,
    wheatGrams,
    riceGrams,
    wheatKg,
    riceKg,
    fruitsEaten,
    fruitCost,
    conversionCost,
    nutritionCost,
    milkStudents,
    milkLitres,
  };
}

/**
 * Calculates school-wide combined MDM values across Primary (1-5) and Junior (6-8).
 */
export function calculateSchoolMDM(
  primaryInput: DailyTierInput,
  juniorInput: DailyTierInput,
  items: MDMItemsServed,
  rates: MDMRates = DEFAULT_MDM_RATES
): CombinedMDMResult {
  const primary = calculateTierMDM("primary", primaryInput, items, rates);
  const junior = calculateTierMDM("junior", juniorInput, items, rates);

  const totalPresent = primary.present + junior.present;
  const totalWheatKg = Math.round((primary.wheatKg + junior.wheatKg) * 100) / 100;
  const totalRiceKg = Math.round((primary.riceKg + junior.riceKg) * 100) / 100;
  const totalConversionCost = Math.round((primary.conversionCost + junior.conversionCost) * 100) / 100;
  const totalFruitCost = Math.round((primary.fruitCost + junior.fruitCost) * 100) / 100;
  const totalNutritionCost = Math.round((primary.nutritionCost + junior.nutritionCost) * 100) / 100;
  const totalMilkLitres = Math.round((primary.milkLitres + junior.milkLitres) * 100) / 100;
  const grandTotalCost = Math.round((totalConversionCost + totalFruitCost + totalNutritionCost) * 100) / 100;

  return {
    primary,
    junior,
    totalPresent,
    totalWheatKg,
    totalRiceKg,
    totalConversionCost,
    totalFruitCost,
    totalNutritionCost,
    totalMilkLitres,
    grandTotalCost,
  };
}

export const calculateMDMDayTotal = calculateSchoolMDM;

export interface GrainLedger {
  openingBalanceKg: number;
  receivedKg: number;
  consumedKg: number;
  closingBalanceKg: number;
}

/**
 * Reconciles monthly food grain inventory with carry-over.
 */
export function calculateGrainStock(
  openingBalanceKg: number,
  receivedKg: number,
  consumedKg: number
): GrainLedger {
  const safeOpening = Math.max(0, openingBalanceKg);
  const safeReceived = Math.max(0, receivedKg);
  const safeConsumed = Math.max(0, consumedKg);
  const closingBalanceKg = Math.round((safeOpening + safeReceived - safeConsumed) * 100) / 100;

  return {
    openingBalanceKg: safeOpening,
    receivedKg: safeReceived,
    consumedKg: safeConsumed,
    closingBalanceKg,
  };
}

export const calculateStockLedger = calculateGrainStock;

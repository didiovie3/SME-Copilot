/**
 * Payroll Utility functions for Uruvia.
 * Manual deduction calculations.
 */

/**
 * Calculates Net Pay based on manual deductions.
 */
export function calculateNetPay(gross: number, tax: number = 0, pension: number = 0, other: number = 0): number {
  return (Number(gross) || 0) - (Number(tax) || 0) - (Number(pension) || 0) - (Number(other) || 0);
}

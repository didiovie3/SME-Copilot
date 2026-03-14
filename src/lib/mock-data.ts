import type { Business, Transaction, InventoryItem } from './types';

/**
 * Hardcoded mock data has been removed to provide a clean starting state.
 * All business and transaction data is now managed exclusively through 
 * the live Firebase Firestore database.
 */

export const mockBusinesses: Business[] = [];

export const mockTransactions: Transaction[] = [];

export const mockInventory: InventoryItem[] = [];

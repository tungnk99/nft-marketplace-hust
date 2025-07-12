import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions for royalty fee conversion
export function formatRoyaltyFee(percentage: number): string {
  return `${percentage}%`;
}

/**
 * Format an integer-cents amount as a USD string.
 * Example: 4250 → "$42.50"
 */
export function formatCredits(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Calculate the platform deposit fee and net credits received.
 * Default fee rate is 7.5%.
 */
export function calculateFee(
  depositCents: number,
  feeRate = 0.075,
): { fee: number; net: number } {
  const fee = Math.round(depositCents * feeRate);
  return { fee, net: depositCents - fee };
}

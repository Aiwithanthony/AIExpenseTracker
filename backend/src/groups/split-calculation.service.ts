import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class SplitCalculationService {
  /**
   * Calculate split amounts for EQUAL split.
   * Divides evenly and assigns rounding remainder to the payer's share.
   */
  calculateEqualSplit(
    totalAmount: number,
    participantIds: string[],
    payerId: string,
  ): Map<string, number> {
    const count = participantIds.length;
    if (count === 0) {
      throw new BadRequestException('At least one participant required');
    }

    const perPerson = Math.floor((totalAmount * 100) / count) / 100;
    const remainder = Math.round((totalAmount - perPerson * count) * 100) / 100;

    const splits = new Map<string, number>();
    for (const id of participantIds) {
      splits.set(id, perPerson);
    }

    // Assign rounding remainder to the payer if they are a participant, otherwise first participant
    if (remainder > 0) {
      const target = participantIds.includes(payerId) ? payerId : participantIds[0];
      const current = splits.get(target) || 0;
      splits.set(target, Math.round((current + remainder) * 100) / 100);
    }

    return splits;
  }

  /**
   * Validate that EXACT split amounts sum to the total expense amount.
   */
  validateExactSplit(totalAmount: number, splits: Map<string, number>): boolean {
    const sum = Array.from(splits.values()).reduce((a, b) => a + b, 0);
    return Math.abs(sum - totalAmount) < 0.01;
  }

  /**
   * Convert PERCENTAGE split to absolute amounts.
   * Validates percentages sum to 100%. Handles rounding by assigning remainder to last participant.
   */
  calculatePercentageSplit(
    totalAmount: number,
    percentages: Map<string, number>,
  ): Map<string, number> {
    const totalPct = Array.from(percentages.values()).reduce((a, b) => a + b, 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new BadRequestException('Percentages must sum to 100');
    }

    const amounts = new Map<string, number>();
    let allocated = 0;
    const entries = Array.from(percentages.entries());

    for (let i = 0; i < entries.length - 1; i++) {
      const amount = Math.round((totalAmount * entries[i][1]) / 100 * 100) / 100;
      amounts.set(entries[i][0], amount);
      allocated += amount;
    }

    // Last person gets remainder to handle rounding
    const lastEntry = entries[entries.length - 1];
    amounts.set(lastEntry[0], Math.round((totalAmount - allocated) * 100) / 100);

    return amounts;
  }

  /**
   * Debt simplification algorithm (Greedy matching).
   *
   * Input: net balances per user (positive = net creditor, negative = net debtor)
   * Output: minimal set of transactions to settle all debts.
   *
   * Algorithm:
   * 1. Separate into creditors (positive balance) and debtors (negative balance)
   * 2. Sort both descending by absolute value
   * 3. Match largest debtor with largest creditor
   * 4. Create transaction for min(|debtor|, |creditor|)
   * 5. Update balances and repeat
   */
  simplifyDebts(
    netBalances: Map<string, number>,
  ): Array<{ from: string; to: string; amount: number }> {
    const creditors: Array<{ userId: string; amount: number }> = [];
    const debtors: Array<{ userId: string; amount: number }> = [];

    for (const [userId, balance] of netBalances) {
      const rounded = Math.round(balance * 100) / 100;
      if (rounded > 0.005) {
        creditors.push({ userId, amount: rounded });
      } else if (rounded < -0.005) {
        debtors.push({ userId, amount: -rounded }); // store as positive
      }
    }

    // Sort descending by amount
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions: Array<{ from: string; to: string; amount: number }> = [];

    let ci = 0;
    let di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const settled = Math.min(creditors[ci].amount, debtors[di].amount);
      const roundedSettled = Math.round(settled * 100) / 100;

      if (roundedSettled > 0) {
        transactions.push({
          from: debtors[di].userId,
          to: creditors[ci].userId,
          amount: roundedSettled,
        });
      }

      creditors[ci].amount = Math.round((creditors[ci].amount - settled) * 100) / 100;
      debtors[di].amount = Math.round((debtors[di].amount - settled) * 100) / 100;

      if (creditors[ci].amount < 0.005) ci++;
      if (debtors[di].amount < 0.005) di++;
    }

    return transactions;
  }
}

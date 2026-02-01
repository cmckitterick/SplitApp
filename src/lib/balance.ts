import Decimal from "decimal.js";

export interface ExpenseData {
  paidBy: string;
  totalAmount: string | number;
  splits: { userId: string; amount: string | number }[];
}

export interface SettlementData {
  payerId: string;
  payeeId: string;
  amount: string | number;
}

export interface SettlementSuggestion {
  from: string;
  to: string;
  amount: string;
}

/**
 * Computes the net balance for each user in a group.
 * Positive balance = user is owed money (creditor).
 * Negative balance = user owes money (debtor).
 */
export function computeBalances(
  expenses: ExpenseData[],
  settlements: SettlementData[]
): Map<string, Decimal> {
  const balances = new Map<string, Decimal>();

  const getBalance = (userId: string): Decimal => {
    return balances.get(userId) ?? new Decimal(0);
  };

  // Process expenses
  for (const expense of expenses) {
    const payerId = expense.paidBy;

    // The payer paid the total amount, so they are owed money
    balances.set(
      payerId,
      getBalance(payerId).plus(new Decimal(expense.totalAmount))
    );

    // Each person in the split owes their share
    for (const split of expense.splits) {
      balances.set(
        split.userId,
        getBalance(split.userId).minus(new Decimal(split.amount))
      );
    }
  }

  // Process settlements: payer paid payee, reducing payer's debt / payee's credit
  for (const settlement of settlements) {
    const amount = new Decimal(settlement.amount);
    // Payer made a payment -> their balance goes up (less debt or more credit)
    balances.set(
      settlement.payerId,
      getBalance(settlement.payerId).plus(amount)
    );
    // Payee received a payment -> their balance goes down (less credit or more debt)
    balances.set(
      settlement.payeeId,
      getBalance(settlement.payeeId).minus(amount)
    );
  }

  return balances;
}

/**
 * Greedy debt simplification algorithm.
 * Minimizes the number of transactions to settle all debts.
 *
 * Sort into debtors (negative balance) and creditors (positive balance).
 * Repeatedly match the largest debtor with the largest creditor,
 * transfer min(abs(debtor), creditor), and remove whichever hits zero.
 */
export function computeSettlements(
  balances: Map<string, Decimal>
): SettlementSuggestion[] {
  const debtors: { userId: string; amount: Decimal }[] = [];
  const creditors: { userId: string; amount: Decimal }[] = [];

  // Threshold for considering a balance as zero (to handle rounding)
  const EPSILON = new Decimal("0.01");

  balances.forEach((balance, userId) => {
    if (balance.lessThan(EPSILON.negated())) {
      debtors.push({ userId, amount: balance.abs() });
    } else if (balance.greaterThan(EPSILON)) {
      creditors.push({ userId, amount: balance });
    }
  });

  // Sort descending by amount
  debtors.sort((a, b) => b.amount.comparedTo(a.amount));
  creditors.sort((a, b) => b.amount.comparedTo(a.amount));

  const suggestions: SettlementSuggestion[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const transferAmount = Decimal.min(debtor.amount, creditor.amount);

    if (transferAmount.greaterThan(0)) {
      suggestions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: transferAmount.toFixed(2),
      });
    }

    debtor.amount = debtor.amount.minus(transferAmount);
    creditor.amount = creditor.amount.minus(transferAmount);

    if (debtor.amount.lessThanOrEqualTo(EPSILON)) {
      i++;
    }
    if (creditor.amount.lessThanOrEqualTo(EPSILON)) {
      j++;
    }
  }

  return suggestions;
}

/**
 * Helper to convert balance map to a plain object with string amounts.
 */
export function balancesToRecord(
  balances: Map<string, Decimal>
): Record<string, string> {
  const result: Record<string, string> = {};
  balances.forEach((balance, userId) => {
    result[userId] = balance.toFixed(2);
  });
  return result;
}

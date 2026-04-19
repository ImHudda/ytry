export type Currency = "INR" | "USD" | "EUR" | "GBP" | "THB" | "SGD" | "AED" | "JPY" | (string & {});

export type BucketKind = "lavish" | "investment" | "custom";

export interface Bucket {
  id: string;
  name: string;
  kind: BucketKind;
  monthlyCapINR: number | null;
  weeklyCapINR: number | null;
  locked: boolean;
  color: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Counterparty {
  id: string;
  name: string;
  preferredCurrency: Currency | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type LoanDirection = "given" | "received";

export interface Loan {
  id: string;
  counterpartyId: string;
  direction: LoanDirection;
  principalAmount: number;
  principalCurrency: Currency;
  repaidAmount: number;
  interestRatePct: number | null;
  openedAt: string;
  dueAt: string | null;
  closedAt: string | null;
  linkedConversionId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversion {
  id: string;
  sourceCurrency: Currency;
  sourceAmount: number;
  targetCurrency: Currency;
  targetAmount: number;
  rateUsed: number;
  counterpartyId: string | null;
  linkedLoanId: string | null;
  occurredAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type StatementSource = "bank" | "credit_card" | "upi";

export interface Statement {
  id: string;
  source: StatementSource;
  issuer: string;
  fileHash: string;
  periodStart: string;
  periodEnd: string;
  parseStatus: "pending" | "parsed" | "error";
  uploadedAt: string;
}

export interface RawEntry {
  id: string;
  statementId: string;
  extractedAmount: number;
  extractedCurrency: Currency;
  extractedDate: string;
  extractedPayee: string;
  extractedRef: string | null;
  direction: "debit" | "credit";
  rawRow: string;
  dedupKey: string;
  matchedTransactionId: string | null;
}

export interface Transaction {
  id: string;
  occurredAt: string;
  bucketId: string | null;
  categoryId: string | null;
  payee: string;
  notes: string;
  originalCurrency: Currency;
  originalAmount: number;
  baseAmountINR: number;
  rateUsed: number;
  counterpartyId: string | null;
  conversionId: string | null;
  loanId: string | null;
  sourceEntryIds: string[];
  primarySourceEntryId: string | null;
  ruleHitId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Rule {
  id: string;
  description: string;
  matchType: "payee_contains" | "payee_equals" | "amount_range" | "source";
  matchValue: string;
  setBucketId: string | null;
  setCategoryId: string | null;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhoopWeek {
  id: string;
  weekStart: string;
  avgRecovery: number | null;
  avgSleepPerformance: number | null;
  aggregateHealthScore: number | null;
  derivedLavishCapINR: number | null;
  source: "manual" | "csv" | "api";
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  createdAt: string;
}

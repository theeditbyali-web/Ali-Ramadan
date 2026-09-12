import type { AccountType } from "@prisma/client";

export const DEFAULT_ACCOUNTS: {
  code: string;
  name: string;
  type: AccountType;
}[] = [
  { code: "1000", name: "Cash", type: "ASSET" },
  { code: "1010", name: "Bank Account", type: "ASSET" },
  { code: "1200", name: "Accounts Receivable", type: "ASSET" },
  { code: "1400", name: "Inventory", type: "ASSET" },
  { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
  { code: "2100", name: "VAT Payable", type: "LIABILITY" },
  { code: "2200", name: "NSSF Payable", type: "LIABILITY" },
  { code: "2300", name: "Payroll Payable", type: "LIABILITY" },
  { code: "3000", name: "Owner's Equity", type: "EQUITY" },
  { code: "3900", name: "Retained Earnings", type: "EQUITY" },
  { code: "4000", name: "Sales Revenue", type: "REVENUE" },
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
  { code: "6000", name: "Payroll Expense", type: "EXPENSE" },
  { code: "6100", name: "Rent Expense", type: "EXPENSE" },
  { code: "6200", name: "Utilities Expense", type: "EXPENSE" },
  { code: "6900", name: "General Expenses", type: "EXPENSE" },
];

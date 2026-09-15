export type AccountClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
export type AccountKind = 'BANK' | 'CASH' | 'WALLET' | 'COUNTERPARTY' | 'GENERAL' | 'PERSON';

export interface AccountOption {
  id: string;
  name: string;
  code: string;
  accountClass: string;
  accountKind: string;
  isPostable: boolean;
  parentId?: string | null;
  currentBalance?: string;
  isSystem?: boolean;
  icon?: string | null;
  color?: string | null;
  isFavorite?: boolean;
}

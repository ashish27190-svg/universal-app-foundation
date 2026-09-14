import type {
  AssetServiceRecord,
  CurrencyCode,
  DomainValidationIssue,
  HouseholdAsset,
  LocalDate,
  MoneyAmount,
} from './types.js';

const ISO_LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_CURRENCY = /^[A-Z]{3}$/;

export function isLocalDate(value: string): value is LocalDate {
  if (!ISO_LOCAL_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}

export function normalizeCurrency(value: string): CurrencyCode {
  return value.trim().toUpperCase();
}

export function validateMoney(value: MoneyAmount | null, field: string): DomainValidationIssue[] {
  if (value === null) return [];
  const issues: DomainValidationIssue[] = [];
  if (!Number.isSafeInteger(value.amountMinor) || value.amountMinor < 0) {
    issues.push({ code: 'MONEY_AMOUNT_INVALID', severity: 'error', field, message: 'Amount must be a non-negative integer in minor currency units.' });
  }
  if (!ISO_CURRENCY.test(value.currency)) {
    issues.push({ code: 'CURRENCY_INVALID', severity: 'error', field, message: 'Currency must be a three-letter uppercase ISO-style code.' });
  }
  return issues;
}

function validateOptionalDate(value: LocalDate | null, field: string): DomainValidationIssue[] {
  if (value === null) return [];
  return isLocalDate(value)
    ? []
    : [{ code: 'DATE_INVALID', severity: 'error', field, message: 'Date must be a valid YYYY-MM-DD calendar date.' }];
}

export function validateHouseholdAsset(asset: HouseholdAsset): DomainValidationIssue[] {
  const issues: DomainValidationIssue[] = [];
  if (!asset.name.trim()) {
    issues.push({ code: 'ASSET_NAME_REQUIRED', severity: 'error', field: 'name', message: 'Asset name is required.' });
  }
  if (asset.name.trim().length > 120) {
    issues.push({ code: 'ASSET_NAME_TOO_LONG', severity: 'error', field: 'name', message: 'Asset name must be 120 characters or fewer.' });
  }
  issues.push(...validateOptionalDate(asset.purchaseDate, 'purchaseDate'));
  issues.push(...validateOptionalDate(asset.warrantyExpiresOn, 'warrantyExpiresOn'));
  issues.push(...validateMoney(asset.purchasePrice, 'purchasePrice'));
  if (asset.notes && asset.notes.length > 5000) {
    issues.push({ code: 'ASSET_NOTES_TOO_LONG', severity: 'error', field: 'notes', message: 'Notes must be 5000 characters or fewer.' });
  }
  if (asset.purchaseDate && asset.warrantyExpiresOn && isLocalDate(asset.purchaseDate) && isLocalDate(asset.warrantyExpiresOn) && asset.warrantyExpiresOn < asset.purchaseDate) {
    issues.push({ code: 'WARRANTY_BEFORE_PURCHASE', severity: 'warning', field: 'warrantyExpiresOn', message: 'Warranty expiry is earlier than the purchase date. Review the dates.' });
  }
  return issues;
}

export function validateServiceRecord(record: AssetServiceRecord): DomainValidationIssue[] {
  const issues: DomainValidationIssue[] = [];
  if (!isLocalDate(record.serviceDate)) {
    issues.push({ code: 'SERVICE_DATE_INVALID', severity: 'error', field: 'serviceDate', message: 'Service date must be a valid YYYY-MM-DD date.' });
  }
  issues.push(...validateMoney(record.cost, 'cost'));
  if (record.provider && record.provider.length > 160) {
    issues.push({ code: 'SERVICE_PROVIDER_TOO_LONG', severity: 'error', field: 'provider', message: 'Provider must be 160 characters or fewer.' });
  }
  if (record.notes && record.notes.length > 5000) {
    issues.push({ code: 'SERVICE_NOTES_TOO_LONG', severity: 'error', field: 'notes', message: 'Notes must be 5000 characters or fewer.' });
  }
  return issues;
}

export function hasBlockingIssues(issues: readonly DomainValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

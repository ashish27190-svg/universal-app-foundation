# Household Assets Domain

The first UAF reference domain. It is intentionally independent from React, Supabase and PowerSync.

## Entities
- `HouseholdAsset`
- `AssetServiceRecord`

## Calculations
- Warranty Status v1
- Lifetime Service Cost v1 (separate totals by currency; no hidden FX conversion)

## Data representation
Money uses integer minor units plus a three-letter currency code. Calendar-only dates use `YYYY-MM-DD` strings and are validated as real dates.

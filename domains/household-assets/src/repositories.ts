import type { Repository } from '@uaf/data';
import type { AssetServiceRecord, HouseholdAsset } from './types.js';

export type HouseholdAssetRepository = Repository<HouseholdAsset>;
export type AssetServiceRecordRepository = Repository<AssetServiceRecord>;

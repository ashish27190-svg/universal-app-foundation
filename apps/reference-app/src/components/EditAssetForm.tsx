import { useMemo, useState, type FormEvent } from 'react';
import type { IsoDateTime, UserId } from '@uaf/core';
import {
  hasBlockingIssues,
  validateHouseholdAsset,
  type AssetCategory,
  type HouseholdAsset,
} from '@uaf/household-assets';
import { Button, DateInput, FormField, Select, TextArea, TextInput } from '@uaf/ui';

export interface EditAssetFormProps {
  asset: HouseholdAsset;
  actorId: UserId;
  onSave: (asset: HouseholdAsset) => Promise<void>;
  onCancel: () => void;
}

export function EditAssetForm({ asset, actorId, onSave, onCancel }: EditAssetFormProps) {
  const [name, setName] = useState(asset.name);
  const [category, setCategory] = useState<AssetCategory>(asset.category);
  const [purchaseDate, setPurchaseDate] = useState(asset.purchaseDate ?? '');
  const [warrantyExpiresOn, setWarrantyExpiresOn] = useState(asset.warrantyExpiresOn ?? '');
  const [notes, setNotes] = useState(asset.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const candidate = useMemo<HouseholdAsset>(() => ({
    ...asset,
    name: name.trim(),
    category,
    purchaseDate: purchaseDate || null,
    warrantyExpiresOn: warrantyExpiresOn || null,
    notes: notes.trim() || null,
    updatedAt: new Date().toISOString() as IsoDateTime,
    updatedBy: actorId,
  }), [asset, actorId, category, name, notes, purchaseDate, warrantyExpiresOn]);

  const issues = useMemo(() => validateHouseholdAsset(candidate), [candidate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitAttempted(true);
    setSaveError(null);
    if (hasBlockingIssues(issues)) return;

    setBusy(true);
    try {
      await onSave(candidate);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Asset could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="vault-form" onSubmit={(event) => { void submit(event); }}>
      <FormField label="Asset name" htmlFor={`asset-name-${String(asset.id)}`} required>
        <TextInput
          id={`asset-name-${String(asset.id)}`}
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </FormField>
      <FormField label="Category" htmlFor={`asset-category-${String(asset.id)}`} required>
        <Select
          id={`asset-category-${String(asset.id)}`}
          value={category}
          onChange={(event) => setCategory(event.target.value as AssetCategory)}
        >
          <option value="appliance">Appliance</option>
          <option value="electronics">Electronics</option>
          <option value="furniture">Furniture</option>
          <option value="other">Other</option>
        </Select>
      </FormField>
      <div className="vault-form-grid">
        <FormField label="Purchase date" htmlFor={`purchase-date-${String(asset.id)}`}>
          <DateInput
            id={`purchase-date-${String(asset.id)}`}
            value={purchaseDate}
            onChange={(event) => setPurchaseDate(event.target.value)}
          />
        </FormField>
        <FormField label="Warranty expires" htmlFor={`warranty-date-${String(asset.id)}`}>
          <DateInput
            id={`warranty-date-${String(asset.id)}`}
            value={warrantyExpiresOn}
            onChange={(event) => setWarrantyExpiresOn(event.target.value)}
          />
        </FormField>
      </div>
      <FormField label="Notes" htmlFor={`asset-notes-${String(asset.id)}`}>
        <TextArea
          id={`asset-notes-${String(asset.id)}`}
          maxLength={5000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </FormField>
      {submitAttempted && issues.length ? (
        <ul className="vault-validation" aria-live="polite">
          {issues.map((issue) => <li key={`${issue.code}-${issue.field ?? ''}`}>{issue.message}</li>)}
        </ul>
      ) : null}
      {saveError ? <p className="vault-inline-error" role="alert">{saveError}</p> : null}
      <div className="vault-actions">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={busy}>Save changes</Button>
      </div>
    </form>
  );
}

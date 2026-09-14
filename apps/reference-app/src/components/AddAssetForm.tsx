import { useState, type FormEvent } from 'react';
import type { EntityId, IsoDateTime, UserId, WorkspaceId } from '@uaf/core';
import {
  buildNewHouseholdAsset,
  hasBlockingIssues,
  type AssetCategory,
  type HouseholdAsset,
  type LocalDate,
} from '@uaf/household-assets';
import { Button, DateInput, FormField, Select, TextArea, TextInput } from '@uaf/ui';

export interface AddAssetFormProps {
  workspaceId: WorkspaceId;
  actorId: UserId;
  onCreate: (asset: HouseholdAsset) => Promise<void>;
  onCancel?: () => void;
}

export function AddAssetForm({ workspaceId, actorId, onCreate, onCancel }: AddAssetFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('appliance');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyExpiresOn, setWarrantyExpiresOn] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<readonly string[]>([]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString() as IsoDateTime;
    const { entity, issues } = buildNewHouseholdAsset(
      {
        name,
        category,
        purchaseDate: purchaseDate ? (purchaseDate as LocalDate) : null,
        warrantyExpiresOn: warrantyExpiresOn ? (warrantyExpiresOn as LocalDate) : null,
        notes: notes || null,
      },
      {
        id: crypto.randomUUID() as EntityId,
        workspaceId,
        actorId,
        now,
      },
    );

    setMessages(issues.map((issue) => issue.message));
    if (hasBlockingIssues(issues)) return;

    setBusy(true);
    try {
      await onCreate(entity);
      setName('');
      setPurchaseDate('');
      setWarrantyExpiresOn('');
      setNotes('');
      setMessages([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="vault-form" onSubmit={submit}>
      <FormField label="Asset name" htmlFor="asset-name" required>
        <TextInput id="asset-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Living room TV" />
      </FormField>
      <FormField label="Category" htmlFor="asset-category" required>
        <Select id="asset-category" value={category} onChange={(event) => setCategory(event.target.value as AssetCategory)}>
          <option value="appliance">Appliance</option>
          <option value="electronics">Electronics</option>
          <option value="furniture">Furniture</option>
          <option value="other">Other</option>
        </Select>
      </FormField>
      <div className="vault-form-grid">
        <FormField label="Purchase date" htmlFor="purchase-date">
          <DateInput id="purchase-date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
        </FormField>
        <FormField label="Warranty expires" htmlFor="warranty-date">
          <DateInput id="warranty-date" value={warrantyExpiresOn} onChange={(event) => setWarrantyExpiresOn(event.target.value)} />
        </FormField>
      </div>
      <FormField label="Notes" htmlFor="asset-notes">
        <TextArea id="asset-notes" maxLength={5000} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </FormField>
      {messages.length ? (
        <ul className="vault-validation" aria-live="polite">
          {messages.map((message) => <li key={message}>{message}</li>)}
        </ul>
      ) : null}
      <div className="vault-actions">
        {onCancel ? <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button> : null}
        <Button type="submit" loading={busy}>Save asset</Button>
      </div>
    </form>
  );
}

import { useState, type FormEvent } from 'react';
import { Button, Card, ErrorState, FormField, TextInput } from '@uaf/ui';
import { uafServices } from '../services';

export function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'sign-in') {
        await uafServices.auth.signInWithPassword({ email: email.trim(), password });
      } else {
        const session = await uafServices.auth.signUpWithPassword({
          email: email.trim(),
          password,
          ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
        });
        if (!session) {
          setMessage('Account created. Check your email to complete sign-in if confirmation is enabled.');
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="vault-auth-shell">
      <Card className="vault-auth-card">
        <div className="vault-brand-mark" aria-hidden="true">HV</div>
        <h1>Household Vault</h1>
        <p className="vault-muted">The UAF reference app for reliable offline-first household records.</p>
        {error ? <ErrorState title="Could not continue" description={error} /> : null}
        {message ? <div className="vault-callout" role="status">{message}</div> : null}
        <form className="vault-form" onSubmit={(event) => { void submit(event); }}>
          {mode === 'sign-up' ? (
            <FormField label="Name" htmlFor="display-name">
              <TextInput id="display-name" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </FormField>
          ) : null}
          <FormField label="Email" htmlFor="email" required>
            <TextInput id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </FormField>
          <FormField label="Password" htmlFor="password" required>
            <TextInput id="password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
          </FormField>
          <Button type="submit" loading={busy}>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</Button>
        </form>
        <Button variant="ghost" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(null); setMessage(null); }}>
          {mode === 'sign-in' ? 'Create an account' : 'Already have an account'}
        </Button>
      </Card>
    </main>
  );
}

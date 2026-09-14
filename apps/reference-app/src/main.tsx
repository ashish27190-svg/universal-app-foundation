import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@uaf/ui/styles.css';
import './styles.css';
import { App } from './App';
import { householdVaultManifest } from './app-manifest';
import { initializeMonitoring, MonitoringErrorBoundary } from './monitoring';
import { runtimeEnvironment } from './services';

initializeMonitoring(runtimeEnvironment, householdVaultManifest);

const root = document.getElementById('root');
if (!root) throw new Error('Household Vault root element was not found.');

createRoot(root).render(
  <StrictMode>
    <MonitoringErrorBoundary>
      <App />
    </MonitoringErrorBoundary>
  </StrictMode>,
);

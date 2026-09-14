import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button, Toast } from '@uaf/ui';

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (needRefresh) {
    return (
      <div className="vault-update-toast">
        <Toast
          title="Update available"
          description="Update when you are ready. The app will not reload itself while you are editing."
          onDismiss={() => setNeedRefresh(false)}
        />
        <Button size="sm" onClick={() => void updateServiceWorker(true)}>Update app</Button>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="vault-update-toast">
        <Toast
          title="Ready offline"
          description="The application shell is available without a network connection."
          onDismiss={() => setOfflineReady(false)}
        />
      </div>
    );
  }

  return null;
}

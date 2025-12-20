import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { RoninLoader } from '@/components/RoninLoader';
import { AppShell } from '@/components/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { Settings } from '@/pages/Settings';
import { TestContextPanel } from '@/pages/TestContextPanel';
import { Toaster } from 'sonner';

function App() {
  const [loadingComplete, setLoadingComplete] = useState(false);
  const handleLoadingComplete = useCallback(() => setLoadingComplete(true), []);

  if (!loadingComplete) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="ronin-ui-theme">
        <RoninLoader onComplete={handleLoadingComplete} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="ronin-ui-theme">
      <Toaster
        richColors
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "'Work Sans', sans-serif",
          },
        }}
      />
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/test/context-panel" element={<TestContextPanel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

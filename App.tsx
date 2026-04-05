import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { TabsProvider } from './src/contexts/TabsContext';
import { NotificationsProvider } from './src/contexts/NotificationsContext';
import { ToastContainer } from './components/ui/Toast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Login from './pages/system/Login';
import { LoadingScreen } from './components/ui/LoadingScreen';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    // @ts-ignore
    console.log("Electron API status:", !!window.electronAPI);

    // Simulate initial loading time for the splash screen
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <HashRouter>
      <NotificationsProvider>
        <TabsProvider>
          <Routes>
            {/* Standalone Login Page - Public Access */}
            <Route path="/system/login" element={<Login />} />

            {/* Protected Routes - Reguire Auth */}
            <Route element={<ProtectedRoute />}>
              {/* All other routes are handled by the MainLayout's Tab System */}
              <Route path="/*" element={<MainLayout />} />
            </Route>
          </Routes>
          <ToastContainer />
        </TabsProvider>
      </NotificationsProvider>
    </HashRouter>
  );
};

export default App;

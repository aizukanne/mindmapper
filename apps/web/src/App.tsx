import { Routes, Route, Navigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { useAuth } from '@clerk/clerk-react';
import Dashboard from './pages/Dashboard';
import MapEditor from './pages/MapEditor';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function AppContent() {
  const { isLoaded } = useAuth();

  // Show loading while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <Routes>
        {/* Auth routes */}
        <Route path="/sign-in/*" element={<SignIn />} />
        <Route path="/sign-up/*" element={<SignUp />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map/:mapId"
          element={
            <ProtectedRoute>
              <MapEditor />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// Wrapper that handles case when Clerk is not configured
function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}

export default App;

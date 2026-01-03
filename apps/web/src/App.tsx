import { Routes, Route, Navigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { useAuth } from '@clerk/clerk-react';
import Dashboard from './pages/Dashboard';
import MapEditor from './pages/MapEditor';
import FamilyTreeDashboard from './pages/FamilyTreeDashboard';
import FamilyTreeEditor from './pages/FamilyTreeEditor';
import AcceptInvitation from './pages/AcceptInvitation';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function AppContentWithAuth() {
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

        {/* Public invitation route */}
        <Route path="/invitations/:invitationId" element={<AcceptInvitation />} />

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
        <Route
          path="/family-trees"
          element={
            <ProtectedRoute>
              <FamilyTreeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family-tree/:treeId"
          element={
            <ProtectedRoute>
              <FamilyTreeEditor />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// Content without auth - direct access
function AppContentWithoutAuth() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Routes>
        {/* Public invitation route */}
        <Route path="/invitations/:invitationId" element={<AcceptInvitation />} />

        {/* Direct access to all routes when auth is disabled */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/map/:mapId" element={<MapEditor />} />
        <Route path="/family-trees" element={<FamilyTreeDashboard />} />
        <Route path="/family-tree/:treeId" element={<FamilyTreeEditor />} />

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
      {CLERK_ENABLED ? <AppContentWithAuth /> : <AppContentWithoutAuth />}
    </ReactFlowProvider>
  );
}

export default App;

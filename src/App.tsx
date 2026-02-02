import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PolicyProvider } from './context/PolicyContext';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import { Signup } from './pages/Signup';
import { AddPolicy } from './pages/AddPolicy';
import { Policies } from './pages/Policies';
import { Dashboard } from './pages/Dashboard';
import { Reminders } from './pages/Reminders';
import { Claims } from './pages/Claims';
import { ActivityLogPage } from './pages/ActivityLog';
import { RestorePage } from './pages/RestorePage';
import { LapsedPoliciesPage } from './pages/LapsedPolicies';
import { Support } from './pages/Support';
import { TaskManagement } from './pages/TaskManagement';
import { Commissions } from './pages/Commissions';
import { GroupHeads } from './pages/GroupHeads';
import { AdminPanel } from './pages/AdminPanel';
import { Profile } from './pages/Profile';
import { ClientFolders } from './pages/ClientFolders';
import { LeadsManagement } from './pages/LeadsManagement';
import { LeadsDashboard } from './pages/LeadsDashboard';
import { FollowUpLeads } from './pages/FollowUpLeads';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PolicyProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminPanel />
                  </ProtectedRoute>
                } />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Policies />} />
                  <Route path="add-policy" element={<AddPolicy />} />
                  <Route path="policies" element={<Policies />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="client-folders" element={<ClientFolders />} />
                  <Route path="leads" element={<LeadsManagement />} />
                  <Route path="leads-dashboard" element={<LeadsDashboard />} />
                  <Route path="follow-up-leads" element={<FollowUpLeads />} />
                  <Route path="reminders" element={<Reminders />} />
                  <Route path="claims" element={<Claims />} />
                  <Route path="commissions" element={<Commissions />} />
                  <Route path="group-heads" element={<GroupHeads />} />
                  <Route path="activity-log" element={<ActivityLogPage />} />
                  <Route path="restore" element={<RestorePage />} />
                  <Route path="lapsed-policies" element={<LapsedPoliciesPage />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="support" element={<Support />} />
                  <Route path="tasks" element={<TaskManagement />} />
                </Route>
              </Routes>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'var(--toast-bg)',
                    color: 'var(--toast-color)',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </PolicyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
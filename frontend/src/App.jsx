import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import DonorDashboard from './pages/donor/Dashboard';
import DonorDonate from './pages/donor/Donate';
import NGODashboard from './pages/ngo/Dashboard';
import VolunteerDashboard from './pages/volunteer/Dashboard';
import VolunteerTasks from './pages/volunteer/Tasks';
import MyDonations from './pages/donor/MyDonations';
import NGODonations from './pages/ngo/Donations';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminDonations from './pages/admin/Donations';
import AdminTasks from './pages/admin/Tasks';
import CampaignList from './pages/campaigns/CampaignList';
import CampaignDetail from './pages/campaigns/CampaignDetail';
import CreateCampaign from './pages/campaigns/CreateCampaign';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}/dashboard`} />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Donor */}
          <Route path="/donor/dashboard" element={
            <ProtectedRoute allowedRoles={['donor']}><DonorDashboard /></ProtectedRoute>
          } />
          <Route path="/donor/donate" element={
            <ProtectedRoute allowedRoles={['donor']}><DonorDonate /></ProtectedRoute>
          } />
          <Route path="/donor/donations" element={
            <ProtectedRoute allowedRoles={['donor']}><MyDonations /></ProtectedRoute>
          } />

          {/* NGO */}
          <Route path="/ngo/dashboard" element={
            <ProtectedRoute allowedRoles={['ngo']}><NGODashboard /></ProtectedRoute>
          } />
          <Route path="/ngo/donations" element={
            <ProtectedRoute allowedRoles={['ngo']}><NGODonations /></ProtectedRoute>
          } />

          {/* Volunteer */}
          <Route path="/volunteer/dashboard" element={
            <ProtectedRoute allowedRoles={['volunteer']}><VolunteerDashboard /></ProtectedRoute>
          } />
          <Route path="/volunteer/tasks" element={
            <ProtectedRoute allowedRoles={['volunteer']}><VolunteerTasks /></ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>
          } />
          <Route path="/admin/donations" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDonations /></ProtectedRoute>
          } />
          <Route path="/admin/tasks" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminTasks /></ProtectedRoute>
          } />

          {/* Campaigns */}
          <Route path="/campaigns" element={<CampaignList />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/campaigns/create" element={
            <ProtectedRoute allowedRoles={['ngo', 'admin']}><CreateCampaign /></ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

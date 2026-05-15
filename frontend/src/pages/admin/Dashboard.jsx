import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../utils/api';
import Layout from '../../components/Layout';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, donationsRes] = await Promise.all([
        adminAPI.getDashboard(), adminAPI.getUsers(), adminAPI.getDonations()
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setDonations(donationsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId) => {
    try {
      await adminAPI.verifyUser(userId);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const TABS = ['overview', 'users', 'donations'];

  if (loading) {
    return (
      <Layout title="Admin Panel">
        <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Panel">
      {/* Welcome */}
      <div className="glass-card stat-purple mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Admin Overview</h2>
        <p className="text-white/60 text-sm">Manage users, donations, and platform activity</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all border ${
              activeTab === tab
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && stats && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="glass-card stat-blue">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">Users</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Users', value: stats.users.total, color: 'text-white' },
                { label: 'Donors', value: stats.users.donors, color: 'text-emerald-400' },
                { label: 'Volunteers', value: stats.users.volunteers, color: 'text-blue-400' },
                { label: 'NGOs', value: stats.users.ngos, color: 'text-orange-400' },
                { label: 'Pending Verification', value: stats.users.pendingVerification, color: 'text-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-sm text-white/60">{label}</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card stat-green">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">Donations</h3>
            <div className="space-y-3">
              {[
                { label: 'Total', value: stats.donations.total, color: 'text-white' },
                { label: 'Pending', value: stats.donations.pending, color: 'text-orange-400' },
                { label: 'Accepted', value: stats.donations.accepted, color: 'text-blue-400' },
                { label: 'Delivered', value: stats.donations.delivered, color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-sm text-white/60">{label}</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Name', 'Email', 'Role', 'Verified', 'Actions'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-white/40 font-semibold text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u._id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    className="hover:bg-white/3 transition"
                  >
                    <td className="py-3 px-4 text-white font-medium">{u.name}</td>
                    <td className="py-3 px-4 text-white/60">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full font-semibold capitalize
                        ${u.role === 'donor' ? 'bg-emerald-500/20 text-emerald-300' :
                          u.role === 'ngo' ? 'bg-blue-500/20 text-blue-300' :
                          u.role === 'volunteer' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-purple-500/20 text-purple-300'}
                      `}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.verification?.isVerified ? (
                        <span className="text-emerald-400 text-xs font-semibold">Verified</span>
                      ) : (
                        <span className="text-orange-400 text-xs font-semibold">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {!u.verification?.isVerified && u.role !== 'donor' && (
                        <button
                          onClick={() => handleVerifyUser(u._id)}
                          className="btn-glow btn-sm"
                        >
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Donations */}
      {activeTab === 'donations' && (
        <div className="glass-card">
          <div className="space-y-3">
            {donations.map((donation) => (
              <div key={donation._id} className="item-card">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-white">
                      {donation.foodDetails?.foodType} — {donation.foodDetails?.category}
                    </h4>
                    <p className="text-sm text-white/50 mt-1">
                      By: {donation.donor?.name}
                      {donation.assignedNGO && ` · NGO: ${donation.assignedNGO?.name}`}
                    </p>
                  </div>
                  <span className={`status-${donation.status}`}>{donation.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { donationAPI } from '../../utils/api';
import Layout from '../../components/Layout';

const STATUS_CLASS = {
  pending: 'status-pending',
  accepted: 'status-accepted',
  picked: 'status-picked',
  delivered: 'status-delivered',
};

const DonorDashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0, mealsServed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDonations(); }, []);

  const fetchDonations = async () => {
    try {
      const res = await donationAPI.getAll({ myDonations: 'true' });
      setDonations(res.data);
      const total = res.data.length;
      const pending = res.data.filter(d => d.status === 'pending').length;
      const delivered = res.data.filter(d => d.status === 'delivered').length;
      const mealsServed = res.data.reduce((acc, d) => acc + (d.impact?.mealsServed || 0), 0);
      setStats({ total, pending, delivered, mealsServed });
    } catch (err) {
      console.error('Error fetching donations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Donor Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Donor Dashboard">
      {/* Welcome banner */}
      <div className="glass-card stat-green mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Welcome back, {user?.name}</h2>
          <p className="text-white/60 text-sm">
            {stats.delivered > 0
              ? `Amazing! You helped serve ${stats.mealsServed}+ meals`
              : stats.total > 0
                ? 'Your donations are being processed'
                : 'Start donating and help people in need'}
          </p>
        </div>
        <Link to="/donor/donate" className="btn-glow flex-shrink-0">
          + New Donation
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Donations', value: stats.total, cls: 'stat-green' },
          { label: 'Pending', value: stats.pending, cls: 'stat-orange' },
          { label: 'Delivered', value: stats.delivered, cls: 'stat-blue' },
          { label: 'Meals Served', value: `${stats.mealsServed}+`, cls: 'stat-purple' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`glass-card ${cls} text-center`}>
            <div className="text-3xl font-bold gradient-text">{value}</div>
            <div className="text-white/60 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Donations list */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">My Donations</h3>
          <span className="text-white/40 text-sm">{donations.length} total</span>
        </div>

        {donations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-white/40 mb-4">No donations yet</p>
            <Link to="/donor/donate" className="btn-glow btn-sm">Make your first donation</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {donations.map((donation) => (
              <div key={donation._id} className="item-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-white">{donation.foodDetails?.foodType}</h4>
                      {donation.priority && donation.priority !== 'low' && (
                        <span className={`priority-${donation.priority}`}>{donation.priority}</span>
                      )}
                    </div>
                    <p className="text-sm text-white/50">
                      {donation.foodDetails?.quantity?.value} {donation.foodDetails?.quantity?.unit}
                      <span className="mx-2 text-white/20">·</span>
                      {new Date(donation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={STATUS_CLASS[donation.status] || 'status-pending'}>
                    {donation.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DonorDashboard;

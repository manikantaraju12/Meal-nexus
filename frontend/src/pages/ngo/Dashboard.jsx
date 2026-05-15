import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { donationAPI, userAPI, aiAPI } from '../../utils/api';
import OtpModal from '../../components/OtpModal';
import Layout from '../../components/Layout';

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

const NGODashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [stats, setStats] = useState({ available: 0, accepted: 0, picked: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);
  const [showOtp, setShowOtp] = useState(false);
  const [pendingDonationId, setPendingDonationId] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState({});
  const [loadingAi, setLoadingAi] = useState({});
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [donationsRes, volunteersRes] = await Promise.all([donationAPI.getAll(), userAPI.getVolunteers()]);
      setDonations(donationsRes.data);
      setVolunteers(volunteersRes.data);
      const available = donationsRes.data.filter(d => d.status === 'pending').length;
      const accepted = donationsRes.data.filter(d => d.status === 'accepted' && d.assignedNGO === user?.id).length;
      const picked = donationsRes.data.filter(d => d.status === 'picked').length;
      const delivered = donationsRes.data.filter(d => d.status === 'delivered' && d.assignedNGO === user?.id).length;
      setStats({ available, accepted, picked, delivered });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (donationId) => {
    setPendingDonationId(donationId);
    setShowOtp(true);
  };

  const handleOtpVerified = async () => {
    setShowOtp(false);
    try {
      await donationAPI.accept(pendingDonationId);
      setPendingDonationId(null);
      fetchData();
    } catch (err) {
      console.error('Error accepting donation:', err);
    }
  };

  const handleAssignVolunteer = async (donationId, volunteerId) => {
    if (!volunteerId) return;
    try {
      await donationAPI.assignVolunteer(donationId, volunteerId);
      fetchData();
    } catch (err) {
      console.error('Error assigning volunteer:', err);
    }
  };

  const getAiRecommendations = async (donation) => {
    setLoadingAi(prev => ({ ...prev, [donation._id]: true }));
    try {
      const volunteerList = volunteers.map(v => ({
        _id: v._id, name: v.name, address: v.address,
        rating: v.rating, stats: v.stats,
        preferredFoodTypes: v.preferredFoodTypes || [], maxCapacity: v.maxCapacity || 10
      }));
      const result = await aiAPI.rankCandidates(donation, volunteerList, 'volunteer', 3);
      if (result.success) {
        setAiRecommendations(prev => ({ ...prev, [donation._id]: result.recommendations }));
      }
    } catch (err) {
      console.error('AI error:', err);
    } finally {
      setLoadingAi(prev => ({ ...prev, [donation._id]: false }));
    }
  };

  const pendingDonations = donations.filter(d => d.status === 'pending')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const myDonations = donations.filter(d => d.status !== 'pending' && d.assignedNGO === user?.id);

  if (loading) {
    return (
      <Layout title="NGO Dashboard">
        <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="NGO Dashboard">
      {/* Welcome */}
      <div className="glass-card stat-blue mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Welcome, {user?.name}</h2>
        <p className="text-white/60 text-sm">Manage and distribute food efficiently to help communities</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Available', value: stats.available, cls: 'stat-green' },
          { label: 'Accepted', value: stats.accepted, cls: 'stat-blue' },
          { label: 'In Transit', value: stats.picked, cls: 'stat-orange' },
          { label: 'Delivered', value: stats.delivered, cls: 'stat-purple' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`glass-card ${cls} text-center`}>
            <div className="text-3xl font-bold gradient-text">{value}</div>
            <div className="text-white/60 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-5">
        {[
          { key: 'available', label: 'Available Donations', count: pendingDonations.length },
          { key: 'mine', label: 'My Accepted', count: myDonations.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              activeTab === key
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
            }`}
          >
            {label}
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-white/10">{count}</span>
          </button>
        ))}
      </div>

      {/* Available Donations */}
      {activeTab === 'available' && (
        <div className="glass-card">
          {pendingDonations.length === 0 ? (
            <div className="text-center py-16 text-white/40">No pending donations available right now</div>
          ) : (
            <div className="space-y-3">
              {pendingDonations.map((donation) => (
                <div key={donation._id} className="item-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-semibold text-white">
                          {donation.foodDetails?.foodType} — {donation.foodDetails?.category}
                        </h4>
                        <span className={`priority-${donation.priority}`}>{donation.priority}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-white/50">
                        <span>{donation.foodDetails?.quantity?.value} {donation.foodDetails?.quantity?.unit}</span>
                        <span>{donation.pickupLocation?.city}</span>
                        <span>Expires: {new Date(donation.foodDetails?.expiryTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        <span>By: {donation.donor?.name}</span>
                      </div>
                    </div>
                    <button onClick={() => handleAccept(donation._id)} className="btn-glow btn-sm flex-shrink-0">
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Accepted Donations */}
      {activeTab === 'mine' && (
        <div className="glass-card">
          {myDonations.length === 0 ? (
            <div className="text-center py-16 text-white/40">No accepted donations yet</div>
          ) : (
            <div className="space-y-4">
              {myDonations.map((donation) => (
                <div key={donation._id} className="item-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-white">
                          {donation.foodDetails?.foodType} — {donation.foodDetails?.category}
                        </h4>
                        <span className={`status-${donation.status}`}>{donation.status}</span>
                      </div>
                      <p className="text-sm text-white/50">{donation.pickupLocation?.address}</p>
                      {donation.assignedVolunteer && (
                        <p className="text-sm text-emerald-400 mt-1">
                          Assigned to: {donation.assignedVolunteer?.name}
                        </p>
                      )}
                    </div>

                    {donation.status === 'accepted' && !donation.assignedVolunteer && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <select
                          onChange={(e) => handleAssignVolunteer(donation._id, e.target.value)}
                          className="glass-select text-sm"
                          defaultValue=""
                          style={{ width: '11rem' }}
                        >
                          <option value="">Assign volunteer...</option>
                          {volunteers.map(v => (
                            <option key={v._id} value={v._id}>{v.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => getAiRecommendations(donation)}
                          disabled={loadingAi[donation._id]}
                          className="btn-ghost btn-sm text-purple-300 border-purple-500/30 hover:bg-purple-500/15"
                        >
                          {loadingAi[donation._id] ? 'Analyzing...' : 'AI Recommend'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AI Recommendations */}
                  {aiRecommendations[donation._id]?.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      <p className="text-sm font-semibold text-purple-300 mb-3">AI Recommended Volunteers</p>
                      <div className="space-y-2">
                        {aiRecommendations[donation._id].map((rec, idx) => (
                          <div key={rec.candidate._id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(168,85,247,0.3)', color: '#d8b4fe' }}>
                                {idx + 1}
                              </span>
                              <span className="text-white/80">{rec.candidate.name}</span>
                              <span className="text-purple-400 text-xs">{(rec.score * 100).toFixed(0)}% match</span>
                            </div>
                            <button
                              onClick={() => handleAssignVolunteer(donation._id, rec.candidate._id)}
                              className="btn-ghost btn-sm text-xs text-purple-300"
                            >
                              Assign
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showOtp && user?.phone && (
        <OtpModal
          phone={user.phone}
          purpose="accept_donation"
          title="Verify Donation Acceptance"
          onVerified={handleOtpVerified}
          onCancel={() => { setShowOtp(false); setPendingDonationId(null); }}
        />
      )}
    </Layout>
  );
};

export default NGODashboard;

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { campaignAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';

const getProgressPercent = (current, target) => {
  if (!target || target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
};

const CampaignList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchCampaigns(); }, [filter]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await campaignAPI.getAll(params);
      setCampaigns(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_STYLES = {
    active: 'status-delivered',
    completed: 'status-accepted',
    cancelled: 'status-pending',
  };

  return (
    <Layout title="Campaigns">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="glass-card stat-blue flex-1 mr-4">
          <h2 className="text-xl font-bold text-white mb-1">Food Campaigns</h2>
          <p className="text-white/60 text-sm">Join campaigns and amplify your impact</p>
        </div>
        {(user?.role === 'ngo' || user?.role === 'admin') && (
          <Link to="/campaigns/create" className="btn-glow flex-shrink-0">
            + Create Campaign
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        {['all', 'active', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all border ${
              filter === f
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="spinner" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <p className="text-white/40 mb-2">No campaigns found</p>
          {(user?.role === 'ngo' || user?.role === 'admin') && (
            <Link to="/campaigns/create" className="btn-glow btn-sm">Create First Campaign</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((campaign) => {
            const progress = getProgressPercent(campaign.progress?.current || 0, campaign.target?.quantity);
            return (
              <div
                key={campaign._id}
                onClick={() => navigate(`/campaigns/${campaign._id}`)}
                className="glass-card glass-hover cursor-pointer overflow-hidden p-0"
              >
                {campaign.coverImage && (
                  <img src={campaign.coverImage} alt={campaign.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={STATUS_STYLES[campaign.status] || 'status-pending'}>{campaign.status}</span>
                    <span className="text-xs text-white/40 capitalize">{campaign.type}</span>
                  </div>

                  <h3 className="font-bold text-white mb-2 line-clamp-1">{campaign.title}</h3>
                  <p className="text-sm text-white/50 line-clamp-2 mb-4">{campaign.description}</p>

                  {campaign.target?.quantity > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/40">Progress</span>
                        <span className="text-emerald-400 font-semibold">{progress}%</span>
                      </div>
                      <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #10b981, #0d9488)' }}
                        />
                      </div>
                      <div className="text-xs text-white/30 mt-1">
                        {campaign.progress?.current || 0} / {campaign.target.quantity} {campaign.target.unit}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-white/30 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span>By {campaign.createdBy?.name || 'Unknown'}</span>
                    <span>{campaign.progress?.donors?.length || 0} supporters</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default CampaignList;

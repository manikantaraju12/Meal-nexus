import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { campaignAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';

const CampaignDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCampaign(); }, [id]);

  const fetchCampaign = async () => {
    setLoading(true);
    try {
      const res = await campaignAPI.getById(id);
      setCampaign(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercent = () => {
    const current = campaign?.progress?.current || 0;
    const target = campaign?.target?.quantity || campaign?.target?.amount || 0;
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  const isCreator = campaign?.createdBy?._id === user?._id || campaign?.createdBy === user?._id;

  if (loading) {
    return (
      <Layout title="Campaign">
        <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
      </Layout>
    );
  }

  if (!campaign) {
    return (
      <Layout title="Campaign">
        <div className="glass-card text-center py-20">
          <p className="text-white/40 mb-4">Campaign not found</p>
          <Link to="/campaigns" className="btn-glow btn-sm">Back to Campaigns</Link>
        </div>
      </Layout>
    );
  }

  const progress = getProgressPercent();
  const STATUS_STYLES = { active: 'status-delivered', completed: 'status-accepted', cancelled: 'status-pending' };

  return (
    <Layout title={campaign.title}>
      {/* Cover image */}
      {campaign.coverImage && (
        <div className="w-full h-56 rounded-2xl overflow-hidden mb-6">
          <img src={campaign.coverImage} alt={campaign.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={STATUS_STYLES[campaign.status] || 'status-pending'}>{campaign.status}</span>
                <span className="text-xs text-white/40 capitalize">{campaign.type}</span>
              </div>
              {(isCreator || user?.role === 'admin') && (
                <button
                  onClick={() => navigate(`/campaigns/${id}/edit`)}
                  className="btn-ghost btn-sm"
                >
                  Edit
                </button>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">{campaign.title}</h1>
            <p className="text-white/60 leading-relaxed whitespace-pre-wrap">{campaign.description}</p>
          </div>

          {/* Impact Story */}
          {campaign.impact?.story && (
            <div className="glass-card stat-green">
              <h3 className="font-bold text-white mb-2">Impact Story</h3>
              <p className="text-white/70 text-sm leading-relaxed">{campaign.impact.story}</p>
              {campaign.impact.beneficiaryCount > 0 && (
                <p className="text-emerald-300 text-sm mt-2 font-semibold">
                  Beneficiaries reached: {campaign.impact.beneficiaryCount}
                </p>
              )}
            </div>
          )}

          {/* Gallery */}
          {campaign.images?.length > 0 && (
            <div className="glass-card">
              <h3 className="font-bold text-white mb-4">Gallery</h3>
              <div className="grid grid-cols-3 gap-3">
                {campaign.images.map((img, i) => (
                  <img key={i} src={img} alt="" className="w-full h-32 object-cover rounded-xl" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="glass-card sticky top-24">
            {/* Progress */}
            {(campaign.target?.quantity > 0 || campaign.target?.amount > 0) && (
              <div className="mb-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/50">Progress</span>
                  <span className="text-emerald-400 font-bold">{progress}%</span>
                </div>
                <div className="w-full rounded-full h-2 mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #10b981, #0d9488)' }}
                  />
                </div>
                <p className="text-sm text-white/50">
                  <span className="text-white font-semibold">{campaign.progress?.current || 0}</span>
                  {' '}of{' '}
                  <span className="text-white font-semibold">{campaign.target?.quantity || campaign.target?.amount}</span>
                  {' '}{campaign.target?.unit || 'items'}
                </p>
              </div>
            )}

            <div className="section-divider" />

            {/* Details */}
            <div className="space-y-3 text-sm">
              {campaign.target?.deadline && (
                <div className="flex justify-between">
                  <span className="text-white/40">Deadline</span>
                  <span className="text-white/80">{new Date(campaign.target.deadline).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                </div>
              )}
              {campaign.location?.city && (
                <div className="flex justify-between">
                  <span className="text-white/40">Location</span>
                  <span className="text-white/80">{campaign.location.city}{campaign.location.state && `, ${campaign.location.state}`}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/40">Organized by</span>
                <span className="text-white/80">{campaign.createdBy?.name || 'Unknown'}</span>
              </div>
            </div>

            {/* Supporters */}
            {campaign.progress?.donors?.length > 0 && (
              <>
                <div className="section-divider" />
                <div>
                  <p className="text-sm text-white/40 mb-3">{campaign.progress.donors.length} supporters</p>
                  <div className="flex -space-x-2">
                    {campaign.progress.donors.slice(0, 6).map((donor, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold border-2 border-transparent"
                        title={donor.name || 'Donor'}
                        style={{ borderColor: 'rgba(0,0,0,0.3)' }}
                      >
                        {(donor.name || 'D')[0].toUpperCase()}
                      </div>
                    ))}
                    {campaign.progress.donors.length > 6 && (
                      <div className="w-8 h-8 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-xs border-2" style={{ borderColor: 'rgba(0,0,0,0.3)' }}>
                        +{campaign.progress.donors.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="section-divider" />
            <Link to="/campaigns" className="btn-ghost w-full text-center block">
              ← All Campaigns
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CampaignDetail;

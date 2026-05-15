import { useState, useEffect } from 'react';
import { donationAPI } from '../../utils/api';
import Layout from '../../components/Layout';

const MyDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchDonations(); }, []);

  const fetchDonations = async () => {
    try {
      const res = await donationAPI.getAll();
      setDonations(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const STATUSES = ['all', 'pending', 'accepted', 'picked', 'delivered'];
  const counts = Object.fromEntries(
    STATUSES.map(s => [s, s === 'all' ? donations.length : donations.filter(d => d.status === s).length])
  );

  const filtered = donations.filter(d => {
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchSearch = !search ||
      d.foodDetails?.foodType?.toLowerCase().includes(search.toLowerCase()) ||
      d.pickupLocation?.city?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) return (
    <Layout title="My Donations">
      <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
    </Layout>
  );

  return (
    <Layout title="My Donations">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending', value: counts.pending, cls: 'stat-orange' },
          { label: 'Accepted', value: counts.accepted, cls: 'stat-blue' },
          { label: 'In Transit', value: counts.picked, cls: 'stat-purple' },
          { label: 'Delivered', value: counts.delivered, cls: 'stat-green' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`glass-card ${cls} text-center`}>
            <div className="text-3xl font-bold gradient-text">{value}</div>
            <div className="text-white/60 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="glass-input" placeholder="Search food type or city..."
          style={{ maxWidth: '18rem' }}
        />
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all border ${
                statusFilter === s
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              {s} <span className="ml-1 text-xs opacity-60">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="glass-card">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            {donations.length === 0 ? "You haven't made any donations yet" : 'No donations match your filter'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => (
              <div key={d._id} className="item-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h4 className="font-semibold text-white capitalize">
                        {d.foodDetails?.foodType} — {d.foodDetails?.category}
                      </h4>
                      {d.priority && <span className={`priority-${d.priority}`}>{d.priority}</span>}
                      <span className={`status-${d.status}`}>{d.status}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-white/50">
                      <span>
                        <span className="text-white/25 uppercase tracking-wide mr-1">Qty</span>
                        {d.foodDetails?.quantity?.value} {d.foodDetails?.quantity?.unit}
                      </span>
                      <span>
                        <span className="text-white/25 uppercase tracking-wide mr-1">City</span>
                        {d.pickupLocation?.city || '—'}
                      </span>
                      <span>
                        <span className="text-white/25 uppercase tracking-wide mr-1">NGO</span>
                        {d.assignedNGO?.name || 'Unassigned'}
                      </span>
                      <span>
                        <span className="text-white/25 uppercase tracking-wide mr-1">Volunteer</span>
                        {d.assignedVolunteer?.name || 'Unassigned'}
                      </span>
                      <span>
                        <span className="text-white/25 uppercase tracking-wide mr-1">Posted</span>
                        {new Date(d.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </span>
                      {d.foodDetails?.expiryTime && (
                        <span>
                          <span className="text-white/25 uppercase tracking-wide mr-1">Expires</span>
                          {new Date(d.foodDetails.expiryTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyDonations;

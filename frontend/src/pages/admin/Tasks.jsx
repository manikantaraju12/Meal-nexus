import { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import Layout from '../../components/Layout';

const STATUS_COLORS = {
  assigned: 'status-pending',
  'in-progress': 'status-accepted',
  completed: 'status-delivered',
};

const AdminTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      const res = await adminAPI.getTasks();
      setTasks(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const STATUSES = ['all', 'assigned', 'in-progress', 'completed'];
  const counts = Object.fromEntries(
    STATUSES.map(s => [s, s === 'all' ? tasks.length : tasks.filter(t => t.status === s).length])
  );

  const filtered = tasks.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchSearch = !search ||
      t.volunteer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.donation?.foodDetails?.foodType?.toLowerCase().includes(search.toLowerCase()) ||
      t.donation?.donor?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.donation?.assignedNGO?.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    assigned: counts.assigned,
    inProgress: counts['in-progress'],
    completed: counts.completed,
    total: counts.all,
  };

  if (loading) return (
    <Layout title="Task Monitor">
      <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
    </Layout>
  );

  return (
    <Layout title="Task Monitor">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tasks', value: stats.total, cls: 'stat-blue' },
          { label: 'Assigned', value: stats.assigned, cls: 'stat-orange' },
          { label: 'In Transit', value: stats.inProgress, cls: 'stat-purple' },
          { label: 'Completed', value: stats.completed, cls: 'stat-green' },
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
          className="glass-input" placeholder="Search volunteer, food type, donor, NGO..."
          style={{ maxWidth: '22rem' }}
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
              {s === 'in-progress' ? 'In Progress' : s}
              <span className="ml-1 text-xs opacity-60">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-card text-center py-16 text-white/30">No tasks found</div>
        ) : filtered.map(task => (
          <div key={task._id} className="glass-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              {/* Left: task info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <h4 className="font-semibold text-white capitalize">
                    {task.donation?.foodDetails?.foodType || 'Food'} Delivery
                  </h4>
                  {task.donation?.priority && (
                    <span className={`priority-${task.donation.priority}`}>{task.donation.priority}</span>
                  )}
                  <span className={STATUS_COLORS[task.status] || 'status-pending'}>{task.status}</span>
                  {task.proof?.photo && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Photo
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs text-white/50">
                  {/* Volunteer */}
                  <div>
                    <div className="text-white/25 uppercase tracking-wide mb-0.5">Volunteer</div>
                    <div className="text-white/70 font-medium">{task.volunteer?.name || '—'}</div>
                    {task.volunteer?.phone && <div className="text-white/40">{task.volunteer.phone}</div>}
                    {task.volunteer?.rating != null && (
                      <div className="text-yellow-400/70">★ {task.volunteer.rating.toFixed(1)}</div>
                    )}
                  </div>

                  {/* Donor */}
                  <div>
                    <div className="text-white/25 uppercase tracking-wide mb-0.5">Donor</div>
                    <div className="text-white/70 font-medium">{task.donation?.donor?.name || '—'}</div>
                    {task.donation?.donor?.email && <div className="text-white/40">{task.donation.donor.email}</div>}
                  </div>

                  {/* NGO */}
                  <div>
                    <div className="text-white/25 uppercase tracking-wide mb-0.5">NGO</div>
                    <div className="text-white/70 font-medium">
                      {task.donation?.assignedNGO?.organization || task.donation?.assignedNGO?.name || '—'}
                    </div>
                  </div>

                  {/* Food details */}
                  <div>
                    <div className="text-white/25 uppercase tracking-wide mb-0.5">Food</div>
                    <div className="text-white/60">
                      {task.donation?.foodDetails?.quantity?.value} {task.donation?.foodDetails?.quantity?.unit}
                      {task.donation?.foodDetails?.category && ` · ${task.donation.foodDetails.category}`}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <div className="text-white/25 uppercase tracking-wide mb-0.5">Location</div>
                    <div className="text-white/60">
                      {task.pickupLocation?.city || task.donation?.pickupLocation?.city || '—'}
                    </div>
                  </div>

                  {/* Distance */}
                  {task.estimatedDistance && (
                    <div>
                      <div className="text-white/25 uppercase tracking-wide mb-0.5">Distance</div>
                      <div className="text-white/60">{task.estimatedDistance} km</div>
                    </div>
                  )}
                </div>

                {/* Proof notes */}
                {task.proof?.notes && (
                  <p className="text-xs text-white/30 mt-2 italic">"{task.proof.notes}"</p>
                )}
              </div>

              {/* Right: timestamps */}
              <div className="flex flex-col gap-1.5 text-xs text-right flex-shrink-0">
                <div>
                  <div className="text-white/25 uppercase tracking-wide">Assigned</div>
                  <div className="text-white/50">
                    {task.assignedAt
                      ? new Date(task.assignedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </div>
                </div>
                {task.startedAt && (
                  <div>
                    <div className="text-white/25 uppercase tracking-wide">Started</div>
                    <div className="text-white/50">
                      {new Date(task.startedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                )}
                {task.completedAt && (
                  <div>
                    <div className="text-white/25 uppercase tracking-wide">Completed</div>
                    <div className="text-emerald-400/70 font-medium">
                      {new Date(task.completedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default AdminTasks;

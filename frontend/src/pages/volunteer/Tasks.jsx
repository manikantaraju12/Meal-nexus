import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskAPI } from '../../utils/api';
import OtpModal from '../../components/OtpModal';
import Layout from '../../components/Layout';

const VolunteerTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showOtp, setShowOtp] = useState(false);
  const [pendingAction, setPendingAction] = useState({ type: null, taskId: null });

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      const res = await taskAPI.getAll();
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = async () => {
    setShowOtp(false);
    try {
      if (pendingAction.type === 'start') await taskAPI.start(pendingAction.taskId);
      else if (pendingAction.type === 'complete') await taskAPI.complete(pendingAction.taskId, {
        photo: '', recipientName: 'Beneficiary', notes: 'Delivery completed'
      });
      fetchTasks();
    } catch (err) { console.error(err); }
    finally { setPendingAction({ type: null, taskId: null }); }
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const FILTERS = [
    { key: 'all', label: 'All Tasks' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  const stats = {
    assigned: tasks.filter(t => t.status === 'assigned').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  if (loading) return (
    <Layout title="My Tasks">
      <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
    </Layout>
  );

  return (
    <Layout title="My Tasks">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Assigned', value: stats.assigned, cls: 'stat-orange' },
          { label: 'In Progress', value: stats.inProgress, cls: 'stat-blue' },
          { label: 'Completed', value: stats.completed, cls: 'stat-green' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`glass-card ${cls} text-center`}>
            <div className="text-3xl font-bold gradient-text">{value}</div>
            <div className="text-white/60 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              filter === key
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
            }`}
          >
            {label}
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-white/10">
              {key === 'all' ? tasks.length : tasks.filter(t => t.status === key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="glass-card text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-white/40">No {filter === 'all' ? '' : filter} tasks</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((task) => (
            <div key={task._id} className="glass-card glass-hover">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-bold text-white">{task.donation?.foodDetails?.foodType} Donation</h3>
                    <span className={`status-${task.status}`}>{task.status}</span>
                    {task.type && <span className="text-xs text-white/30 capitalize">{task.type}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-white/50">
                    <span>
                      <span className="text-white/30 text-xs uppercase tracking-wide mr-1">Qty</span>
                      {task.donation?.foodDetails?.quantity?.value} {task.donation?.foodDetails?.quantity?.unit}
                    </span>
                    <span>
                      <span className="text-white/30 text-xs uppercase tracking-wide mr-1">City</span>
                      {task.pickupLocation?.address?.split(',')[0] || task.pickupLocation?.address || '—'}
                    </span>
                    <span>
                      <span className="text-white/30 text-xs uppercase tracking-wide mr-1">Assigned</span>
                      {new Date(task.assignedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    {task.completedAt && (
                      <span>
                        <span className="text-white/30 text-xs uppercase tracking-wide mr-1">Done</span>
                        {new Date(task.completedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                    {task.estimatedDistance && (
                      <span>
                        <span className="text-white/30 text-xs uppercase tracking-wide mr-1">Distance</span>
                        {task.estimatedDistance} km
                      </span>
                    )}
                  </div>
                  {task.proof?.notes && (
                    <p className="text-xs text-white/30 mt-2 italic">Note: {task.proof.notes}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {task.status === 'assigned' && (
                    <button onClick={() => { setPendingAction({ type: 'start', taskId: task._id }); setShowOtp(true); }} className="btn-glow btn-sm">
                      Start Pickup
                    </button>
                  )}
                  {task.status === 'in-progress' && (
                    <button onClick={() => { setPendingAction({ type: 'complete', taskId: task._id }); setShowOtp(true); }} className="btn-glow btn-sm" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}>
                      Mark Delivered
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <span className="status-completed text-center block">Done</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showOtp && user?.phone && (
        <OtpModal phone={user.phone} purpose="volunteer_action" title="Verify Action"
          onVerified={handleOtpVerified}
          onCancel={() => { setShowOtp(false); setPendingAction({ type: null, taskId: null }); }}
        />
      )}
    </Layout>
  );
};

export default VolunteerTasks;

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskAPI } from '../../utils/api';
import OtpModal from '../../components/OtpModal';
import Layout from '../../components/Layout';

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
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
      if (pendingAction.type === 'start') {
        await taskAPI.start(pendingAction.taskId);
      } else if (pendingAction.type === 'complete') {
        await taskAPI.complete(pendingAction.taskId, {
          photo: '', recipientName: 'Beneficiary', notes: 'Delivery completed'
        });
      }
      fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingAction({ type: null, taskId: null });
    }
  };

  const assigned = tasks.filter(t => t.status === 'assigned');
  const inProgress = tasks.filter(t => t.status === 'in-progress');
  const completed = tasks.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <Layout title="Volunteer Dashboard">
        <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="Volunteer Dashboard">
      {/* Welcome */}
      <div className="glass-card stat-orange mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Ready to deliver, {user?.name}?</h2>
        <p className="text-white/60 text-sm">
          {tasks.length === 0
            ? 'No tasks yet. An NGO will assign you when a donation is nearby.'
            : `${assigned.length} pending, ${inProgress.length} in progress, ${completed.length} completed`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Assigned', value: assigned.length, cls: 'stat-orange' },
          { label: 'In Transit', value: inProgress.length, cls: 'stat-blue' },
          { label: 'Completed', value: completed.length, cls: 'stat-green' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`glass-card ${cls} text-center`}>
            <div className="text-3xl font-bold gradient-text">{value}</div>
            <div className="text-white/60 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="glass-card text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-white/40 mb-2">No tasks assigned yet</p>
          <p className="text-sm text-white/25">Tasks will appear here when an NGO assigns you for a delivery</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task._id} className="glass-card glass-hover">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-white">{task.donation?.foodDetails?.foodType} Donation</h3>
                    <span className={`status-${task.status}`}>{task.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-white/50">
                    <span>
                      <span className="text-white/30 text-xs uppercase tracking-wide mr-1">Qty</span>
                      {task.donation?.foodDetails?.quantity?.value} {task.donation?.foodDetails?.quantity?.unit}
                    </span>
                    {task.estimatedDistance && (
                      <span>
                        <span className="text-white/30 text-xs uppercase tracking-wide mr-1">Dist</span>
                        {task.estimatedDistance} km
                      </span>
                    )}
                    <span className="col-span-2">
                      <span className="text-white/30 text-xs uppercase tracking-wide mr-1">Pickup</span>
                      {task.pickupLocation?.address}
                    </span>
                    <span>
                      <span className="text-white/30 text-xs uppercase tracking-wide mr-1">Assigned</span>
                      {new Date(task.assignedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {task.status === 'assigned' && (
                    <button
                      onClick={() => { setPendingAction({ type: 'start', taskId: task._id }); setShowOtp(true); }}
                      className="btn-glow btn-sm"
                    >
                      Start Pickup
                    </button>
                  )}
                  {task.status === 'in-progress' && (
                    <button
                      onClick={() => { setPendingAction({ type: 'complete', taskId: task._id }); setShowOtp(true); }}
                      className="btn-glow btn-sm"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}
                    >
                      Mark Delivered
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <span className="status-completed text-center">Done</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showOtp && user?.phone && (
        <OtpModal
          phone={user.phone}
          purpose="volunteer_action"
          title="Verify Action"
          onVerified={handleOtpVerified}
          onCancel={() => { setShowOtp(false); setPendingAction({ type: null, taskId: null }); }}
        />
      )}
    </Layout>
  );
};

export default VolunteerDashboard;

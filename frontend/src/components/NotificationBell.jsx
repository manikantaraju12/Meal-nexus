import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../utils/api';
import { BellIcon } from '@heroicons/react/24/outline';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (open) fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.count);
    } catch {}
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      notificationAPI.markRead(n._id);
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
    setOpen(false);
    if (n.data?.donationId) navigate('/donor/dashboard');
    else if (n.data?.campaignId) navigate(`/campaigns/${n.data.campaignId}`);
  };

  const formatTime = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const dotColor = (type) => {
    const colors = { donation_accepted: '#60a5fa', task_assigned: '#fb923c', delivery_complete: '#34d399', campaign_update: '#c084fc' };
    return colors[type] || '#9ca3af';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-xl transition hover:bg-white/10"
      >
        <BellIcon className="w-5 h-5 text-white/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: '0.6rem' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-2xl z-50 overflow-hidden"
          style={{
            background: 'rgba(5, 15, 25, 0.92)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="font-semibold text-white text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-emerald-400 hover:text-emerald-300 transition">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '18rem' }}>
            {loading ? (
              <div className="p-6 text-center text-white/40 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <BellIcon className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className="px-4 py-3 cursor-pointer transition"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: !n.isRead ? 'rgba(52,211,153,0.05)' : 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = !n.isRead ? 'rgba(52,211,153,0.05)' : 'transparent'}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: !n.isRead ? dotColor(n.type) : 'rgba(255,255,255,0.15)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{n.title}</p>
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-white/30">{formatTime(n.createdAt)}</span>
                        {!n.isRead && (
                          <button
                            onClick={(e) => markAsRead(n._id, e)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

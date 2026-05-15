import { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import Layout from '../../components/Layout';

const ROLE_STYLE = {
  donor: 'bg-emerald-500/20 text-emerald-300',
  ngo: 'bg-blue-500/20 text-blue-300',
  volunteer: 'bg-orange-500/20 text-orange-300',
  admin: 'bg-purple-500/20 text-purple-300',
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleVerify = async (id) => {
    try { await adminAPI.verifyUser(id); fetchUsers(); }
    catch (err) { console.error(err); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try { await adminAPI.deleteUser(id); fetchUsers(); }
    catch (err) { console.error(err); }
  };

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const counts = { all: users.length, donor: 0, ngo: 0, volunteer: 0, admin: 0 };
  users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });

  if (loading) return (
    <Layout title="User Management">
      <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
    </Layout>
  );

  return (
    <Layout title="User Management">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Donors', value: counts.donor, cls: 'stat-green' },
          { label: 'NGOs', value: counts.ngo, cls: 'stat-blue' },
          { label: 'Volunteers', value: counts.volunteer, cls: 'stat-orange' },
          { label: 'Pending Verify', value: users.filter(u => !u.verification?.isVerified).length, cls: 'stat-purple' },
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
          className="glass-input" placeholder="Search name or email..." style={{ maxWidth: '18rem' }}
        />
        <div className="flex gap-2 flex-wrap">
          {['all', 'donor', 'ngo', 'volunteer', 'admin'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all border ${
                roleFilter === r
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              {r} <span className="ml-1 text-xs opacity-60">{counts[r] ?? ''}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Name', 'Email', 'Phone', 'Role', 'Verified', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-white/40 font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-white/30">No users found</td></tr>
              ) : filtered.map(u => (
                <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="hover:bg-white/3 transition">
                  <td className="py-3 px-4 font-medium text-white">{u.name}</td>
                  <td className="py-3 px-4 text-white/60">{u.email}</td>
                  <td className="py-3 px-4 text-white/50">{u.phone || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${ROLE_STYLE[u.role] || ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.verification?.isVerified
                      ? <span className="text-emerald-400 text-xs font-semibold">Verified</span>
                      : <span className="text-orange-400 text-xs font-semibold">Pending</span>}
                  </td>
                  <td className="py-3 px-4 text-white/40 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {!u.verification?.isVerified && u.role !== 'donor' && (
                        <button onClick={() => handleVerify(u._id)} className="btn-glow btn-sm">Verify</button>
                      )}
                      {u.role !== 'admin' && (
                        <button onClick={() => handleDelete(u._id, u.name)}
                          className="btn-ghost btn-sm text-red-400 hover:bg-red-500/10 border-red-500/20">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default AdminUsers;

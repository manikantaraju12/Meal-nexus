import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const { user } = useAuth();
  const home = user
    ? `/${user.role}/dashboard`
    : '/';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="orb w-96 h-96" style={{ top: '-4rem', left: '-4rem', background: 'radial-gradient(circle, #10b981, transparent)' }} />
      <div className="orb w-64 h-64" style={{ bottom: '2rem', right: '2rem', background: 'radial-gradient(circle, #0d9488, transparent)', animationDelay: '4s' }} />

      <div className="glass-card text-center max-w-md w-full p-12 relative z-10">
        <div className="text-8xl font-black gradient-text mb-4">404</div>
        <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>
        <p className="text-white/50 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to={home} className="btn-glow px-8 py-3">
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

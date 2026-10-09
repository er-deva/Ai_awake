import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Monitor, User } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-meet-glass backdrop-blur-md border-b border-meet-glass-hover h-16 flex justify-between items-center px-6">
            <Link to="/" className="text-xl font-bold flex items-center gap-2 group">
                <Monitor className="text-meet-blue group-hover:drop-shadow-neon transition-all" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-meet-blue to-meet-purple font-extrabold tracking-wide">
                    AI-Awake-Meet
                </span>
            </Link>

            <div className="flex items-center gap-4">
                {user ? (
                    <>
                        <span className="flex items-center gap-2 text-sm text-meet-text-dim">
                            <User size={18} />
                            {user.username} <span className="text-xs bg-meet-blue/20 text-meet-blue px-2 py-0.5 rounded-full uppercase">{user.role}</span>
                        </span>
                        <button
                            onClick={handleLogout}
                            className="bg-meet-red/10 text-meet-red hover:bg-meet-red hover:text-white border border-meet-red/50 px-4 py-1.5 rounded-full text-sm flex items-center gap-2 transition-all duration-300"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </>
                ) : (
                    <div className="flex gap-4">
                        <Link to="/login" className="text-meet-text-dim hover:text-meet-blue transition-colors">Login</Link>
                        <Link to="/register" className="bg-gradient-primary px-4 py-1.5 rounded-full text-white font-medium hover:opacity-90 transition-opacity">Register</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { Monitor, ArrowRight, Lock, Mail, User, ShieldCheck } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'student' });
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/auth/register', formData);
            setTimeout(() => {
                navigate('/login');
            }, 1000); // Slight delay to show success state if we added one (or just for smoothness)
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#202124] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Ambient Glows */}
            <div className="absolute top-[-20%] right-[30%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-float"></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-float animation-delay-400"></div>

            <div className="w-full max-w-md bg-[#202124]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in-up">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20 animate-float direction-reverse">
                        <User className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-gray-400 text-sm">Join AttentionMonitor today</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Username</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <input
                                name="username"
                                placeholder="Username"
                                className="w-full bg-[#303134] text-white border border-transparent focus:border-purple-500 focus:bg-[#3c4043] rounded-xl py-3 pl-10 pr-4 outline-none transition-all duration-300 placeholder-gray-500"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Email Address</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <input
                                name="email"
                                type="email"
                                placeholder="student@example.com"
                                className="w-full bg-[#303134] text-white border border-transparent focus:border-purple-500 focus:bg-[#3c4043] rounded-xl py-3 pl-10 pr-4 outline-none transition-all duration-300 placeholder-gray-500"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <input
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-[#303134] text-white border border-transparent focus:border-purple-500 focus:bg-[#3c4043] rounded-xl py-3 pl-10 pr-4 outline-none transition-all duration-300 placeholder-gray-500"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Role</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <ShieldCheck className="h-5 w-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <select
                                name="role"
                                className="w-full bg-[#303134] text-white border border-transparent focus:border-purple-500 focus:bg-[#3c4043] rounded-xl py-3 pl-10 pr-4 outline-none transition-all duration-300 appearance-none cursor-pointer"
                                onChange={handleChange}
                            >
                                <option value="student">Student</option>
                                <option value="admin">Admin</option>
                            </select>
                            {/* Custom Arrow */}
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 mt-2 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                Register <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-400">
                    Already have an account?{' '}
                    <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium hover:underline transition-all">
                        Sign in instead
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center w-full text-xs text-gray-600">
                &copy; {new Date().getFullYear()} AttentionMonitor AI. All rights reserved.
            </div>
        </div>
    );
};

export default Register;

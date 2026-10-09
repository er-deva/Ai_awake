import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import socket from '../socket';
import {
    Users, Video, Mic, MicOff, VideoOff,
    MoreVertical, Shield, Settings, UserPlus,
    Link as LinkIcon, X, Monitor, Radio, FileText, MessageSquare, Send,
    PhoneOff, Info, LayoutGrid, MonitorUp, Download, LogOut, Brain, Sparkles, Paperclip
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Copy } from 'lucide-react';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    // Initializing with mock data so it's never empty on first load
    const [students, setStudents] = useState([
        { id: 'm1', username: 'Alex Johnson', role: 'student', attention: 73, status: 'Focused' },
        { id: 'm2', username: 'Sarah Smith', role: 'student', attention: 73, status: 'Focused' },
        { id: 'm3', username: 'Mike Brown', role: 'student', attention: 73, status: 'Focused' },
    ]);
    const [reports, setReports] = useState([]);

    // Real-time Chat
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const chatEndRef = useRef(null);

    // AI Chat State
    const [aiMessages, setAiMessages] = useState([
        { sender: 'AI', content: 'Hello Admin! I am the AI study assistant ready to help manage topics.', timestamp: new Date() }
    ]);
    const [newAiMessage, setNewAiMessage] = useState("");
    const [isAiTyping, setIsAiTyping] = useState(false);

    // Host Control States
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarView, setSidebarView] = useState('controls'); // 'controls', 'chat'
    const [muteAll, setMuteAll] = useState(false);
    const [disableVideo, setDisableVideo] = useState(false);
    const [shareScreen, setShareScreen] = useState(false);
    const [chatEnabled, setChatEnabled] = useState(true);
    const [studentScreenShareEnabled, setStudentScreenShareEnabled] = useState(true);
    const [inviteLink, setInviteLink] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Admin Self-View State
    const localVideoRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);

    // Screen Share State
    const screenVideoRef = useRef(null);
    const [screenStream, setScreenStream] = useState(null);

    const fetchStudents = async () => {
        try {
            const res = await api.get('/admin/users?role=student');
            if (res.data && res.data.length > 0) {
                // Merge with mock attention data if needed or expect from backend
                setStudents(res.data.map(s => ({ ...s, attention: 75, status: 'Focused' })));
            }
        } catch (err) {
            console.error("Error fetching students - sticking with mock data", err);
        }
    };

    useEffect(() => {
        fetchStudents();

        // Time Update
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        // Connect Socket
        socket.connect();
        socket.emit('join_classroom', { username: 'Admin', role: 'admin' });

        socket.on('status_update', (data) => {
            console.log("Status Update:", data);
            // Update local student mock status
            setStudents(prev => prev.map(s =>
                s.username === data.username ? { ...s, attention: data.attention_score, status: data.status } : s
            ));
        });

        socket.on('chat_message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on('ai_response', (data) => {
            setIsAiTyping(false);
            setAiMessages(prev => [...prev, {
                sender: 'AI',
                content: data.content,
                timestamp: new Date()
            }]);
        });

        // Initialize Camera
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error("Error accessing camera:", error);
                setIsMicOn(false);
                setIsCamOn(false);
            }
        };
        startCamera();

        return () => {
            socket.off('status_update');
            socket.off('chat_message');
            socket.off('ai_response');
            socket.disconnect();
            clearInterval(timeInterval);
            // Cleanup stream
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleScreenShare = async () => {
        try {
            if (shareScreen) {
                // Stop Sharing
                if (screenStream) {
                    screenStream.getTracks().forEach(track => track.stop());
                }
                setScreenStream(null);
                setShareScreen(false);
            } else {
                // Start Sharing
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                setScreenStream(stream);
                setShareScreen(true);

                if (screenVideoRef.current) {
                    screenVideoRef.current.srcObject = stream;
                }

                // Handle system "Stop Sharing" button
                stream.getVideoTracks()[0].onended = () => {
                    setScreenStream(null);
                    setShareScreen(false);
                };
            }
        } catch (err) {
            console.error("Error sharing screen:", err);
            setShareScreen(false);
        }
    };

    // Handle Local Stream Controls
    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    };

    const toggleCam = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCamOn(videoTrack.enabled);
            }
        }
    };

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sidebarView]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msgData = {
            sender_name: 'Admin',
            sender_id: 1, // Placeholder
            content: newMessage,
            room: 'classroom',
            timestamp: new Date().toISOString()
        };

        socket.emit('chat_message', msgData);
        setNewMessage("");
    };

    const handleSendAiMessage = (e) => {
        e.preventDefault();
        if (!newAiMessage.trim()) return;

        setAiMessages(prev => [...prev, {
            sender: 'You',
            content: newAiMessage,
            timestamp: new Date()
        }]);

        setIsAiTyping(true);
        socket.emit('ai_chat_message', {
            content: newAiMessage,
            sender_id: 1
        });

        setNewAiMessage("");
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert("Only PDF files are supported!");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('socket_id', socket.id);

        setAiMessages(prev => [...prev, {
            sender: 'System',
            content: `Uploading ${file.name}...`,
            timestamp: new Date()
        }]);

        try {
            await fetch('http://localhost:5000/api/upload-pdf', {
                method: 'POST',
                body: formData,
            });

            setAiMessages(prev => [...prev, {
                sender: 'System',
                content: `✅ ${file.name} uploaded!`,
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error("Upload failed", error);
            setAiMessages(prev => [...prev, {
                sender: 'System',
                content: `❌ Upload failed.`,
                timestamp: new Date()
            }]);
        }
    };

    const generateInvite = async () => {
        if (!inviteEmail) {
            alert("Please enter a student email");
            return;
        }
        try {
            const res = await api.post('/admin/invite-user', { email: inviteEmail, role: 'student' });
            setInviteLink(res.data.link);
            alert("Invite Link Generated!");
        } catch {
            alert("Failed to generate invite");
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("Classroom Session Report", 20, 20);
        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 20, 30);
        doc.text(`Students: ${students.length}`, 20, 38);

        const tableData = students.map(s => [
            s.username,
            s.role,
            `${s.attention}%`,
            s.status
        ]);

        autoTable(doc, {
            startY: 45,
            head: [['Student Name', 'Role', 'Attendance Score', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [66, 133, 244] }
        });

        doc.save('session_report.pdf');
    };

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            logout();
            navigate('/login');
        }
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="h-screen bg-[#202124] text-white flex flex-col font-sans overflow-hidden">

            {/* --- Main Content Row --- */}
            <div className="flex-1 flex min-h-0">
                {/* Left Area: Main Stage + Top Grid */}
                <div className="flex-1 flex flex-col relative">

                    {/* Top Top Participant Grid (Horizontal Strip) */}


                    {/* Center Main Stage */}
                    <div className="flex-1 p-4 min-h-0 flex items-center justify-center relative">
                        <div className="w-full h-full bg-black rounded-2xl flex flex-col items-center justify-center text-white relative overflow-hidden border border-white/5">

                            {/* Screen Share View */}
                            {shareScreen && screenStream ? (
                                <video
                                    ref={screenVideoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                /* Placeholder Content */
                                <div className="text-center">
                                    <h1 className="text-4xl font-bold mb-2 text-white/20 select-none">Admin Presenting</h1>
                                    <p className="text-white/10">The class is in session</p>
                                </div>
                            )}

                            {/* Share Screen Overlay (Optional - maybe remove or keep as small indicator) */}
                            {shareScreen && (
                                <div className="absolute top-4 left-4 bg-blue-600/90 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 z-10">
                                    <MonitorUp size={14} /> You are presenting
                                </div>
                            )}
                        </div>

                        {/* --- Self View (Floating) --- */}
                        <div className="absolute bottom-6 right-6 w-60 h-40 bg-[#202124] rounded-xl shadow-2xl border border-white/10 overflow-hidden z-20 hover:scale-105 transition-transform duration-300 group">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`}
                            />
                            {!isCamOn && (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#3c4043]">
                                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold">A</div>
                                </div>
                            )}
                            <div className="absolute bottom-2 right-2 flex gap-1">
                                {!isMicOn && <div className="bg-red-500 p-1.5 rounded-full shadow-md"><MicOff size={12} className="text-white" /></div>}
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="font-bold text-sm">You</span>
                            </div>
                        </div>
                    </div>
                </div >

                {/* --- Right Sidebar --- */}
                <div className={`w-[360px] bg-white text-gray-900 flex flex-col transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full w-0 opacity-0'} border-l border-gray-200 shadow-xl z-20`}>
                    {/* Header */}
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                        <div className="font-google-sans text-base font-medium text-gray-800 flex items-center gap-2">
                            {sidebarView === 'controls' ? 'Host Controls' : sidebarView === 'participants' ? 'Participants' : sidebarView === 'ai_chat' ? <><Sparkles size={18} className="text-purple-600" /> <span className="text-purple-600">AI Assistant</span></> : 'Class Chat'}
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="hover:bg-gray-200 p-2 rounded-full"><X size={20} className="text-gray-600" /></button>
                    </div>

                    {/* Controls Content */}
                    {sidebarView === 'controls' ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">

                            {/* Reports */}
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <h3 className="font-bold text-indigo-900 text-sm mb-2">Session Reports</h3>
                                <p className="text-xs text-gray-600 mb-3">Download a PDF summary of the current session and student attention scores.</p>
                                <button
                                    onClick={generatePDF}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2"
                                >
                                    <Download size={16} /> Download PDF Report
                                </button>
                            </div>

                            {/* Invite */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h3 className="font-bold text-blue-900 text-sm mb-2">Invite Student</h3>
                                <div className="space-y-3">
                                    {/* Email Invite */}
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="student@email.com"
                                            className="flex-1 p-2 text-sm border border-blue-200 rounded-md outline-none focus:border-blue-500"
                                        />
                                        <button onClick={generateInvite} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-bold">Send</button>
                                    </div>

                                    {/* Common Link Generator */}
                                    <div className="pt-2 border-t border-blue-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-blue-800 uppercase">Common Invite Link</span>
                                            <button
                                                onClick={() => {
                                                    const link = `${window.location.origin}/register?code=${Math.random().toString(36).substring(7)}`;
                                                    setInviteLink(link);
                                                }}
                                                className="text-xs bg-white text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                            >
                                                Generate New
                                            </button>
                                        </div>
                                        {inviteLink && (
                                            <div className="flex gap-2 items-center bg-white p-2 rounded border border-blue-200">
                                                <input
                                                    readOnly
                                                    value={inviteLink}
                                                    className="flex-1 text-xs text-gray-600 bg-transparent outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(inviteLink);
                                                        alert("Link copied!");
                                                    }}
                                                    className="p-1 hover:bg-gray-100 rounded text-gray-500"
                                                    title="Copy Link"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Host Management */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Host Management</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Share their screen</span>
                                        <button
                                            onClick={() => setStudentScreenShareEnabled(!studentScreenShareEnabled)}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${studentScreenShareEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${studentScreenShareEnabled ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Send chat messages</span>
                                        <button
                                            onClick={() => setChatEnabled(!chatEnabled)}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${chatEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${chatEnabled ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Meeting Moderation */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Meeting Moderation</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <MicOff size={18} />
                                            <span className="text-sm font-medium">Turn on their microphone</span>
                                        </div>
                                        <button onClick={() => setMuteAll(!muteAll)} className={`w-10 h-5 rounded-full relative transition-colors ${!muteAll ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                            <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${!muteAll ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <VideoOff size={18} />
                                            <span className="text-sm font-medium">Turn on their video</span>
                                        </div>
                                        <button onClick={() => setDisableVideo(!disableVideo)} className={`w-10 h-5 rounded-full relative transition-colors ${!disableVideo ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                            <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${!disableVideo ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4">
                                <button className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 font-bold py-2 rounded-lg hover:bg-red-50 transition-colors">
                                    <Shield size={18} /> End Class for All
                                </button>
                            </div>

                        </div>
                    ) : sidebarView === 'participants' ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">In Call ({students.length})</h3>
                            {students.map(student => (
                                <div key={student.id || student.username} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                                            {student.username[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-800">{student.username}</div>
                                            <div className="text-xs text-gray-500 capitalize flex items-center gap-1">
                                                {student.role} • <span className={student.status === 'Focused' ? 'text-green-600' : 'text-red-500'}>{student.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-base font-bold text-gray-900">{student.attention}%</div>
                                        <div className="text-[10px] text-gray-400">Attention</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : sidebarView === 'ai_chat' ? (
                        <div className="flex-1 flex flex-col bg-white">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-xs text-purple-800 mb-4">
                                    ✨ Ask me anything! I can help generate class summaries or answer questions.
                                </div>
                                {aiMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-xs font-bold ${msg.sender === 'AI' ? 'text-purple-600' : 'text-gray-700'}`}>{msg.sender}</span>
                                            <span className="text-[10px] text-gray-400">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={`mt-1 max-w-[90%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'You'
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isAiTyping && (
                                    <div className="flex items-start">
                                        <span className="text-xs font-bold text-purple-600 mr-2">AI</span>
                                        <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75"></div>
                                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            <form onSubmit={handleSendAiMessage} className="p-4 border-t bg-purple-50 flex gap-3 shrink-0 items-center">
                                <label className="cursor-pointer text-purple-500 hover:text-purple-700 transition-colors p-2 rounded-full hover:bg-purple-100">
                                    <Paperclip size={20} />
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </label>
                                <input
                                    className="flex-1 bg-white border border-purple-200 rounded-full px-4 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-black placeholder:text-purple-300"
                                    placeholder="Ask AI something..."
                                    value={newAiMessage}
                                    onChange={e => setNewAiMessage(e.target.value)}
                                />
                                <button type="submit" disabled={!newAiMessage.trim() || isAiTyping} className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-2 rounded-full hover:opacity-90 disabled:opacity-50 transition-all shadow-md">
                                    <Sparkles size={18} />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col bg-white">
                            <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col ${msg.sender_name === 'Admin' ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-bold text-gray-700">{msg.sender_name}</span>
                                            <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={`mt-1 max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender_name === 'Admin'
                                            ? 'bg-blue-100 text-blue-900 rounded-tr-none'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-3">
                                <input
                                    className="flex-1 bg-gray-100 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-black"
                                    placeholder="Send a message..."
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                />
                                <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    )}
                </div>

            </div>

            {/* --- Bottom Control Bar --- */}
            <div className="h-20 bg-[#202124] shrink-0 flex justify-between items-center px-6 pb-2 border-t border-white/5 z-30">
                {/* ... (Left) ... */}
                <div className="w-[200px] flex items-center gap-4 text-white">
                    <span className="font-bold">{formatTime(currentTime)}</span>
                    <div className="h-4 w-[1px] bg-white/30"></div>
                    <span className="text-sm font-medium text-white/70">class-code-123</span>
                </div>

                {/* Center: Controls */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleMic}
                        className={`p-3 rounded-full transition-all text-white ${isMicOn ? 'bg-[#3c4043] hover:bg-[#4a4e51]' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>
                    <button
                        onClick={toggleCam}
                        className={`p-3 rounded-full transition-all text-white ${isCamOn ? 'bg-[#3c4043] hover:bg-[#4a4e51]' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
                    </button>
                    <div className="relative group">
                        {/* Share Screen Button with Highlight */}
                        <button
                            onClick={handleScreenShare}
                            className={`p-3 rounded-full transition-all text-white border-2 flex items-center justify-center ${shareScreen ? 'bg-blue-600 border-blue-400' : 'bg-[#3c4043] border-transparent hover:bg-[#4a4e51]'}`}
                        >
                            <MonitorUp size={24} />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white text-black text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                            {shareScreen ? "Stop Sharing" : "Share Screen"}
                        </div>
                    </div>
                    <button className="p-3 rounded-full bg-[#3c4043] hover:bg-[#4a4e51] transition-all text-white">
                        <MoreVertical size={24} />
                    </button>
                    <button onClick={() => navigate('/')} className="w-14 h-11 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center ml-2 text-white">
                        <PhoneOff size={24} fill="currentColor" />
                    </button>
                </div>

                {/* Right: Sidebar Toggles */}
                <div className="w-[200px] flex justify-end gap-3">
                    <button
                        onClick={() => { setSidebarOpen(true); setSidebarView('controls'); }}
                        className={`p-3 rounded-full transition-all ${sidebarView === 'controls' && sidebarOpen ? 'bg-blue-200 text-blue-900' : 'hover:bg-[#3c4043] text-white'}`}
                        title="Host Controls"
                    >
                        <Shield size={24} />
                    </button>
                    <button className={`p-3 rounded-full transition-all relative ${sidebarView === 'participants' && sidebarOpen ? 'bg-blue-200 text-blue-900' : 'hover:bg-[#3c4043] text-white'}`}
                        onClick={() => { setSidebarOpen(true); setSidebarView('participants'); }}
                    >
                        <Users size={24} />
                        <span className="absolute top-1 right-1 px-1 bg-gray-600 rounded-full text-[10px] font-bold">{students.length}</span>
                    </button>
                    <button
                        onClick={() => { setSidebarOpen(true); setSidebarView('chat'); }}
                        className={`p-3 rounded-full transition-all ${sidebarView === 'chat' && sidebarOpen ? 'bg-blue-200 text-blue-900' : 'hover:bg-[#3c4043] text-white'}`}
                    >
                        <MessageSquare size={24} />
                    </button>
                    <button
                        onClick={() => { setSidebarOpen(true); setSidebarView('ai_chat'); }}
                        className={`p-3 rounded-full transition-all relative ${sidebarView === 'ai_chat' && sidebarOpen ? 'bg-purple-200 text-purple-900 shadow-lg shadow-purple-500/20' : 'hover:bg-[#3c4043] text-white hover:text-purple-300'}`}
                        title="AI Assistant"
                    >
                        <Brain size={24} />
                    </button>
                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all ml-2"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

        </div >
    );
};

export default AdminDashboard;

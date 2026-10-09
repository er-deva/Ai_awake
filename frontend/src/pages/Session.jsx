import { useRef, useState, useEffect } from 'react';
import {
    Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff,
    MessageSquare, Info, MoreVertical, Hand, X, Send,
    Users, Clock, Smile, LogOut, Brain, Sparkles, Paperclip
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import socket from '../socket';
import { FaceMesh } from '@mediapipe/face_mesh';
import { analyzeDrowsiness } from '../utils/drowsiness';
import * as cam from '@mediapipe/camera_utils';
import { useNavigate } from 'react-router-dom';

const Session = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const chatEndRef = useRef(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Logic State (Refs for performance in loop)
    const logicState = useRef({
        attention: 100,
        faceMissing: true,
        eyeClosed: false,
        headOff: false,
        isYawning: false,
        lastDetectTime: 0
    });

    // UI State
    const [currentTime, setCurrentTime] = useState(new Date());
    const [status, setStatus] = useState("Focused");
    const [attentionScore, setAttentionScore] = useState(100);
    const [emotion, setEmotion] = useState("Focused");

    // Controls State
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [sidebarView, setSidebarView] = useState('info'); // 'none', 'info', 'chat', 'participants'
    const [students, setStudents] = useState([
        { id: 'm1', username: 'Alex Johnson', role: 'student', attention: 73, status: 'Focused' },
        { id: 'm2', username: 'Sarah Smith', role: 'student', attention: 73, status: 'Focused' },
        { id: 'm3', username: 'Mike Brown', role: 'student', attention: 73, status: 'Focused' },
        { id: 'm4', username: 'Emily Davis', role: 'student', attention: 65, status: 'Distracted' },
    ]);

    // Chat State
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    // AI Chat State
    const [aiMessages, setAiMessages] = useState([
        { sender: 'AI', content: 'Hello! I am your AI study assistant. Ask me anything about your class or study topics!', timestamp: new Date() }
    ]);
    const [newAiMessage, setNewAiMessage] = useState("");
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [sessionId] = useState(() => Math.floor(Math.random() * 10000).toString().padStart(4, '0'));

    // Audio
    const alarmRef = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"));

    const playAlarm = () => {
        if (alarmRef.current.paused) {
            alarmRef.current.loop = true;
            alarmRef.current.volume = 0.5;
            alarmRef.current.play().catch(e => console.log("Audio play failed", e));
        }
    };

    const stopAlarm = () => {
        if (!alarmRef.current.paused) {
            alarmRef.current.pause();
            alarmRef.current.currentTime = 0;
        }
    };

    // --- Face Detection Logic ---
    const onResults = (results) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw video feed efficiently
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            const analysis = analyzeDrowsiness(landmarks);

            logicState.current.faceMissing = false;
            logicState.current.eyeClosed = analysis.eyeClosed;
            logicState.current.isYawning = analysis.isYawning;
            logicState.current.headOff = analysis.headOff;
            logicState.current.lastDetectTime = Date.now();

            // Draw Face Mesh Overlay (Subtle)
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            for (let i of [33, 133, 159, 145, 13, 14]) {
                const x = landmarks[i].x * canvas.width;
                const y = landmarks[i].y * canvas.height;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        } else {
            logicState.current.faceMissing = true;
        }
        ctx.restore();
    };

    useEffect(() => {
        const faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onResults);

        let camera = null;
        if (videoRef.current) {
            camera = new cam.Camera(videoRef.current, {
                onFrame: async () => {
                    await faceMesh.send({ image: videoRef.current });
                },
                width: 640,
                height: 480
            });
            camera.start();
            setIsCameraOn(true);
        }

        // Logic Loop
        const loopInterval = setInterval(() => {
            const now = Date.now();
            let att = logicState.current.attention;
            const state = logicState.current;

            if (state.faceMissing || (now - state.lastDetectTime > 1500)) {
                att -= 2;
            } else {
                if (state.eyeClosed) att -= 1.2;
                if (state.headOff) att -= 1.0;
                if (state.isYawning) att -= 0.8;
                if (!state.eyeClosed && !state.headOff && !state.isYawning) att += 0.8;
            }

            att = Math.max(0, Math.min(100, att));
            logicState.current.attention = att;
            setAttentionScore(Math.round(att));

            if (att > 70) {
                setStatus("Focused");
                setEmotion("Focused");
                stopAlarm();
            } else if (att > 40) {
                setStatus("Distracted");
                setEmotion("Distracted");
            } else {
                setStatus("Attention Low");
                setEmotion("Drowsy/Away");
                playAlarm();
            }

            if (socket.connected) {
                socket.emit('student_update', {
                    username: user?.username || 'Student',
                    attention_score: Math.round(att),
                    status: status,
                    emotion: emotion
                });
            }
        }, 200);

        // Time Update
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        // Socket Join
        socket.connect();
        socket.emit('join_classroom', { username: user?.username || 'Student', role: 'student' });
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

        return () => {
            if (camera) camera.stop();
            clearInterval(loopInterval);
            clearInterval(timeInterval);
            stopAlarm();
            socket.off('chat_message');
            socket.off('ai_response');
            socket.disconnect();
        };
    }, []);

    // Fetch Students (Simulated or Real)
    useEffect(() => {
        // In a real app, we'd fetch the class list here
        // const fetchStudents = async () => { ... }
        // fetchStudents();
    }, []);

    // Scroll chat
    useEffect(() => {
        if (sidebarView === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sidebarView]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const msgData = {
            sender_name: user?.username || 'Student',
            sender_id: user?.id || 999,
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

        // Add user message locally
        setAiMessages(prev => [...prev, {
            sender: 'You',
            content: newAiMessage,
            timestamp: new Date()
        }]);

        setIsAiTyping(true);
        socket.emit('ai_chat_message', {
            content: newAiMessage,
            sender_id: user?.id
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
        formData.append('socket_id', socket.id); // Send socket ID to link context

        // Optimistic UI update
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
                content: `✅ ${file.name} uploaded! I can now answer questions about it.`,
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error("Upload failed", error);
            setAiMessages(prev => [...prev, {
                sender: 'System',
                content: `❌ Upload failed. Please try again.`,
                timestamp: new Date()
            }]);
        }
    };

    const handleShareScreen = async () => {
        try {
            if (!isScreenSharing) {
                await navigator.mediaDevices.getDisplayMedia({ video: true });
                setIsScreenSharing(true);
            } else {
                // Logic to stop sharing would need the stream track reference
                setIsScreenSharing(false);
            }
        } catch (err) {
            console.error("Screen share failed", err);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="h-screen bg-[#202124] text-white flex flex-col font-sans overflow-hidden">
            {/* --- Top Bar --- */}
            <div className="h-16 flex justify-between items-center px-6 shrink-0 z-50">
                {/* Left: Time & Meeting Code */}
                <div className="flex items-center gap-4 text-white/90">
                    <span className="text-lg font-medium">{formatTime(currentTime)}</span>
                    <div className="h-4 w-[1px] bg-white/30"></div>
                    <span className="text-sm font-medium tracking-wide">abc-defg-hij</span>
                </div>

                {/* Right: Status Icons */}
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${status === "Focused" ? "bg-green-500/20 text-green-400" :
                        status === "Distracted" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-red-500/20 text-red-400 animate-pulse"
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${status === "Focused" ? "bg-green-400" :
                            status === "Distracted" ? "bg-yellow-400" : "bg-red-400"
                            }`}></div>
                        {attentionScore}% Attention
                    </div>
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">
                        {user?.username?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all ml-2"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* --- Main Stage --- */}
            <div className="flex-1 flex gap-4 p-4 min-h-0 relative">

                {/* Center Content (Teacher/Classroom) */}
                <div className="flex-1 relative bg-[#3c4043] rounded-2xl overflow-hidden flex items-center justify-center shadow-lg group">
                    {/* Placeholder for Teacher Video */}
                    <div className="text-center">
                        <div className="w-24 h-24 bg-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-white">
                            T
                        </div>
                        <h2 className="text-2xl font-medium text-white/80">Teacher's Screen</h2>
                        <p className="text-white/50 mt-2">Waiting for teacher to share content...</p>
                    </div>

                    {/* Hover Controls for Teacher Tile */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white"><MoreVertical size={20} /></button>
                    </div>

                    <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-md text-sm font-medium">
                        Mrs. Anderson (Host)
                    </div>

                    {/* --- Self View (Draggable-ish / Pin) --- */}
                    {/* Moved inside Center Content to prevent overlap with Sidebar */}
                    <div className="absolute bottom-4 right-4 w-56 h-40 bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 group/self transition-all hover:scale-105 z-20">
                        <video
                            ref={videoRef}
                            className="absolute inset-0 w-full h-full object-cover mirror"
                            style={{ display: 'none' }}
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full object-cover mirror"
                            width={640}
                            height={480}
                        />
                        {!isCameraOn && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#3c4043]">
                                <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold">
                                    {user?.username?.[0]?.toUpperCase() || 'S'}
                                </div>
                            </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/self:opacity-100 transition-opacity">
                            <button className="p-1.5 rounded-full bg-black/50 hover:bg-black/70"><MoreVertical size={14} /></button>
                        </div>
                        <div className="absolute bottom-2 left-2 text-xs font-medium bg-black/50 px-2 py-0.5 rounded">
                            You
                        </div>
                    </div>
                </div>

                {/* --- Side Panel (Unified) --- */}
                {sidebarView !== 'none' && (
                    <div className="w-80 bg-white rounded-2xl flex flex-col overflow-hidden shadow-xl animate-in slide-in-from-right duration-300">
                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-gray-700 font-sans text-lg">
                                {sidebarView === 'info' && 'Detailed Stats'}
                                {sidebarView === 'chat' && 'In-call messages'}
                                {sidebarView === 'participants' && `Participants (${students.length})`}
                                {sidebarView === 'ai_chat' && (
                                    <div className="flex items-center gap-2 text-purple-600">
                                        <Sparkles size={18} />
                                        <span>AI Study Assistant</span>
                                    </div>
                                )}
                            </h3>
                            <button onClick={() => setSidebarView('none')} className="bg-gray-200 p-1 rounded-full hover:bg-gray-300 transition-colors"><X size={16} className="text-gray-600" /></button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto bg-white p-4">

                            {/* AI Chat View */}
                            {sidebarView === 'ai_chat' && (
                                <div className="space-y-4">
                                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-xs text-purple-800 mb-4">
                                        ✨ I can help you summarize topics, explain concepts, or quiz you on the material!
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
                            )}

                            {/* Info/Stats View */}
                            {sidebarView === 'info' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Current Focus</label>
                                        <div className="text-3xl font-black text-blue-700 mt-1">{attentionScore}%</div>
                                        <div className="w-full bg-blue-200 h-2 rounded-full mt-2 overflow-hidden">
                                            <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${attentionScore}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-3 rounded-lg border text-center">
                                            <div className="text-2xl">👀</div>
                                            <div className="text-sm font-medium text-gray-600 mt-1">{logicState.current.eyeClosed ? 'Eyes Closed' : 'Eyes Open'}</div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg border text-center">
                                            <div className="text-2xl">🥱</div>
                                            <div className="text-sm font-medium text-gray-600 mt-1">{logicState.current.isYawning ? 'Yawning' : 'Normal'}</div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-900 text-white p-4 rounded-xl shadow-inner">
                                        <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Status</div>
                                        <div className={`text-xl font-bold ${status === "Focused" ? "text-green-400" : "text-red-400"}`}>
                                            {status}
                                        </div>
                                        <div className="text-sm text-gray-500 mt-2">
                                            Emotion detected: <span className="text-white">{emotion}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Chat View */}
                            {sidebarView === 'chat' && (
                                <>
                                    <div className="space-y-4 mb-4">
                                        <div className="text-center text-xs text-gray-400 my-4">Messages can be seen only by people in the call and are deleted when the call ends.</div>
                                        {messages.map((msg, idx) => (
                                            <div key={idx} className={`flex flex-col ${msg.sender_name === user?.username ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs font-bold text-gray-700">{msg.sender_name}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className={`mt-1 max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender_name === user?.username
                                                    ? 'bg-blue-100 text-blue-900 rounded-tr-none'
                                                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>
                                </>
                            )}

                            {/* Participants View */}
                            {sidebarView === 'participants' && (
                                <div className="space-y-3">
                                    {/* Me */}
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                                                {user?.username?.[0]?.toUpperCase() || 'S'}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-800">{user?.username || 'Student'} (You)</div>
                                                <div className="text-xs text-gray-500">Student • <span className="text-green-600">Active</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="border-gray-100 my-2" />

                                    {/* Others */}
                                    {students.map((student, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                                                    {student.username[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-800">{student.username}</div>
                                                    <div className="text-xs text-gray-500 capitalize">{student.role}</div>
                                                </div>
                                            </div>
                                            {/* Masking attention score for other students as per privacy usually, but showing status if desired. 
                                                For now we just show a subtle online indicator or similar. */}
                                            <div className="w-2 h-2 rounded-full bg-green-500" title="Online"></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Chat Input (Only unique to Chat view) */}
                        {sidebarView === 'chat' && (
                            <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50 flex gap-3 shrink-0">
                                <input
                                    className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-black"
                                    placeholder="Send a message..."
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                />
                                <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    <Send size={18} />
                                </button>
                            </form>
                        )}

                        {/* AI Chat Input */}
                        {sidebarView === 'ai_chat' && (
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
                        )}
                    </div>
                )}
            </div>

            {/* --- Bottom Control Bar --- */}
            <div className="h-20 shrink-0 flex justify-between items-center px-6 pb-2">
                {/* Left: Meeting Details (Hidden on mobile usually) */}
                <div className="w-[200px] hidden md:flex flex-col">
                    <span className="font-bold text-sm">Team Meeting</span>
                    <span className="text-xs text-gray-400">10:00 AM - 11:00 AM</span>
                </div>

                {/* Center: Main Controls */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMicOn(!isMicOn)}
                        className={`p-4 rounded-full transition-all duration-200 ${isMicOn ? 'bg-[#3c4043] hover:bg-[#4a4e51]' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        {isMicOn ? <Mic size={24} className="text-white" /> : <MicOff size={24} className="text-white" />}
                    </button>

                    <button
                        onClick={() => setIsCameraOn(!isCameraOn)}
                        className={`p-4 rounded-full transition-all duration-200 ${isCameraOn ? 'bg-[#3c4043] hover:bg-[#4a4e51]' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        {isCameraOn ? <Video size={24} className="text-white" /> : <VideoOff size={24} className="text-white" />}
                    </button>

                    <button className="p-4 rounded-full bg-[#3c4043] hover:bg-[#4a4e51] transition-all">
                        <Hand size={24} className="text-white" />
                    </button>

                    <button
                        onClick={handleShareScreen}
                        className={`p-4 rounded-full transition-all duration-200 ${isScreenSharing ? 'bg-blue-200 text-blue-800' : 'bg-[#3c4043] hover:bg-[#4a4e51] text-white'}`}
                    >
                        <MonitorUp size={24} />
                    </button>

                    <button className="p-4 rounded-full bg-[#3c4043] hover:bg-[#4a4e51] transition-all">
                        <MoreVertical size={24} className="text-white" />
                    </button>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="h-14 px-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all ml-4 text-white hover:scale-105 shadow-md"
                        title="Leave Call"
                    >
                        <PhoneOff size={24} fill="currentColor" />
                    </button>
                </div>

                {/* Right: Side Actions */}
                <div className="w-[200px] flex justify-end gap-3">
                    <button
                        onClick={() => setSidebarView(sidebarView === 'info' ? 'none' : 'info')}
                        className={`p-3 rounded-full transition-all ${sidebarView === 'info' ? 'bg-blue-200 text-blue-800' : 'hover:bg-[#3c4043] text-white'}`}
                        title="Meeting Details"
                    >
                        <Info size={24} />
                    </button>
                    <button
                        onClick={() => setSidebarView(sidebarView === 'participants' ? 'none' : 'participants')}
                        className={`p-3 rounded-full transition-all relative ${sidebarView === 'participants' ? 'bg-blue-200 text-blue-800' : 'hover:bg-[#3c4043] text-white'}`}
                        title="Participants"
                    >
                        <Users size={24} />
                        <span className="absolute top-1 right-1 px-1 bg-gray-600 rounded-full text-[10px] font-bold">{students.length + 1}</span>
                    </button>
                    <button
                        onClick={() => setSidebarView(sidebarView === 'chat' ? 'none' : 'chat')}
                        className={`p-3 rounded-full transition-all relative ${sidebarView === 'chat' ? 'bg-blue-200 text-blue-800' : 'hover:bg-[#3c4043] text-white'}`}
                        title="In-call messages"
                    >
                        <MessageSquare size={24} />
                        {messages.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                    </button>
                    <button
                        onClick={() => setSidebarView(sidebarView === 'ai_chat' ? 'none' : 'ai_chat')}
                        className={`p-3 rounded-full transition-all relative ${sidebarView === 'ai_chat' ? 'bg-purple-100 text-purple-700 shadow-lg shadow-purple-500/20' : 'hover:bg-[#3c4043] text-white hover:text-purple-300'}`}
                        title="AI Assistant"
                    >
                        <Brain size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Session;

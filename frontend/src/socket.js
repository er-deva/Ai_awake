import { io } from "socket.io-client";

// Connect to the Flask-SocketIO server (assuming running on port 5000)
// In production, this URL should be an env variable
const SOCKET_URL = "http://localhost:5000";

const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"]
});

export default socket;

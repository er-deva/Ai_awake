from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from flask_migrate import Migrate
from models import db, Message, User
from dotenv import load_dotenv
import google.generativeai as genai
import os
import pypdf
from io import BytesIO

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///attention.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'secret-key-for-socketio'
    
    CORS(app)
    db.init_app(app)
    migrate = Migrate(app, db)
    
    # Import and register blueprints
    from routes.auth import auth_bp
    from routes.api import api_bp
    from routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    @app.route('/')
    def index():
        return {"message": "AI-Awake-Meet API is running"}

    with app.app_context():
        db.create_all()
        
    return app

app = create_app()
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory storage for PDF contexts: { socket_id: "extracted text..." }
pdf_contexts = {}

# Configure Gemini
GENAI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash')
else:
    print("WARNING: GEMINI_API_KEY not found in environment variables.")
    model = None

# Using app.route for simplicity here, but could be in a blueprint
@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return {"error": "No file part"}, 400
    file = request.files['file']
    socket_id = request.form.get('socket_id')
    
    if file.filename == '':
        return {"error": "No selected file"}, 400
        
    if file and socket_id:
        try:
            pdf_reader = pypdf.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            # Store text associated with this socket session
            pdf_contexts[socket_id] = text
            print(f"Stored context for {socket_id} (Length: {len(text)})")
            return {"message": "PDF uploaded and context stored successfully"}, 200
        except Exception as e:
            print(f"Error processing PDF: {e}")
            return {"error": str(e)}, 500
            
    return {"error": "Missing socket_id or file"}, 400

# WebSocket Events
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('join_classroom')
def handle_join(data):
    username = data.get('username')
    role = data.get('role')
    room = 'classroom'
    join_room(room)
    emit('status_update', {'message': f'{username} joined the class'}, room=room)

@socketio.on('chat_message')
def handle_chat(data):
    # Data: { sender_id, content, room }
    try:
        msg = Message(
            room=data.get('room', 'classroom'), 
            sender_id=data['sender_id'], 
            content=data['content']
        )
        db.session.add(msg)
        db.session.commit()
        
        # Broadcast full message object with sender info
        emit('chat_message', msg.to_dict(), room=data.get('room', 'classroom'))
    except Exception as e:
        print(f"Error saving chat: {e}")

@socketio.on('ai_chat_message')
def handle_ai_chat(data):
    # Data: { content, sender_id } (sender_id used for logging/context if needed)
    user_message = data.get('content')
    sid = request.sid
    
    if not model:
        emit('ai_response', {'content': "AI is not configured. Please set GEMINI_API_KEY."}, room=sid)
        return

    try:
        # Prompt engineering for study buddy context
        system_instruction = "You are a helpful and encouraging AI study assistant for a student monitoring class. Keep answers concise and relevant to potential study topics."
        
        # Check if there is PDF context for this user
        pdf_text = pdf_contexts.get(sid)
        if pdf_text:
            # Truncate if too long (simple heuristic)
            truncated_context = pdf_text[:30000] 
            full_prompt = f"{system_instruction}\n\n[CONTEXT FROM UPLOADED PDF]:\n{truncated_context}\n\n[END CONTEXT]\n\nStudent asks: {user_message}"
        else:
            full_prompt = f"{system_instruction}\n\nStudent asks: {user_message}"
        
        response = model.generate_content(full_prompt)
        ai_text = response.text
        
        emit('ai_response', {'content': ai_text}, room=sid)
    except Exception as e:
        print(f"Gemini Error: {e}")
        error_msg = str(e).lower()
        if "429" in error_msg or "quota" in error_msg:
            # Fallback to duckduckgo_search
            try:
                from duckduckgo_search import DDGS
                results = DDGS().text(user_message, max_results=3)
                if results:
                    fallback_text = "I've hit my AI rate limit but I collected these quick facts from DuckDuckGo:\n\n"
                    for res in results:
                        title = res.get('title', 'No title')
                        desc = res.get('body', '')
                        url = res.get('href', '')
                        fallback_text += f"**{title}**\n{desc}\n{url}\n\n"
                    emit('ai_response', {'content': fallback_text}, room=sid)
                else:
                    emit('ai_response', {'content': "I'm currently overwhelmed with requests and no fallback search results could be found."}, room=sid)
            except Exception as search_e:
                 emit('ai_response', {'content': f"Error: API quota exceeded, and fallback search failed: {str(search_e)}"}, room=sid)
        else:
            emit('ai_response', {'content': f"Error: {str(e)}"}, room=sid)

@socketio.on('student_update')
def handle_student_update(data):
    # Data: { student_id, attention_score, emotion, etc. }
    # Broadcast to admin (or everyone for now)
    emit('student_data_update', data, room='classroom')

# Signaling for WebRTC
@socketio.on('signal')
def handle_signal(data):
    # Relay signal to specific target or room
    # Data: { target, signal, sender }
    emit('signal', data, room='classroom', skip_sid=request.sid)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)

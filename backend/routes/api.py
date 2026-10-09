from flask import Blueprint, request, jsonify
from models import db, Session, AttentionLog, User
from datetime import datetime

api_bp = Blueprint('api', __name__)

@api_bp.route('/session/start', methods=['POST'])
def start_session():
    data = request.get_json()
    user_id = data.get('user_id')
    
    new_session = Session(user_id=user_id)
    db.session.add(new_session)
    db.session.commit()
    
    return jsonify(new_session.to_dict()), 201

@api_bp.route('/session/end', methods=['POST'])
def end_session():
    data = request.get_json()
    session_id = data.get('session_id')
    
    session = Session.query.get(session_id)
    if session:
        session.end_time = datetime.utcnow()
        db.session.commit()
        return jsonify(session.to_dict()), 200
    return jsonify({"error": "Session not found"}), 404

@api_bp.route('/log/attention', methods=['POST'])
def log_attention():
    data = request.get_json()
    session_id = data.get('session_id')
    attention_score = data.get('attention_score')
    is_drowsy = data.get('is_drowsy')
    face_present = data.get('face_present')
    
    log = AttentionLog(
        session_id=session_id,
        attention_score=attention_score,
        is_drowsy=is_drowsy,
        face_present=face_present
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify(log.to_dict()), 201

@api_bp.route('/reports/<int:user_id>', methods=['GET'])
def get_report(user_id):
    sessions = Session.query.filter_by(user_id=user_id).all()
    report_data = []
    
    for sess in sessions:
        logs = AttentionLog.query.filter_by(session_id=sess.id).all()
        drowsy_count = sum(1 for log in logs if log.is_drowsy)
        avg_attention = sum(log.attention_score for log in logs) / len(logs) if logs else 0
        
        report_data.append({
            "session_id": sess.id,
            "start_time": sess.start_time,
            "end_time": sess.end_time,
            "drowsy_events": drowsy_count,
            "average_attention": avg_attention,
            "total_logs": len(logs)
        })
        
    return jsonify(report_data), 200

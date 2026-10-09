from flask import Blueprint, request, jsonify
from models import db, User, Session, AttentionLog
import uuid

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users', methods=['GET'])
def get_users():
    role = request.args.get('role')
    query = User.query
    if role:
        query = query.filter_by(role=role)
    
    users = query.all()
    return jsonify([user.to_dict() for user in users]), 200

@admin_bp.route('/invite-user', methods=['POST'])
def invite_user():
    data = request.get_json()
    email = data.get('email')
    role = data.get('role', 'student') 
    
    # In a real app, this would send an email. 
    # Here we just generate a "link" to register
    token = str(uuid.uuid4())
    invite_link = f"http://localhost:5173/register?role={role}&email={email}&token={token}"
    
    return jsonify({"message": f"{role.capitalize()} invite generated", "link": invite_link}), 200

@admin_bp.route('/user/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200

@admin_bp.route('/reports/global', methods=['GET'])
def get_global_reports():
    sessions = Session.query.all()
    report_data = []
    
    for sess in sessions:
        user = User.query.get(sess.user_id)
        logs = AttentionLog.query.filter_by(session_id=sess.id).all()
        drowsy_count = sum(1 for log in logs if log.is_drowsy)
        avg_attention = sum(log.attention_score for log in logs) / len(logs) if logs else 0
        
        report_data.append({
            "session_id": sess.id,
            "username": user.username if user else "Unknown",
            "role": user.role if user else "N/A",
            "start_time": sess.start_time,
            "end_time": sess.end_time,
            "drowsy_events": drowsy_count,
            "average_attention": avg_attention,
            "total_logs": len(logs)
        })
        
    return jsonify(report_data), 200

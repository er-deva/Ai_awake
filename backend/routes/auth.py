from flask import Blueprint, request, jsonify
from models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password') # In real app, hash this!
    role = data.get('role', 'student')
    
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400
        
    new_user = User(username=username, email=email, password_hash=password, role=role)
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"message": "User created successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    
    # Simple check (plain text for demo purposes, use bcrypt in prod)
    if user and user.password_hash == password: 
        return jsonify({
            "message": "Login successful",
            "user": user.to_dict()
        }), 200
        
    return jsonify({"error": "Invalid credentials"}), 401

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import os
import pymysql
import json
import datetime
from datetime import timedelta

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# MySQL connection config
MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
MYSQL_USER = os.getenv('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
MYSQL_DB = os.getenv('MYSQL_DB', 'shopping')

jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)

# Helper: MySQL connection

def get_db():
    return pymysql.connect(
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )

# Hardcoded product list (for demo)
PRODUCTS = [
    {"id": 1, "name": "Organic Bananas", "price": 2.99, "category": "Produce"},
    {"id": 2, "name": "Whole Milk", "price": 3.49, "category": "Dairy"},
    {"id": 3, "name": "Whole Wheat Bread", "price": 2.99, "category": "Bakery"},
    {"id": 4, "name": "Chicken Breast", "price": 8.99, "category": "Meat"},
    {"id": 5, "name": "Greek Yogurt", "price": 4.99, "category": "Dairy"},
]

# --- ROUTES ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT id FROM shopping_data WHERE user_email=%s", (email,))
        if cursor.fetchone():
            return jsonify({'error': 'Email already registered'}), 400
        # Store password in JSON (for demo only, not secure!)
        user_data = {"password": password, "cart": [], "preferences": {}, "history": []}
        cursor.execute(
            "INSERT INTO shopping_data (user_email, data) VALUES (%s, %s)",
            (email, json.dumps(user_data))
        )
        db.commit()
        cursor.execute("SELECT id FROM shopping_data WHERE user_email=%s", (email,))
        user = cursor.fetchone()
    access_token = create_access_token(identity=email)
    return jsonify({'token': access_token, 'user_email': email, 'user_id': user['id']}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT id, data FROM shopping_data WHERE user_email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user_data = json.loads(user['data'])
        if user_data.get('password') != password:
            return jsonify({'error': 'Invalid credentials'}), 401
    access_token = create_access_token(identity=email)
    return jsonify({'token': access_token, 'user_email': email, 'user_id': user['id']}), 200

@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify(PRODUCTS)

@app.route('/api/user/data', methods=['GET'])
@jwt_required()
def get_user_data():
    email = get_jwt_identity()
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT data FROM shopping_data WHERE user_email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(json.loads(user['data']))

@app.route('/api/user/data', methods=['POST'])
@jwt_required()
def set_user_data():
    email = get_jwt_identity()
    new_data = request.get_json()
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT data FROM shopping_data WHERE user_email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        # Merge new data into existing data
        user_data = json.loads(user['data'])
        user_data.update(new_data)
        cursor.execute("UPDATE shopping_data SET data=%s WHERE user_email=%s", (json.dumps(user_data), email))
        db.commit()
    return jsonify({'message': 'User data updated'})

# Example: Add to cart
@app.route('/api/cart/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    email = get_jwt_identity()
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT data FROM shopping_data WHERE user_email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user_data = json.loads(user['data'])
        cart = user_data.get('cart', [])
        # Check if product already in cart
        found = False
        for item in cart:
            if item['product_id'] == product_id:
                item['quantity'] += quantity
                found = True
                break
        if not found:
            cart.append({'product_id': product_id, 'quantity': quantity})
        user_data['cart'] = cart
        cursor.execute("UPDATE shopping_data SET data=%s WHERE user_email=%s", (json.dumps(user_data), email))
        db.commit()
    return jsonify({'message': 'Item added to cart'})

@app.route('/api/cart', methods=['GET'])
@jwt_required()
def get_cart():
    email = get_jwt_identity()
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT data FROM shopping_data WHERE user_email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user_data = json.loads(user['data'])
        cart = user_data.get('cart', [])
        # Enrich cart with product info
        cart_items = []
        total = 0
        for item in cart:
            product = next((p for p in PRODUCTS if p['id'] == item['product_id']), None)
            if product:
                item_total = product['price'] * item['quantity']
                total += item_total
                cart_items.append({
                    'product': product,
                    'quantity': item['quantity'],
                    'total': item_total
                })
        return jsonify({'items': cart_items, 'total': total})

# --- Purchase History Endpoints ---
@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    email = get_jwt_identity()
    data = request.get_json()
    db = get_db()
    
    with db.cursor() as cursor:
        # Get user's current cart
        cursor.execute("SELECT data FROM shopping_data WHERE user_email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = json.loads(user['data'])
        cart = user_data.get('cart', [])
        
        if not cart:
            return jsonify({'error': 'Cart is empty'}), 400
        
        # Calculate order total
        order_items = []
        total = 0
        for item in cart:
            product = next((p for p in PRODUCTS if p['id'] == item['product_id']), None)
            if product:
                item_total = product['price'] * item['quantity']
                total += item_total
                order_items.append({
                    'product': product,
                    'quantity': item['quantity'],
                    'total': item_total
                })
        
        # Create order with cleaner format
        order = {
            'id': datetime.datetime.now().strftime('%Y%m%d%H%M%S'),
            'items': order_items,
            'total': total
        }
        
        # Add to user's order history
        orders = user_data.get('orders', [])
        orders.append(order)
        user_data['orders'] = orders
        
        # Clear cart after successful order
        user_data['cart'] = []
        
        # Update user data
        cursor.execute("UPDATE shopping_data SET data=%s WHERE user_email=%s", (json.dumps(user_data), email))
        db.commit()
        
        return jsonify({'message': 'Order created successfully', 'order': order}), 201

@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    email = get_jwt_identity()
    db = get_db()
    
    with db.cursor() as cursor:
        cursor.execute("SELECT data FROM shopping_data WHERE user_email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = json.loads(user['data'])
        orders = user_data.get('orders', [])
        
        # Sort orders by ID (newest first, since ID contains timestamp)
        orders.sort(key=lambda x: x.get('id', ''), reverse=True)
        
        return jsonify({'orders': orders})

@app.route('/api/orders/<order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    email = get_jwt_identity()
    db = get_db()
    
    with db.cursor() as cursor:
        cursor.execute("SELECT data FROM shopping_data WHERE user_email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = json.loads(user['data'])
        orders = user_data.get('orders', [])
        
        # Find specific order
        order = next((o for o in orders if o.get('id') == order_id), None)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        return jsonify({'order': order})

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000) 
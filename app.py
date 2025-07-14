from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import os
import pymysql
import bcrypt
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
    { "id": 1,  "name": "Organic Bananas",    "price": 2.99, "category": "Produce" },
    { "id": 2,  "name": "Whole Milk",         "price": 3.49, "category": "Dairy" },
    { "id": 3,  "name": "Whole Wheat Bread",  "price": 2.99, "category": "Bakery" },
    { "id": 4,  "name": "Chicken Breast",     "price": 8.99, "category": "Meat" },
    { "id": 5,  "name": "Greek Yogurt",       "price": 4.99, "category": "Dairy" },
    { "id": 6,  "name": "Strawberries",       "price": 3.99, "category": "Produce" },
    { "id": 7,  "name": "Cheddar Cheese",     "price": 5.49, "category": "Dairy" },
    { "id": 8,  "name": "Orange Juice",       "price": 4.29, "category": "Beverages" },
    { "id": 9,  "name": "Toothpaste",         "price": 2.99, "category": "Toiletries" },
    { "id": 10, "name": "Almond Butter",      "price": 6.99, "category": "Pantry" },
    { "id": 11, "name": "Notebook",           "price": 1.99, "category": "Stationery" },
    { "id": 12, "name": "Ballpoint Pens",     "price": 2.49, "category": "Stationery" }
]


# --- ROUTES ---
@app.route('/')
def index():
    return render_template('index.html', products=PRODUCTS)

@app.route('/vr')
def vr():
    return render_template('vr.html')
# --- Registration ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cursor.fetchone():
            return jsonify({'error': 'Email already registered'}), 400
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        cursor.execute(
            "INSERT INTO users (email, password) VALUES (%s, %s)",
            (email, hashed)
        )
        db.commit()
        cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()
    access_token = create_access_token(identity=email)
    return jsonify({'token': access_token, 'user_email': email, 'user_id': user['id']}), 201

# --- Login ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT id, password FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({'error': 'Invalid credentials'}), 401
    access_token = create_access_token(identity=email)
    return jsonify({'token': access_token, 'user_email': email, 'user_id': user['id']}), 200

# --- Product List ---
@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify(PRODUCTS)

# --- Cart Management (in-memory, per-session for demo) ---
# In a real app, you may want to persist cart items in a DB table
user_carts = {}  # {email: [{product_id, quantity}]}

@app.route('/api/cart/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    email = get_jwt_identity()
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    if email not in user_carts:
        user_carts[email] = []
    cart = user_carts[email]
    found = False
    for item in cart:
        if item['product_id'] == product_id:
            item['quantity'] += quantity
            found = True
            break
    if not found:
        cart.append({'product_id': product_id, 'quantity': quantity})
    user_carts[email] = cart
    return jsonify({'message': 'Item added to cart'})

@app.route('/api/cart', methods=['GET'])
@jwt_required()
def get_cart():
    email = get_jwt_identity()
    cart = user_carts.get(email, [])
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

# --- Order Creation ---
@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    email = get_jwt_identity()
    db = get_db()
    with db.cursor() as cursor:
        # Get user id
        cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user_id = user['id']
        cart = user_carts.get(email, [])
        if not cart:
            return jsonify({'error': 'Cart is empty'}), 400
        # Calculate order total
        total = 0
        for item in cart:
            product = next((p for p in PRODUCTS if p['id'] == item['product_id']), None)
            if product:
                total += product['price'] * item['quantity']
        # Create order
        cursor.execute("INSERT INTO orders (user_id, total) VALUES (%s, %s)", (user_id, total))
        order_id = cursor.lastrowid
        # Add order items
        for item in cart:
            product = next((p for p in PRODUCTS if p['id'] == item['product_id']), None)
            if product:
                cursor.execute(
                    "INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (%s, %s, %s, %s, %s)",
                    (order_id, product['id'], product['name'], product['price'], item['quantity'])
                )
        db.commit()
        # Clear cart
        user_carts[email] = []
        # Return order info
        cursor.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
        order = cursor.fetchone()
        cursor.execute("SELECT * FROM order_items WHERE order_id=%s", (order_id,))
        items = cursor.fetchall()
    return jsonify({'message': 'Order created successfully', 'order': order, 'items': items}), 201

# --- Order History ---
@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    email = get_jwt_identity()
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user_id = user['id']
        # Fetch all order items for this user by joining orders and order_items
        cursor.execute("""
            SELECT o.id as order_id, o.total as order_total, o.created_at, 
                   oi.product_id, oi.product_name, oi.price, oi.quantity
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = %s
            ORDER BY o.created_at DESC, oi.id ASC
        """, (user_id,))
        rows = cursor.fetchall()
        # Group items by order_id
        orders_dict = {}
        for row in rows:
            oid = row['order_id']
            if oid not in orders_dict:
                orders_dict[oid] = {
                    'id': oid,
                    'total': float(row['order_total']),
                    'created_at': row['created_at'],
                    'items': []
                }
            orders_dict[oid]['items'].append({
                'product': {
                    'id': row['product_id'],
                    'name': row['product_name'],
                    'price': float(row['price'])
                },
                'quantity': row['quantity'],
                'total': float(row['price']) * row['quantity']
            })
        # Convert to list and sort by created_at descending
        orders = list(orders_dict.values())
        orders.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify({'orders': orders})

# --- Get Single Order ---
@app.route('/api/orders/<order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    email = get_jwt_identity()
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user_id = user['id']
        cursor.execute("SELECT * FROM orders WHERE id=%s AND user_id=%s", (order_id, user_id))
        order = cursor.fetchone()
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        cursor.execute("SELECT * FROM order_items WHERE order_id=%s", (order_id,))
        items = cursor.fetchall()
    return jsonify({'order': order, 'items': items})

if __name__ == "__main__":
    socketio.run(app, debug=True) 
from flask import Flask, request, jsonify, session
import pymysql
import bcrypt
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Change this in production

# --- Database Connection ---
def get_db_connection():
    return pymysql.connect(
        host='localhost',
        user='your_mysql_user',
        password='your_mysql_password',
        db='your_db_name',
        cursorclass=pymysql.cursors.DictCursor
    )

# --- User Registration ---
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data['email']
    password = data['password']
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    conn = get_db_connection()
    with conn.cursor() as cursor:
        try:
            cursor.execute("INSERT INTO users (email, password) VALUES (%s, %s)", (email, hashed))
            conn.commit()
            return jsonify({'success': True})
        except pymysql.err.IntegrityError:
            return jsonify({'success': False, 'error': 'Email already exists'})
    conn.close()

# --- User Login ---
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data['email']
    password = data['password']
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            session['user_id'] = user['id']
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Invalid credentials'})
    conn.close()

# --- Checkout (Order Creation) ---
@app.route('/checkout', methods=['POST'])
def checkout():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'})
    data = request.json
    cart = data['cart']  # [{product_id, product_name, price, quantity}, ...]
    total = sum(item['price'] * item['quantity'] for item in cart)
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("INSERT INTO orders (user_id, total) VALUES (%s, %s)", (session['user_id'], total))
        order_id = cursor.lastrowid
        for item in cart:
            cursor.execute(
                "INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (%s, %s, %s, %s, %s)",
                (order_id, item['product_id'], item['product_name'], item['price'], item['quantity'])
            )
        conn.commit()
    conn.close()
    return jsonify({'success': True})

# --- Order History ---
@app.route('/orders', methods=['GET'])
def get_orders():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'})
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM orders WHERE user_id=%s ORDER BY created_at DESC", (session['user_id'],))
        orders = cursor.fetchall()
        for order in orders:
            cursor.execute("SELECT * FROM order_items WHERE order_id=%s", (order['id'],))
            order['items'] = cursor.fetchall()
    conn.close()
    return jsonify({'orders': orders})

# --- Logout ---
@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True})

# --- Main ---
if __name__ == "__main__":
    app.run(debug=True)
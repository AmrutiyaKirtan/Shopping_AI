# Smart Lifestyle Shopping System

An AI-powered all-in-one shopping assistant that combines memory, convenience, and hands-free technology. This system remembers your past purchases for special occasions and automatically suggests reorders with one-touch buttons. You can shop using voice commands while busy cooking or driving, take virtual store tours from home using VR, and use smart shopping carts that scan items and process payments automatically without waiting in checkout lines.

## 🚀 Features

### 🎤 Voice-Controlled Shopping
- **Hands-free shopping** while cooking or driving
- **Natural language processing** for voice commands
- **Smart command recognition** for adding items, searching, and checkout
- **Real-time voice feedback** and status updates

### 🥽 Virtual Reality Store Tours
- **Immersive VR experience** from the comfort of your home
- **3D store navigation** with aisle-by-aisle exploration
- **Interactive product viewing** in virtual environment
- **Realistic shopping simulation** before visiting the store

### 🤖 AI Shopping Assistant
- **Personalized recommendations** based on purchase history
- **Smart memory system** that remembers your preferences
- **Intelligent reorder suggestions** for frequently bought items
- **Chat-based interaction** for shopping assistance

### 🛒 Smart Shopping Cart
- **Barcode scanning** for automatic item addition
- **Real-time cart updates** across all devices
- **Automatic payment processing** - no waiting in lines
- **Inventory tracking** and stock notifications

### 📱 Modern Web Interface
- **Responsive design** that works on all devices
- **Beautiful gradient UI** with glassmorphism effects
- **Real-time updates** using WebSocket connections
- **Intuitive navigation** and user experience

## 🛠️ Technology Stack

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **Flask-JWT-Extended** - Authentication
- **Flask-SocketIO** - Real-time communication
- **OpenAI API** - AI-powered voice processing
- **SQLite** - Database (can be upgraded to PostgreSQL/MySQL)

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **JavaScript (ES6+)** - Interactive functionality
- **Web Speech API** - Voice recognition
- **Socket.IO** - Real-time client-server communication
- **Font Awesome** - Icons
- **Inter Font** - Modern typography

### AI & ML
- **OpenAI GPT-3.5** - Natural language processing
- **Speech Recognition** - Voice command processing
- **Pattern Analysis** - Shopping behavior insights
- **Recommendation Engine** - Personalized suggestions

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Modern web browser with Web Speech API support
- OpenAI API key (optional, for enhanced AI features)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-lifestyle-shopping
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   # Create a .env file
   cp .env.example .env
   
   # Edit .env file with your configuration
   SECRET_KEY=your-secret-key-here
   JWT_SECRET_KEY=your-jwt-secret-key
   OPENAI_API_KEY=your-openai-api-key
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 🎯 Usage Guide

### Getting Started
1. **Register/Login** - Create an account or login to access personalized features
2. **Explore Products** - Browse through different categories or search for specific items
3. **Voice Shopping** - Use voice commands to add items to cart hands-free
4. **VR Tour** - Take a virtual tour of the store (coming soon)
5. **Smart Cart** - Scan barcodes or manually add items to your cart
6. **AI Assistant** - Chat with the AI for recommendations and help

### Voice Commands
- **"Add [product] to cart"** - Add a specific product to your cart
- **"Search for [product]"** - Search for products by name
- **"Show my cart"** - Display current cart contents
- **"Checkout"** - Proceed to checkout process

### Smart Cart Features
- **Barcode Scanning** - Scan product barcodes for automatic addition
- **Manual Entry** - Type barcode numbers manually
- **Real-time Updates** - See cart updates instantly across devices
- **Automatic Checkout** - Process payments without waiting in lines

## 🔧 Configuration

### Environment Variables
```env
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=sqlite:///smart_shopping.db
```

### Database Configuration
The application uses SQLite by default. For production, consider using PostgreSQL or MySQL:

```python
# In app.py, change the database URI
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:pass@localhost/dbname'
```

## 🏗️ Project Structure

```
smart-lifestyle-shopping/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # Project documentation
├── .env.example          # Environment variables template
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── css/
│   │   └── style.css     # Main stylesheet
│   └── js/
│       └── app.js        # Main JavaScript file
└── smart_shopping.db     # SQLite database (created automatically)
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Secure password storage (implement bcrypt in production)
- **CORS Protection** - Cross-origin resource sharing protection
- **Input Validation** - Server-side input validation
- **SQL Injection Protection** - Using SQLAlchemy ORM

## 🚀 Deployment

### Local Development
```bash
python app.py
```

### Production Deployment
1. **Set up a production server** (AWS, DigitalOcean, Heroku, etc.)
2. **Install production dependencies**
   ```bash
   pip install gunicorn
   ```
3. **Configure environment variables**
4. **Run with Gunicorn**
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

### Docker Deployment
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the GPT API
- **Flask** community for the excellent web framework
- **Font Awesome** for the beautiful icons
- **Inter Font** for the modern typography

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation for common issues

## 🔮 Future Enhancements

- **Mobile App** - Native iOS and Android applications
- **AR Integration** - Augmented reality product visualization
- **Blockchain Payments** - Cryptocurrency payment options
- **IoT Integration** - Smart home device connectivity
- **Advanced Analytics** - Detailed shopping behavior analysis
- **Multi-language Support** - Internationalization
- **Social Features** - Shopping lists sharing and recommendations

---

**Built with ❤️ for the future of shopping** 
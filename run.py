#!/usr/bin/env python3
"""
Smart Lifestyle Shopping System - Startup Script
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version: {sys.version.split()[0]}")

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import flask
        import flask_cors
        import flask_sqlalchemy
        import flask_jwt_extended
        import flask_socketio
        print("✅ All required dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please run: pip install -r requirements.txt")
        return False

def create_env_file():
    """Create .env file if it doesn't exist"""
    env_file = Path(".env")
    if not env_file.exists():
        print("📝 Creating .env file from template...")
        try:
            with open("env_example.txt", "r") as f:
                env_content = f.read()
            
            with open(".env", "w") as f:
                f.write(env_content)
            
            print("✅ .env file created successfully")
            print("⚠️  Please edit .env file with your configuration")
        except FileNotFoundError:
            print("⚠️  env_example.txt not found, creating basic .env file")
            with open(".env", "w") as f:
                f.write("SECRET_KEY=your-secret-key-here\n")
                f.write("JWT_SECRET_KEY=your-jwt-secret-key\n")
                f.write("OPENAI_API_KEY=your-openai-api-key\n")
    else:
        print("✅ .env file already exists")

def setup_database():
    """Initialize the database"""
    try:
        from app import app, db
        with app.app_context():
            db.create_all()
            print("✅ Database initialized successfully")
    except Exception as e:
        print(f"⚠️  Database initialization warning: {e}")

def start_server():
    """Start the Flask development server"""
    print("\n🚀 Starting Smart Lifestyle Shopping System...")
    print("📍 Server will be available at: http://localhost:5000")
    print("🛑 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        # Import and run the Flask app
        from app import app, socketio
        socketio.run(
            app,
            host='0.0.0.0',
            port=5000,
            debug=True,
            use_reloader=True
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

def main():
    """Main startup function"""
    print("🛒 Smart Lifestyle Shopping System")
    print("=" * 40)
    
    # Check Python version
    check_python_version()
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Create environment file
    create_env_file()
    
    # Setup database
    setup_database()
    
    # Start server
    start_server()

if __name__ == "__main__":
    main() 
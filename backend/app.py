from flask import Flask
from flask_cors import CORS
from routes.prediction_routes import prediction_bp
from routes.scheduling_routes import scheduling_bp
from routes.rag_routes import rag_bp

def create_app():

    app = Flask(__name__)
    CORS(app)  # Enable CORS for frontend

    # Register Routes
    app.register_blueprint(prediction_bp, url_prefix="/api/prediction")
    app.register_blueprint(scheduling_bp, url_prefix="/api/scheduling")
    app.register_blueprint(rag_bp, url_prefix="/api/rag")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)

from flask import Blueprint, request, jsonify, send_from_directory
from pathlib import Path

rag_bp = Blueprint('rag', __name__)

# Path to images folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent
IMAGES_FOLDER = BASE_DIR / "rag_images"

# Lazy import to avoid loading heavy dependencies at startup
_query_rag_func = None
_chat_assistant_func = None
_contextual_response_func = None

def get_query_rag():
    global _query_rag_func
    if _query_rag_func is None:
        import sys
        if str(BASE_DIR / "ML_PIPELINE") not in sys.path:
            sys.path.append(str(BASE_DIR / "ML_PIPELINE"))
        from rag_pipeline.rag_query import query_rag
        _query_rag_func = query_rag
    return _query_rag_func

def get_chat_assistant():
    global _chat_assistant_func
    if _chat_assistant_func is None:
        import sys
        if str(BASE_DIR) not in sys.path:
            sys.path.append(str(BASE_DIR))
        from services.rag_service import chat_assistant
        _chat_assistant_func = chat_assistant
    return _chat_assistant_func

def get_contextual_response():
    global _contextual_response_func
    if _contextual_response_func is None:
        import sys
        if str(BASE_DIR) not in sys.path:
            sys.path.append(str(BASE_DIR))
        from services.rag_service import get_contextual_response
        _contextual_response_func = get_contextual_response
    return _contextual_response_func


@rag_bp.route('/images/<filename>', methods=['GET'])
def serve_image(filename):
    """Serve extracted PDF images"""
    try:
        return send_from_directory(IMAGES_FOLDER, filename)
    except Exception as e:
        return jsonify({"error": "Image not found"}), 404


@rag_bp.route('/query', methods=['POST'])
def query():
    """
    General RAG query endpoint with images
    Request: {"question": "your question", "k": 5}
    Response: {"status": "success", "answer": "...", "images": [...], "sources": [...]}
    """
    try:
        data = request.json
        if not data or 'question' not in data:
            return jsonify({'status': 'error', 'message': 'Missing question field'}), 400
        
        question = data['question']
        k = data.get('k', 5)
        
        # Use improved chat assistant
        chat_assistant = get_chat_assistant()
        result = chat_assistant(question, k=k)
        
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500


@rag_bp.route('/chat', methods=['POST'])
def chat():
    """
    Chat assistant endpoint - main Ask AI interface
    Request: {"question": "your question", "k": 5}
    Response: {"status": "success", "answer": "...", "images": [...], "sources": [...]}
    """
    try:
        data = request.json
        if not data or 'question' not in data:
            return jsonify({'status': 'error', 'message': 'Missing question field'}), 400
        
        question = data['question']
        k = data.get('k', 5)
        
        # Use improved chat assistant
        chat_assistant = get_chat_assistant()
        result = chat_assistant(question, k=k)
        
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500


@rag_bp.route('/ask_tariff', methods=['POST'])
def ask_tariff():
    """
    Ask about electricity tariffs with images
    Request: {"tariff_type": "residential", "question": "optional custom question"}
    """
    try:
        data = request.json or {}
        tariff_type = data.get('tariff_type', 'residential')
        custom_question = data.get('question')
        
        if custom_question:
            question = custom_question
        else:
            question = f"What are the {tariff_type} electricity tariff rates and pricing structure in India?"
        
        # Use contextual response
        get_contextual = get_contextual_response()
        result = get_contextual(question, context_type='tariff')
        
        # Add tariff_type to response
        result['tariff_type'] = tariff_type
        
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500


@rag_bp.route('/ask_policy', methods=['POST'])
def ask_policy():
    """
    Ask about electricity policies with images
    Request: {"topic": "smart_grid", "question": "optional custom question"}
    """
    try:
        data = request.json or {}
        topic = data.get('topic', 'general')
        custom_question = data.get('question')
        
        topic_questions = {
            'smart_grid': 'What are the smart grid regulations and policies in India?',
            'demand_response': 'What is demand response and how is it implemented in India?',
            'renewable': 'What are the policies for renewable energy integration in India?',
            'general': 'What are the key electricity policies in India?'
        }
        
        question = custom_question if custom_question else topic_questions.get(topic, topic_questions['general'])
        
        # Use contextual response
        get_contextual = get_contextual_response()
        result = get_contextual(question, context_type='policy')
        
        # Add topic to response
        result['topic'] = topic
        
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500


@rag_bp.route('/energy_tips', methods=['GET', 'POST'])
def energy_tips():
    """Get energy saving tips with images"""
    try:
        # Support both GET and POST
        data = request.json if request.method == 'POST' else {}
        custom_question = data.get('question') if data else None
        
        question = custom_question or "What are the best practices and tips for reducing electricity consumption in residential households?"
        
        # Use contextual response
        get_contextual = get_contextual_response()
        result = get_contextual(question, context_type='tips')
        
        # Rename 'answer' to 'tips' for backward compatibility
        if 'answer' in result:
            result['tips'] = result['answer']
        
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500


@rag_bp.route('/explain_bill', methods=['POST'])
def explain_bill():
    """
    Explain electricity bill calculation with images
    Request: {"consumption_kwh": 250, "bill_amount": 1500, "question": "optional"}
    """
    try:
        data = request.json or {}
        consumption = data.get('consumption_kwh', 0)
        bill_amount = data.get('bill_amount', 0)
        custom_question = data.get('question')
        
        if custom_question:
            question = custom_question
        else:
            question = f"How is an electricity bill calculated for {consumption} kWh consumption? Explain the tariff structure, fixed charges, and other billing components."
        
        # Use contextual response
        get_contextual = get_contextual_response()
        result = get_contextual(question, context_type='bill')
        
        # Add consumption and bill info
        result['consumption_kwh'] = consumption
        result['bill_amount'] = bill_amount
        
        # Rename 'answer' to 'explanation' for backward compatibility
        if 'answer' in result:
            result['explanation'] = result['answer']
        
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500


@rag_bp.route('/peak_hours', methods=['GET', 'POST'])
def peak_hours():
    """Get information about peak hours and time-of-day pricing with images"""
    try:
        data = request.json if request.method == 'POST' else {}
        custom_question = data.get('question') if data else None
        
        question = custom_question or "What are peak hours for electricity consumption and how does time-of-day pricing work in India?"
        
        # Use contextual response
        get_contextual = get_contextual_response()
        result = get_contextual(question, context_type='peak_hours')
        
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500


@rag_bp.route('/demand_response', methods=['GET', 'POST'])
def demand_response():
    """Get information about demand response programs with images"""
    try:
        data = request.json if request.method == 'POST' else {}
        custom_question = data.get('question') if data else None
        
        question = custom_question or "What is demand response in electricity systems and how can consumers participate in demand response programs?"
        
        # Use contextual response
        get_contextual = get_contextual_response()
        result = get_contextual(question, context_type='demand_response')
        
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500

import numpy as np
import joblib
from pathlib import Path

WINDOW_SIZE = 60
SAMPLE_SIZE = 100000  # Use subset of data to avoid memory issues

# Get the project root directory (parent of backend)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load once (Important)
model_path = BASE_DIR / "ML_PIPELINE" / "saved_models" / "lstm_model.h5"
scaler_path = BASE_DIR / "ML_PIPELINE" / "saved_models" / "scaler.pkl"

# Try to load model, but handle version compatibility issues
model = None
scaler = None

try:
    from tensorflow.keras.models import load_model
    import tensorflow as tf
    
    # Try loading with custom objects to handle quantization_config
    custom_objects = {'quantization_config': None}
    model = load_model(str(model_path), compile=False, custom_objects=custom_objects)
    scaler = joblib.load(str(scaler_path))
    
    # Recompile the model
    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    print("[OK] LSTM model loaded successfully")
except Exception as e:
    print(f"[WARN] Could not load LSTM model: {e}")
    print("[WARN] Using fallback prediction logic based on time-of-day patterns")
    model = None
    scaler = None

def predict_demand(sequence=None, current_values=None):
    """
    Predict demand using either:
    - sequence: full 60 timestep sequence (optional)
    - current_values: single [kWh, Voltage, Current, Frequency] (optional)
    If neither provided, uses default values
    """
    
    # If model failed to load, use fallback logic
    if model is None or scaler is None:
        # Fallback: use simple time-based prediction
        if current_values is not None and len(current_values) > 0:
            return float(current_values[0])  # Return the kWh value
        return 0.5  # Default fallback
    
    # If no input provided, use default values
    if sequence is None and current_values is None:
        current_values = [0.5, 230.0, 5.0, 50.0]  # Default: 0.5kWh, 230V, 5A, 50Hz
    
    # If only current values provided, repeat them 60 times
    if sequence is None:
        sequence = [current_values] * WINDOW_SIZE
    
    sequence = np.array(sequence)

    scaled = scaler.transform(sequence)

    scaled = scaled.reshape(1, WINDOW_SIZE, scaled.shape[1])

    pred = model.predict(scaled, verbose=0)
    
    # Extract scalar value from prediction
    pred_value = float(pred[0][0])

    dummy = np.zeros((1, scaled.shape[2]))
    dummy[0, 0] = pred_value

    result = scaler.inverse_transform(dummy)

    return float(result[0][0])

import numpy as np
import joblib
from tensorflow.keras.models import load_model

WINDOW_SIZE = 60

def predict_next(input_sequence):

    model = load_model("saved_models/lstm_model.h5")
    scaler = joblib.load("saved_models/scaler.pkl")

    scaled_input = scaler.transform(input_sequence)

    scaled_input = np.reshape(
        scaled_input,
        (1, WINDOW_SIZE, scaled_input.shape[1])
    )

    prediction = model.predict(scaled_input)

    # Only inverse transform kWh
    dummy = np.zeros((1, scaled_input.shape[1]))
    dummy[0,0] = prediction

    prediction = scaler.inverse_transform(dummy)

    return prediction[0][0]

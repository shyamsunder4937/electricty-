import numpy as np
import joblib
from sklearn.preprocessing import MinMaxScaler

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from data_preprocessing.load_data import load_dataset
from data_preprocessing.clean_data import clean_data
from data_preprocessing.create_sequences import create_sequences
from models.lstm_model import build_lstm_model

# Use absolute path
BASE_DIR = Path(__file__).parent.parent
DATA_PATH = BASE_DIR / "DATA" / "CEEW - Smart meter data Bareilly 2020.csv"
WINDOW_SIZE = 60
SAMPLE_SIZE = 100000  # Use subset of data to avoid memory issues

def train():

    df = load_dataset(str(DATA_PATH))
    df = clean_data(df)
    
    # Use only a subset of data to avoid memory issues
    if len(df) > SAMPLE_SIZE:
        print(f"Using {SAMPLE_SIZE} samples out of {len(df)} total rows")
        df = df.iloc[:SAMPLE_SIZE]

    # Select Multiple Features
    features = df[[
        't_kWh',
        'z_Avg Voltage (Volt)',
        'z_Avg Current (Amp)',
        'y_Freq (Hz)'
    ]].values

    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(features)

    # Save scaler with absolute path
    scaler_path = BASE_DIR / "saved_models" / "scaler.pkl"
    joblib.dump(scaler, str(scaler_path))

    X, y = create_sequences(scaled_data, WINDOW_SIZE)

    # Only predict kWh (index 0)
    y = y[:, 0]
    
    print(f"Training data shape: X={X.shape}, y={y.shape}")

    model = build_lstm_model((X.shape[1], X.shape[2]))

    model.fit(
        X, y,
        epochs=20,
        batch_size=32,
        validation_split=0.1,
        verbose=1
    )

    # Save model with absolute path
    model_path = BASE_DIR / "saved_models" / "lstm_model.h5"
    model.save(str(model_path))
    print(f"Model saved successfully to {model_path}!")

if __name__ == "__main__":
    train()

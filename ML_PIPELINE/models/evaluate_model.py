import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
from tensorflow.keras.models import load_model
import sys
from pathlib import Path

# Set style for better-looking plots
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)
plt.rcParams['font.size'] = 10

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))
from data_preprocessing.load_data import load_dataset
from data_preprocessing.clean_data import clean_data
from data_preprocessing.create_sequences import create_sequences

# Use absolute path
BASE_DIR = Path(__file__).parent.parent
DATA_PATH = BASE_DIR / "DATA" / "CEEW - Smart meter data Bareilly 2020.csv"
MODEL_PATH = BASE_DIR / "saved_models" / "lstm_model.h5"
SCALER_PATH = BASE_DIR / "saved_models" / "scaler.pkl"
WINDOW_SIZE = 60
SAMPLE_SIZE = 100000

def evaluate_model():
    """
    Evaluate the trained LSTM model with comprehensive metrics and visualizations
    """
    print("="*60)
    print("LOADING DATA AND MODEL")
    print("="*60)
    
    # Load data
    df = load_dataset(str(DATA_PATH))
    df = clean_data(df)
    
    # Use only a subset of data
    if len(df) > SAMPLE_SIZE:
        print(f"Using {SAMPLE_SIZE} samples out of {len(df)} total rows")
        df = df.iloc[:SAMPLE_SIZE]
    
    # Select features
    features = df[[
        't_kWh',
        'z_Avg Voltage (Volt)',
        'z_Avg Current (Amp)',
        'y_Freq (Hz)'
    ]].values
    
    # Load scaler and transform data
    scaler = joblib.load(str(SCALER_PATH))
    scaled_data = scaler.fit_transform(features)
    
    # Create sequences
    X, y = create_sequences(scaled_data, WINDOW_SIZE)
    y = y[:, 0]  # Only predict kWh
    
    # Split into train and test (90-10 split to match training)
    split_idx = int(len(X) * 0.9)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    print(f"Training set size: {len(X_train)}")
    print(f"Test set size: {len(X_test)}")
    
    # Load model (compile=False to avoid version compatibility issues)
    model = load_model(str(MODEL_PATH), compile=False)
    # Manually compile the model
    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    
    print("\n" + "="*60)
    print("MAKING PREDICTIONS")
    print("="*60)
    
    # Make predictions
    y_train_pred = model.predict(X_train, verbose=0)
    y_test_pred = model.predict(X_test, verbose=0)
    
    # Inverse transform predictions and actual values
    # Create dummy arrays for inverse transform
    train_dummy = np.zeros((len(y_train), 4))
    test_dummy = np.zeros((len(y_test), 4))
    
    train_dummy[:, 0] = y_train
    test_dummy[:, 0] = y_test
    
    train_pred_dummy = np.zeros((len(y_train_pred), 4))
    test_pred_dummy = np.zeros((len(y_test_pred), 4))
    
    train_pred_dummy[:, 0] = y_train_pred.flatten()
    test_pred_dummy[:, 0] = y_test_pred.flatten()
    
    y_train_actual = scaler.inverse_transform(train_dummy)[:, 0]
    y_test_actual = scaler.inverse_transform(test_dummy)[:, 0]
    y_train_pred_actual = scaler.inverse_transform(train_pred_dummy)[:, 0]
    y_test_pred_actual = scaler.inverse_transform(test_pred_dummy)[:, 0]
    
    print("\n" + "="*60)
    print("COMPUTING METRICS")
    print("="*60)
    
    # Calculate metrics for training set
    train_mae = mean_absolute_error(y_train_actual, y_train_pred_actual)
    train_rmse = np.sqrt(mean_squared_error(y_train_actual, y_train_pred_actual))
    train_r2 = r2_score(y_train_actual, y_train_pred_actual)
    train_mape = np.mean(np.abs((y_train_actual - y_train_pred_actual) / (y_train_actual + 1e-10))) * 100
    
    # Calculate metrics for test set
    test_mae = mean_absolute_error(y_test_actual, y_test_pred_actual)
    test_rmse = np.sqrt(mean_squared_error(y_test_actual, y_test_pred_actual))
    test_r2 = r2_score(y_test_actual, y_test_pred_actual)
    test_mape = np.mean(np.abs((y_test_actual - y_test_pred_actual) / (y_test_actual + 1e-10))) * 100
    
    # Print metrics
    print("\nTRAINING SET METRICS:")
    print(f"  MAE (Mean Absolute Error):     {train_mae:.4f} kWh")
    print(f"  RMSE (Root Mean Squared Error): {train_rmse:.4f} kWh")
    print(f"  R² Score:                       {train_r2:.4f}")
    print(f"  MAPE (Mean Absolute % Error):   {train_mape:.2f}%")
    
    print("\nTEST SET METRICS:")
    print(f"  MAE (Mean Absolute Error):     {test_mae:.4f} kWh")
    print(f"  RMSE (Root Mean Squared Error): {test_rmse:.4f} kWh")
    print(f"  R² Score:                       {test_r2:.4f}")
    print(f"  MAPE (Mean Absolute % Error):   {test_mape:.2f}%")
    
    # Calculate residuals
    train_residuals = y_train_actual - y_train_pred_actual
    test_residuals = y_test_actual - y_test_pred_actual
    
    print("\n" + "="*60)
    print("GENERATING VISUALIZATIONS")
    print("="*60)
    
    # Create output directory for plots
    output_dir = BASE_DIR / "evaluation_results"
    output_dir.mkdir(exist_ok=True)
    
    # 1. Actual vs Predicted - Training Set
    plt.figure(figsize=(14, 6))
    plt.subplot(1, 2, 1)
    plt.scatter(y_train_actual, y_train_pred_actual, alpha=0.3, s=10, label='Predictions')
    plt.plot([y_train_actual.min(), y_train_actual.max()], 
             [y_train_actual.min(), y_train_actual.max()], 
             'r--', linewidth=2, label='Perfect Prediction')
    plt.xlabel('Actual kWh', fontsize=12, fontweight='bold')
    plt.ylabel('Predicted kWh', fontsize=12, fontweight='bold')
    plt.title('Training Set: Actual vs Predicted', fontsize=14, fontweight='bold')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    # 2. Actual vs Predicted - Test Set
    plt.subplot(1, 2, 2)
    plt.scatter(y_test_actual, y_test_pred_actual, alpha=0.3, s=10, color='green', label='Predictions')
    plt.plot([y_test_actual.min(), y_test_actual.max()], 
             [y_test_actual.min(), y_test_actual.max()], 
             'r--', linewidth=2, label='Perfect Prediction')
    plt.xlabel('Actual kWh', fontsize=12, fontweight='bold')
    plt.ylabel('Predicted kWh', fontsize=12, fontweight='bold')
    plt.title('Test Set: Actual vs Predicted', fontsize=14, fontweight='bold')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_dir / "actual_vs_predicted.png", dpi=300, bbox_inches='tight')
    print(f"✓ Saved: actual_vs_predicted.png")
    plt.close()
    
    # 3. Time series comparison
    plt.figure(figsize=(16, 5))
    
    # Plot a subset for clarity (first 500 points)
    sample_size = min(500, len(y_test_actual))
    x_range = range(sample_size)
    
    plt.plot(x_range, y_test_actual[:sample_size], label='Actual', linewidth=2, alpha=0.7)
    plt.plot(x_range, y_test_pred_actual[:sample_size], label='Predicted', linewidth=2, alpha=0.7)
    plt.xlabel('Time Steps', fontsize=12, fontweight='bold')
    plt.ylabel('Energy Consumption (kWh)', fontsize=12, fontweight='bold')
    plt.title('Test Set: Time Series Comparison (First 500 Points)', fontsize=14, fontweight='bold')
    plt.legend(fontsize=11)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_dir / "time_series_comparison.png", dpi=300, bbox_inches='tight')
    print(f"✓ Saved: time_series_comparison.png")
    plt.close()
    
    # 4. Residual plots
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # Train residuals vs predictions
    axes[0, 0].scatter(y_train_pred_actual, train_residuals, alpha=0.3, s=10)
    axes[0, 0].axhline(y=0, color='r', linestyle='--', linewidth=2)
    axes[0, 0].set_xlabel('Predicted kWh', fontweight='bold')
    axes[0, 0].set_ylabel('Residuals', fontweight='bold')
    axes[0, 0].set_title('Training Set: Residual Plot', fontweight='bold')
    axes[0, 0].grid(True, alpha=0.3)
    
    # Test residuals vs predictions
    axes[0, 1].scatter(y_test_pred_actual, test_residuals, alpha=0.3, s=10, color='green')
    axes[0, 1].axhline(y=0, color='r', linestyle='--', linewidth=2)
    axes[0, 1].set_xlabel('Predicted kWh', fontweight='bold')
    axes[0, 1].set_ylabel('Residuals', fontweight='bold')
    axes[0, 1].set_title('Test Set: Residual Plot', fontweight='bold')
    axes[0, 1].grid(True, alpha=0.3)
    
    # Train residuals distribution
    axes[1, 0].hist(train_residuals, bins=50, edgecolor='black', alpha=0.7)
    axes[1, 0].axvline(x=0, color='r', linestyle='--', linewidth=2)
    axes[1, 0].set_xlabel('Residuals', fontweight='bold')
    axes[1, 0].set_ylabel('Frequency', fontweight='bold')
    axes[1, 0].set_title('Training Set: Residual Distribution', fontweight='bold')
    axes[1, 0].grid(True, alpha=0.3)
    
    # Test residuals distribution
    axes[1, 1].hist(test_residuals, bins=50, edgecolor='black', alpha=0.7, color='green')
    axes[1, 1].axvline(x=0, color='r', linestyle='--', linewidth=2)
    axes[1, 1].set_xlabel('Residuals', fontweight='bold')
    axes[1, 1].set_ylabel('Frequency', fontweight='bold')
    axes[1, 1].set_title('Test Set: Residual Distribution', fontweight='bold')
    axes[1, 1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_dir / "residual_analysis.png", dpi=300, bbox_inches='tight')
    print(f"✓ Saved: residual_analysis.png")
    plt.close()
    
    # 5. Error distribution comparison
    plt.figure(figsize=(14, 6))
    
    plt.subplot(1, 2, 1)
    errors_train = np.abs(train_residuals)
    plt.hist(errors_train, bins=50, alpha=0.7, edgecolor='black', label='Training')
    plt.xlabel('Absolute Error (kWh)', fontsize=12, fontweight='bold')
    plt.ylabel('Frequency', fontsize=12, fontweight='bold')
    plt.title('Training Set: Error Distribution', fontsize=14, fontweight='bold')
    plt.axvline(x=train_mae, color='r', linestyle='--', linewidth=2, label=f'MAE = {train_mae:.4f}')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    plt.subplot(1, 2, 2)
    errors_test = np.abs(test_residuals)
    plt.hist(errors_test, bins=50, alpha=0.7, edgecolor='black', color='green', label='Test')
    plt.xlabel('Absolute Error (kWh)', fontsize=12, fontweight='bold')
    plt.ylabel('Frequency', fontsize=12, fontweight='bold')
    plt.title('Test Set: Error Distribution', fontsize=14, fontweight='bold')
    plt.axvline(x=test_mae, color='r', linestyle='--', linewidth=2, label=f'MAE = {test_mae:.4f}')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_dir / "error_distribution.png", dpi=300, bbox_inches='tight')
    print(f"✓ Saved: error_distribution.png")
    plt.close()
    
    # 6. Metrics comparison bar chart
    plt.figure(figsize=(12, 6))
    
    metrics_names = ['MAE\n(kWh)', 'RMSE\n(kWh)', 'R² Score', 'MAPE\n(%)']
    train_metrics = [train_mae, train_rmse, train_r2, train_mape]
    test_metrics = [test_mae, test_rmse, test_r2, test_mape]
    
    x = np.arange(len(metrics_names))
    width = 0.35
    
    bars1 = plt.bar(x - width/2, train_metrics, width, label='Training', alpha=0.8, edgecolor='black')
    bars2 = plt.bar(x + width/2, test_metrics, width, label='Test', alpha=0.8, edgecolor='black')
    
    plt.xlabel('Metrics', fontsize=12, fontweight='bold')
    plt.ylabel('Values', fontsize=12, fontweight='bold')
    plt.title('Model Performance Metrics Comparison', fontsize=14, fontweight='bold')
    plt.xticks(x, metrics_names, fontsize=11)
    plt.legend(fontsize=11)
    plt.grid(True, alpha=0.3, axis='y')
    
    # Add value labels on bars
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height:.3f}',
                    ha='center', va='bottom', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(output_dir / "metrics_comparison.png", dpi=300, bbox_inches='tight')
    print(f"✓ Saved: metrics_comparison.png")
    plt.close()
    
    # 7. Prediction accuracy by range
    plt.figure(figsize=(12, 6))
    
    # Bin the actual test values
    bins = np.linspace(y_test_actual.min(), y_test_actual.max(), 10)
    bin_indices = np.digitize(y_test_actual, bins)
    
    bin_centers = []
    bin_maes = []
    
    for i in range(1, len(bins)):
        mask = bin_indices == i
        if mask.sum() > 0:
            bin_centers.append((bins[i-1] + bins[i]) / 2)
            bin_maes.append(mean_absolute_error(y_test_actual[mask], y_test_pred_actual[mask]))
    
    plt.bar(range(len(bin_centers)), bin_maes, alpha=0.7, edgecolor='black')
    plt.xlabel('Energy Consumption Range (kWh)', fontsize=12, fontweight='bold')
    plt.ylabel('Mean Absolute Error (kWh)', fontsize=12, fontweight='bold')
    plt.title('Prediction Accuracy Across Different Consumption Ranges', fontsize=14, fontweight='bold')
    plt.xticks(range(len(bin_centers)), [f'{c:.3f}' for c in bin_centers], rotation=45, ha='right')
    plt.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    plt.savefig(output_dir / "accuracy_by_range.png", dpi=300, bbox_inches='tight')
    print(f"✓ Saved: accuracy_by_range.png")
    plt.close()
    
    # 8. Create a comprehensive summary report
    summary_report = f"""
{'='*70}
                    LSTM MODEL EVALUATION REPORT
{'='*70}

Model Information:
-----------------
Model Type:              LSTM (Long Short-Term Memory)
Window Size:             {WINDOW_SIZE} time steps
Input Features:          4 (kWh, Voltage, Current, Frequency)
Output:                  Energy Consumption (kWh)
Training Samples:        {len(X_train):,}
Test Samples:            {len(X_test):,}

Training Set Performance:
-------------------------
Mean Absolute Error (MAE):          {train_mae:.4f} kWh
Root Mean Squared Error (RMSE):     {train_rmse:.4f} kWh
R² Score:                           {train_r2:.4f}
Mean Absolute Percentage Error:     {train_mape:.2f}%

Test Set Performance:
---------------------
Mean Absolute Error (MAE):          {test_mae:.4f} kWh
Root Mean Squared Error (RMSE):     {test_rmse:.4f} kWh
R² Score:                           {test_r2:.4f}
Mean Absolute Percentage Error:     {test_mape:.2f}%

Model Interpretation:
--------------------
• R² Score: {test_r2:.2%} of the variance in energy consumption is explained by the model
• On average, predictions are off by {test_mae:.4f} kWh (MAE)
• The model shows {'good generalization' if abs(test_r2 - train_r2) < 0.1 else 'some overfitting' if train_r2 - test_r2 > 0.1 else 'potential underfitting'}
  (R² difference: {abs(test_r2 - train_r2):.4f})

Residual Statistics:
-------------------
Training Residuals:
  - Mean:                           {train_residuals.mean():.6f} kWh
  - Std Dev:                        {train_residuals.std():.4f} kWh
  - Min:                            {train_residuals.min():.4f} kWh
  - Max:                            {train_residuals.max():.4f} kWh

Test Residuals:
  - Mean:                           {test_residuals.mean():.6f} kWh
  - Std Dev:                        {test_residuals.std():.4f} kWh
  - Min:                            {test_residuals.min():.4f} kWh
  - Max:                            {test_residuals.max():.4f} kWh

Generated Visualizations:
------------------------
1. actual_vs_predicted.png       - Scatter plots comparing predictions to actual values
2. time_series_comparison.png    - Sequential comparison of predictions over time
3. residual_analysis.png         - Residual plots and distributions
4. error_distribution.png        - Histogram of prediction errors
5. metrics_comparison.png        - Bar chart comparing train vs test metrics
6. accuracy_by_range.png         - Prediction accuracy across consumption ranges

All visualizations saved to: {output_dir}

{'='*70}
                         END OF REPORT
{'='*70}
"""
    
    # Save summary report
    report_path = output_dir / "evaluation_report.txt"
    with open(report_path, 'w') as f:
        f.write(summary_report)
    
    print(summary_report)
    print(f"\n✓ Saved: evaluation_report.txt")
    
    # Save metrics to CSV for easy reference
    metrics_df = pd.DataFrame({
        'Metric': ['MAE (kWh)', 'RMSE (kWh)', 'R² Score', 'MAPE (%)'],
        'Training': [train_mae, train_rmse, train_r2, train_mape],
        'Test': [test_mae, test_rmse, test_r2, test_mape]
    })
    metrics_df.to_csv(output_dir / "metrics_summary.csv", index=False)
    print(f"✓ Saved: metrics_summary.csv")
    
    print("\n" + "="*60)
    print("EVALUATION COMPLETE!")
    print("="*60)
    print(f"\nAll results saved to: {output_dir}")
    
    return {
        'train_metrics': {
            'mae': train_mae,
            'rmse': train_rmse,
            'r2': train_r2,
            'mape': train_mape
        },
        'test_metrics': {
            'mae': test_mae,
            'rmse': test_rmse,
            'r2': test_r2,
            'mape': test_mape
        }
    }

if __name__ == "__main__":
    evaluate_model()

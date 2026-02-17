from flask import Blueprint, request, jsonify
from services.scheduling_service import get_lstm_peak_prediction, pricing_rule, calculate_energy
from services.rag_service import get_pricing_explanation, get_bill_explanation, get_energy_saving_tips
from datetime import datetime, timedelta
import numpy as np

prediction_bp = Blueprint("prediction", __name__)

@prediction_bp.route("/predict_demand", methods=["POST"])
def predict():
    """
    Single demand prediction with detailed RAG explanations
    Request: {
        "time_of_day": 14, 
        "watt": 1000, 
        "duration_hours": 1,
        "appliance_name": "Washing Machine",
        "include_explanations": true
    }
    """
    try:
        data = request.json
        time_of_day = data.get("time_of_day", datetime.now().hour)
        watt = data.get("watt", 1000)
        duration = data.get("duration_hours", 1)
        appliance_name = data.get("appliance_name", "appliance")
        include_explanations = data.get("include_explanations", True)
        
        # Get LSTM prediction
        result = get_lstm_peak_prediction(time_of_day, watt, duration)
        predicted_load = result["predicted_load"]
        
        # Get pricing
        pricing = pricing_rule(predicted_load, time_of_day, result["is_peak_by_lstm"], result["load_category"])
        
        # Calculate energy and cost
        energy_kwh = calculate_energy(watt, duration)
        total_cost = energy_kwh * pricing["price"]

        response = {
            "status": "success",
            "predicted_load": float(predicted_load),
            "load_category": result["load_category"],
            "is_peak": result["is_peak_by_lstm"],
            "price_per_kwh": float(pricing["price"]),
            "energy_kwh": float(energy_kwh),
            "total_cost": float(total_cost),
            "peak_time": bool(pricing["peak"])
        }
        
        # Add RAG-powered explanations
        if include_explanations:
            pricing_result = get_pricing_explanation(
                predicted_load, 
                pricing["price"], 
                pricing["peak"],
                time_of_day,
                appliance_name,
                result["is_peak_by_lstm"],
                result.get("peak_reason")
            )
            
            bill_result = get_bill_explanation(
                energy_kwh, 
                total_cost, 
                watt,
                appliance_name,
                duration,
                time_of_day,
                pricing["peak"]
            )
            
            tips_result = get_energy_saving_tips(
                watt, 
                duration,
                appliance_name,
                time_of_day,
                pricing["peak"],
                predicted_load
            )
            
            response["explanations"] = {
                "pricing_explanation": pricing_result.get("text", pricing_result) if isinstance(pricing_result, dict) else pricing_result,
                "pricing_images": pricing_result.get("images", []) if isinstance(pricing_result, dict) else [],
                "bill_explanation": bill_result.get("text", bill_result) if isinstance(bill_result, dict) else bill_result,
                "bill_images": bill_result.get("images", []) if isinstance(bill_result, dict) else [],
                "energy_saving_tips": tips_result.get("text", tips_result) if isinstance(tips_result, dict) else tips_result,
                "tips_images": tips_result.get("images", []) if isinstance(tips_result, dict) else []
            }
        
        return jsonify(response)

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        })


@prediction_bp.route("/predict_hourly", methods=["POST"])
def predict_hourly():
    """
    Predict demand for next N hours with varying loads
    Request: {"hours": 24, "watt": 1000, "duration_hours": 1}
    """
    try:
        data = request.json or {}
        hours = data.get("hours", 24)
        watt = data.get("watt", 1000)
        duration = data.get("duration_hours", 1)
        
        predictions = []
        current_time = datetime.now()
        
        for i in range(hours):
            hour = (current_time + timedelta(hours=i)).hour
            
            # Get LSTM prediction for this specific hour
            lstm_pred = get_lstm_peak_prediction(hour, watt, duration)
            pred_load = lstm_pred["predicted_load"]
            load_category = lstm_pred["load_category"]
            
            # Get pricing
            pricing = pricing_rule(pred_load, hour, lstm_pred["is_peak_by_lstm"], load_category)
            
            predictions.append({
                "hour": hour,
                "timestamp": (current_time + timedelta(hours=i)).isoformat(),
                "predicted_load": float(pred_load),
                "load_category": load_category,
                "price_per_kwh": float(pricing["price"]),
                "pricing_category": pricing["category"],
                "peak_time": bool(pricing["peak"])
            })
        
        return jsonify({
            "status": "success",
            "predictions": predictions
        })
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        })


@prediction_bp.route("/predict_best_time", methods=["POST"])
def predict_best_time():
    """
    Find best time to run appliance in next N hours with detailed explanations
    Request: {
        "hours": 24, 
        "duration_hours": 2, 
        "watt": 1500,
        "appliance_name": "Heater",
        "include_explanations": true
    }
    """
    try:
        data = request.json
        hours = data.get("hours", 24)
        duration = float(data.get("duration_hours", 1))
        watt = float(data.get("watt", 1000))
        appliance_name = data.get("appliance_name", "appliance")
        include_explanations = data.get("include_explanations", True)
        
        energy_kwh = calculate_energy(watt, duration)
        
        # Predict for each hour with time-varying loads
        time_slots = []
        current_time = datetime.now()
        
        for i in range(hours):
            hour = (current_time + timedelta(hours=i)).hour
            
            # Get LSTM prediction for this specific hour
            lstm_pred = get_lstm_peak_prediction(hour, watt, duration)
            pred_load = lstm_pred["predicted_load"]
            load_category = lstm_pred["load_category"]
            
            # Get pricing
            pricing = pricing_rule(pred_load, hour, lstm_pred["is_peak_by_lstm"], load_category)
            cost = energy_kwh * pricing["price"]
            
            time_slots.append({
                "hour": hour,
                "timestamp": (current_time + timedelta(hours=i)).isoformat(),
                "predicted_load": float(pred_load),
                "load_category": load_category,
                "price_per_kwh": float(pricing["price"]),
                "pricing_category": pricing["category"],
                "total_cost": float(cost),
                "peak_time": bool(pricing["peak"])
            })
        
        # Sort by cost
        time_slots_sorted = sorted(time_slots, key=lambda x: x["total_cost"])
        best_time = time_slots_sorted[0]
        worst_time = time_slots_sorted[-1]
        
        savings = worst_time["total_cost"] - best_time["total_cost"]
        savings_percent = (savings / worst_time["total_cost"]) * 100 if worst_time["total_cost"] > 0 else 0
        
        response = {
            "status": "success",
            "appliance": {
                "name": appliance_name,
                "watt": watt,
                "duration_hours": duration,
                "energy_kwh": energy_kwh
            },
            "best_time": best_time,
            "worst_time": worst_time,
            "potential_savings": {
                "amount": float(savings),
                "percentage": float(savings_percent)
            },
            "all_time_slots": time_slots_sorted
        }
        
        # Add RAG explanations for best and worst times
        if include_explanations:
            # Explanation for best time
            best_pricing_result = get_pricing_explanation(
                best_time["predicted_load"],
                best_time["price_per_kwh"],
                best_time["peak_time"],
                best_time["hour"],
                appliance_name
            )
            
            # Explanation for worst time
            worst_pricing_result = get_pricing_explanation(
                worst_time["predicted_load"],
                worst_time["price_per_kwh"],
                worst_time["peak_time"],
                worst_time["hour"],
                appliance_name
            )
            
            # General energy saving tips
            tips_result = get_energy_saving_tips(
                watt,
                duration,
                appliance_name,
                best_time["hour"],
                best_time["peak_time"]
            )
            
            response["explanations"] = {
                "best_time_explanation": best_pricing_result.get("text", best_pricing_result) if isinstance(best_pricing_result, dict) else best_pricing_result,
                "best_time_images": best_pricing_result.get("images", []) if isinstance(best_pricing_result, dict) else [],
                "worst_time_explanation": worst_pricing_result.get("text", worst_pricing_result) if isinstance(worst_pricing_result, dict) else worst_pricing_result,
                "worst_time_images": worst_pricing_result.get("images", []) if isinstance(worst_pricing_result, dict) else [],
                "energy_saving_tips": tips_result.get("text", tips_result) if isinstance(tips_result, dict) else tips_result,
                "tips_images": tips_result.get("images", []) if isinstance(tips_result, dict) else [],
                "savings_summary": f"By running your {appliance_name} at {best_time['hour']}:00 instead of {worst_time['hour']}:00, you can save ₹{savings:.2f} ({savings_percent:.1f}% savings)!"
            }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        })


@prediction_bp.route("/predict_daily_pattern", methods=["GET"])
def predict_daily_pattern():
    """
    Get 24-hour load and pricing pattern with time-varying predictions
    """
    try:
        # Use a typical appliance for baseline (1000W, 1 hour)
        watt = 1000
        duration = 1
        
        hourly_data = []
        for hour in range(24):
            # Get LSTM prediction for this specific hour
            lstm_pred = get_lstm_peak_prediction(hour, watt, duration)
            pred_load = lstm_pred["predicted_load"]
            load_category = lstm_pred["load_category"]
            
            # Get pricing
            pricing = pricing_rule(pred_load, hour, lstm_pred["is_peak_by_lstm"], load_category)
            
            hourly_data.append({
                "hour": hour,
                "predicted_load": float(pred_load),
                "load_category": load_category,
                "price_per_kwh": float(pricing["price"]),
                "pricing_category": pricing["category"],
                "peak_time": bool(pricing["peak"])
            })
        
        # Calculate statistics
        loads = [d["predicted_load"] for d in hourly_data]
        prices = [d["price_per_kwh"] for d in hourly_data]
        
        # Count categories
        off_peak_count = sum(1 for d in hourly_data if d["load_category"] == "off-peak")
        moderate_count = sum(1 for d in hourly_data if d["load_category"] == "moderate")
        peak_count = sum(1 for d in hourly_data if d["load_category"] == "peak")
        
        return jsonify({
            "status": "success",
            "hourly_pattern": hourly_data,
            "statistics": {
                "avg_load": float(np.mean(loads)),
                "max_load": float(np.max(loads)),
                "min_load": float(np.min(loads)),
                "avg_price": float(np.mean(prices)),
                "max_price": float(np.max(prices)),
                "min_price": float(np.min(prices)),
                "off_peak_hours": off_peak_count,
                "moderate_hours": moderate_count,
                "peak_hours": peak_count
            }
        })
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        })


@prediction_bp.route("/compare_times", methods=["POST"])
def compare_times():
    """
    Compare cost of running appliance at different times with explanations
    Request: {
        "watt": 1500, 
        "duration_hours": 2, 
        "times": [6, 14, 22],
        "appliance_name": "AC",
        "include_explanations": true
    }
    """
    try:
        data = request.json
        watt = float(data.get("watt", 1000))
        duration = float(data.get("duration_hours", 1))
        times = data.get("times", [0, 6, 12, 18])
        appliance_name = data.get("appliance_name", "appliance")
        include_explanations = data.get("include_explanations", True)
        
        energy_kwh = calculate_energy(watt, duration)
        
        comparisons = []
        for hour in times:
            # Get LSTM prediction for this specific hour
            lstm_pred = get_lstm_peak_prediction(hour, watt, duration)
            pred_load = lstm_pred["predicted_load"]
            load_category = lstm_pred["load_category"]
            
            # Get pricing
            pricing = pricing_rule(pred_load, hour, lstm_pred["is_peak_by_lstm"], load_category)
            cost = energy_kwh * pricing["price"]
            
            comparison_item = {
                "hour": hour,
                "predicted_load": float(pred_load),
                "load_category": load_category,
                "price_per_kwh": float(pricing["price"]),
                "pricing_category": pricing["category"],
                "total_cost": float(cost),
                "peak_time": bool(pricing["peak"])
            }
            
            # Add explanation for this time slot if requested
            if include_explanations:
                pricing_result = get_pricing_explanation(
                    pred_load,
                    pricing["price"],
                    pricing["peak"],
                    hour,
                    appliance_name
                )
                comparison_item["explanation"] = pricing_result.get("text", pricing_result) if isinstance(pricing_result, dict) else pricing_result
                comparison_item["images"] = pricing_result.get("images", []) if isinstance(pricing_result, dict) else []
            
            comparisons.append(comparison_item)
        
        # Find best and worst
        best = min(comparisons, key=lambda x: x["total_cost"])
        worst = max(comparisons, key=lambda x: x["total_cost"])
        max_savings = float(worst["total_cost"] - best["total_cost"])
        
        response = {
            "status": "success",
            "appliance": {
                "name": appliance_name,
                "watt": watt,
                "duration_hours": duration,
                "energy_kwh": energy_kwh
            },
            "comparisons": comparisons,
            "best": best,
            "worst": worst,
            "max_savings": max_savings
        }
        
        # Add summary explanation
        if include_explanations:
            tips_result = get_energy_saving_tips(
                watt,
                duration,
                appliance_name,
                best["hour"],
                best["peak_time"]
            )
            
            response["summary"] = {
                "recommendation": f"Best time to run your {appliance_name}: {best['hour']}:00 (₹{best['total_cost']:.2f})",
                "worst_time": f"Avoid running at {worst['hour']}:00 (₹{worst['total_cost']:.2f})",
                "savings": f"Save up to ₹{max_savings:.2f} by choosing the right time!",
                "energy_tips": tips_result.get("text", tips_result) if isinstance(tips_result, dict) else tips_result,
                "tips_images": tips_result.get("images", []) if isinstance(tips_result, dict) else []
            }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        })


@prediction_bp.route("/health", methods=["GET"])
def health():
    """Check if prediction service is working"""
    try:
        # Test prediction for noon
        test_pred = get_lstm_peak_prediction(12, 1000, 1)
        
        return jsonify({
            "status": "success",
            "message": "Prediction service is healthy",
            "test_prediction": test_pred
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

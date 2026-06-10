from flask import Blueprint, request, jsonify, send_from_directory
from services.lstm_service import predict_demand
from services.scheduling_service import calculate_energy, pricing_rule
from services.rag_service import get_pricing_explanation, get_bill_explanation, get_energy_saving_tips
from pathlib import Path

scheduling_bp = Blueprint("scheduling", __name__)

# Path to images folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent
IMAGES_FOLDER = BASE_DIR / "rag_images"


@scheduling_bp.route("/images/<filename>", methods=["GET"])
def serve_image(filename):
    """Serve extracted PDF images with proper MIME types"""
    try:
        # Determine MIME type based on file extension
        if filename.lower().endswith('.png'):
            mimetype = 'image/png'
        elif filename.lower().endswith(('.jpg', '.jpeg')):
            mimetype = 'image/jpeg'
        elif filename.lower().endswith('.gif'):
            mimetype = 'image/gif'
        elif filename.lower().endswith('.webp'):
            mimetype = 'image/webp'
        else:
            # Default or unsupported format
            mimetype = 'application/octet-stream'
        
        return send_from_directory(IMAGES_FOLDER, filename, mimetype=mimetype)
    except Exception as e:
        return jsonify({"error": "Image not found"}), 404

@scheduling_bp.route("/schedule_appliance", methods=["POST"])
def schedule():

    try:
        data = request.json

        watt = float(data["watt"])
        duration = float(data["duration_hours"])
        time_of_day = data.get("time_of_day")  # Optional: hour in 24-hour format (0-23)
        
        # Day selection handling
        schedule_type = data.get("schedule_type", "every day")  # "every day", "weekdays", "custom"
        selected_days = data.get("selected_days", [])  # List of days: ["monday", "tuesday", etc.]
        
        # Optional: sequence or current_values
        sequence = data.get("sequence")
        current_values = data.get("current_values")
        
        # Optional: request explanations
        include_explanations = data.get("include_explanations", True)
        
        # Validate and convert time_of_day to int if provided
        if time_of_day is not None:
            time_of_day = int(time_of_day)

        # Step 1 → LSTM Prediction
        predicted_load = predict_demand(sequence=sequence, current_values=current_values)
        
        # Ensure predicted_load is a scalar float
        if hasattr(predicted_load, '__iter__') and not isinstance(predicted_load, str):
            predicted_load = float(predicted_load[0]) if len(predicted_load) > 0 else 0.5
        else:
            predicted_load = float(predicted_load)

        # Step 2 → Appliance Energy
        energy = calculate_energy(watt, duration)

        # Step 3 → Pricing (considers time of day)
        pricing = pricing_rule(predicted_load, time_of_day)

        total_cost = energy * pricing["price"]

        response = {
            "status": "success",
            "predicted_grid_load": float(predicted_load),
            "energy_kwh": float(energy),
            "price_per_kwh": float(pricing["price"]),
            "total_cost": float(total_cost),
            "peak_time": bool(pricing["peak"]),
            "schedule_type": schedule_type,
            "selected_days": selected_days
        }
        
        # Add RAG-based explanations if requested
        if include_explanations:
            appliance_name = data.get("appliance_name", "appliance")
            
            pricing_result = get_pricing_explanation(
                predicted_load, 
                pricing["price"], 
                pricing["peak"],
                time_of_day,
                appliance_name
            )
            
            bill_result = get_bill_explanation(
                energy, 
                total_cost, 
                watt,
                appliance_name,
                duration
            )
            
            tips_result = get_energy_saving_tips(
                watt, 
                duration,
                appliance_name,
                time_of_day
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
        import traceback
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


@scheduling_bp.route("/schedule_appliances", methods=["POST"])
def schedule_appliances():
    """
    Smart appliance scheduling with user comfort considerations and rebound peak detection
    
    Request: {
        "room_name": "Living Room",
        "appliances": [
            {
                "name": "Heater",
                "wattage": 2000,
                "start_time": 8,
                "duration_hours": 2,
                "user_comfort_priority": "high"  // optional: "high", "medium", "low"
            }
        ],
        "include_explanations": true,
        "show_detailed_hours": false  // optional: show all 24 hours or just relevant ones
    }
    """
    try:
        from services.scheduling_service import get_lstm_peak_prediction
        from datetime import datetime
        
        data = request.json
        room_name = data.get("room_name", "Room")
        appliances = data.get("appliances", [])
        # SPEED OPTIMIZATION: Default to False to skip slow RAG loading
        include_explanations = data.get("include_explanations", False)
        show_detailed_hours = data.get("show_detailed_hours", False)
        
        if not appliances:
            return jsonify({
                "status": "error",
                "message": "Please provide at least one appliance"
            }), 400
        
        # Helper function to get comfort score for appliance at specific time
        def get_comfort_score(appliance_name, hour):
            """Rate comfort/practicality of using appliance at this hour (1-10)"""
            name_lower = appliance_name.lower()
            
            if "heater" in name_lower or "geyser" in name_lower:
                # Heater: Best in morning (6-9) and evening (6-10 PM)
                if 6 <= hour <= 9 or 18 <= hour <= 22:
                    return 10  # Perfect time
                elif 5 <= hour <= 10 or 17 <= hour <= 23:
                    return 8  # Good time
                elif 23 <= hour or hour <= 5:
                    return 3  # Night - impractical
                else:
                    return 5  # Mid-day - uncomfortable
            
            elif "ac" in name_lower:
                # AC: Best in afternoon/evening (12 PM - 11 PM)
                if 14 <= hour <= 23:
                    return 10  # Perfect time
                elif 12 <= hour <= 14 or hour == 0:
                    return 7  # Okay time
                else:
                    return 3  # Morning/night - impractical
            
            elif "washing" in name_lower:
                # Washing machine: Flexible, but not late night
                if 7 <= hour <= 22:
                    return 10  # Anytime during day
                elif 22 <= hour <= 24 or 6 <= hour <= 7:
                    return 7  # Early morning/late evening okay
                else:
                    return 4  # Middle of night - impractical
            
            else:
                # Other appliances: generally flexible
                if 6 <= hour <= 23:
                    return 9
                else:
                    return 5
        
        # Helper function to detect rebound peak
        def detect_rebound_peak(hour, wattage, duration):
            """Check if a time slot can cause rebound peak - IMPROVED DETECTION
            
            With the new granular hourly base load model:
            - Off-peak hours: 0-5 (base 0.14-0.22)
            - Moderate hours: 10-16, 23 (base 0.35-0.58)
            - Peak hours: 6-9, 17-22 (base 0.55-0.85)
            
            Rebound peak scenarios detect when many users shift to the SAME 
            off-peak/moderate slot, creating artificial demand spikes.
            """
            # Get predictions for the hour and surrounding hours
            current_pred = get_lstm_peak_prediction(hour, wattage, duration)
            
            # Check hour before and after
            hour_before = (hour - 1) % 24
            hour_after = (hour + 1) % 24
            
            pred_before = get_lstm_peak_prediction(hour_before, wattage, duration)
            pred_after = get_lstm_peak_prediction(hour_after, wattage, duration)
            
            is_rebound = False
            rebound_reason = None
            risk_level = "LOW"
            
            # REBOUND PEAK SCENARIO 1: Off-peak time with high-wattage appliance
            # This is the MAIN rebound peak scenario - many users shift to "off-peak" creating new peak
            if current_pred["load_category"] == "off-peak" and wattage >= 1000:
                is_rebound = True
                risk_level = "HIGH" if wattage >= 2000 else "MEDIUM"
                
                # Explain based on time and comfort
                comfort = get_comfort_score(name, hour)
                if comfort <= 5:
                    rebound_reason = f"⚠️ UNCOMFORTABLE TIME: Almost nobody uses {name} at {hour}:00 (comfort: {comfort}/100). Users may override this schedule and actually run the appliance during natural peak hours instead."
                elif 22 <= hour or hour <= 5:  # Night
                    rebound_reason = f"⚠️ UNCOMFORTABLE TIME: Using {name} at {hour}:00 is impractical for most users. Many will ignore this schedule and use during peak hours, defeating the purpose."
                else:
                    rebound_reason = f"⚠️ REBOUND RISK: Many users scheduling {wattage}W appliances at {hour}:00 (thinking it's off-peak) creates collective demand surge."
            
            # REBOUND PEAK SCENARIO 2: Transition from off-peak to moderate/peak
            # e.g., 5:00 (off-peak) → 6:00 (moderate/peak) — appliances clustered at transition boundary
            elif (pred_before["load_category"] == "off-peak" and 
                  current_pred["load_category"] in ["moderate", "peak"]):
                is_rebound = True
                risk_level = "MEDIUM"
                rebound_reason = f"⚠️ DEMAND SURGE: Transitioning from off-peak ({hour_before}:00) to {current_pred['load_category']} ({hour}:00). Many appliances starting simultaneously at the off-peak boundary."
            
            # REBOUND PEAK SCENARIO 3: Moderate-hour clustering for high-watt appliances
            # AI commonly recommends moderate hours (10-16) for cost savings, causing clustering
            elif current_pred["load_category"] == "moderate" and wattage >= 1000:
                # These are commonly AI-recommended "cheap" hours
                if hour in [10, 11, 12, 13, 14, 15, 16, 23]:
                    is_rebound = True
                    risk_level = "MEDIUM"
                    rebound_reason = f"⚠️ CLUSTERING RISK: {hour}:00 is commonly recommended as 'off-peak/moderate', causing many users to cluster {wattage}W appliances here, creating a moderate demand spike."
            
            return {
                "is_rebound_peak": is_rebound,
                "rebound_reason": rebound_reason,
                "risk_level": risk_level,
                "hour_before_load": pred_before["load_category"],
                "current_load": current_pred["load_category"],
                "hour_after_load": pred_after["load_category"],
                "comfort_score": get_comfort_score(name, hour)
            }
        
        # Helper function to generate user comfort suggestions
        def get_comfort_suggestions(name, wattage, start_time, duration, current_status, current_cost):
            """Generate comfort-preserving cost-saving suggestions with PRACTICAL explanations"""
            suggestions = []
            
            name_lower = name.lower()
            
            # Heater suggestions - PRACTICAL AND CONTEXT-AWARE
            if "heater" in name_lower or "geyser" in name_lower:
                if current_status == "PEAK":
                    # Morning peak (7-9 AM)
                    if start_time >= 7 and start_time <= 9:
                        suggestions.append({
                            "type": "time_shift",
                            "suggestion": f"⚠️ PEAK ALERT: {start_time}:00 is morning rush hour when everyone uses heaters. Pre-heat at 6:00 AM (before peak) to save ₹{current_cost * 0.5:.2f}",
                            "comfort_impact": "none",
                            "reason": f"At {start_time}:00, thousands of homes turn on heaters simultaneously, causing peak demand. Starting 1 hour earlier avoids this surge while your room stays warm.",
                            "practical_tip": "Set a timer to start heating at 6 AM. Room will be warm by the time you wake up, and you save 50% on costs."
                        })
                    # Evening peak (6-10 PM)
                    elif start_time >= 18 and start_time <= 22:
                        suggestions.append({
                            "type": "time_shift",
                            "suggestion": f"⚠️ PEAK ALERT: {start_time}:00 is evening rush hour. Heat at 5:00 PM (before peak) or 11:00 PM (after peak) to save ₹{current_cost * 0.5:.2f}",
                            "comfort_impact": "minimal",
                            "reason": f"At {start_time}:00, everyone returns home and turns on heaters, creating peak demand. Pre-heating or late heating avoids high costs.",
                            "practical_tip": "Pre-heat at 5 PM so room is warm when you arrive, or use at 11 PM if you can wait."
                        })
                    else:
                        suggestions.append({
                            "type": "time_shift",
                            "suggestion": f"Shift heater to late night (11 PM-5 AM) when rates are lowest (₹5/kWh vs ₹{current_cost/duration:.0f}/kWh now)",
                            "comfort_impact": "low",
                            "reason": "Very few people use heaters at night, so electricity is cheapest. Room retains heat for hours.",
                            "practical_tip": "Heat room before sleeping. Well-insulated rooms stay warm for 3-4 hours."
                        })
                
                # Duration optimization
                if duration > 2:
                    suggestions.append({
                        "type": "duration_optimization",
                        "suggestion": f"Reduce heating from {duration}h to {duration-1}h. Room retains heat, you save ₹{(current_cost/duration):.2f}",
                        "comfort_impact": "minimal",
                        "reason": "Rooms stay warm for 1-2 hours after heater is off. No need to run continuously.",
                        "practical_tip": "Heat for 1-2 hours, then turn off. Use blankets to maintain warmth."
                    })
                
                # Reduce other loads
                suggestions.append({
                    "type": "load_management",
                    "suggestion": f"While using heater at {start_time}:00, turn off AC, geyser, or other high-load appliances",
                    "comfort_impact": "none",
                    "reason": f"Running multiple high-power appliances together increases your load category from moderate to peak, raising costs by 30-40%.",
                    "practical_tip": "Use only one high-power appliance at a time. Stagger usage by 1-2 hours."
                })
            
            # AC suggestions - PRACTICAL
            elif "ac" in name_lower or "air conditioner" in name_lower or "conditioner" in name_lower:
                # Specific 24°C recommendation
                savings_24c = current_cost * 0.24
                suggestions.append({
                    "type": "temperature_optimization",
                    "suggestion": f"Set AC to 24°C (currently optimal). Each degree lower costs ₹{current_cost * 0.06:.2f} more",
                    "comfort_impact": "optimal",
                    "potential_savings": f"₹{savings_24c:.2f} if you're using 20°C now",
                    "reason": "24°C is the BEE (Bureau of Energy Efficiency) recommended temperature. It's comfortable and efficient.",
                    "practical_tip": "Use ceiling fan with AC at 24°C. Feels like 22°C but uses 25% less power."
                })

                if current_status == "PEAK":
                    if start_time >= 18 and start_time <= 22:
                        suggestions.append({
                            "type": "time_shift",
                            "suggestion": f"⚠️ PEAK ALERT: {start_time}:00 is evening rush (everyone uses AC). Pre-cool at 5:00 PM to save ₹{current_cost * 0.5:.2f}",
                            "comfort_impact": "none",
                            "reason": f"At {start_time}:00, peak demand drives rates to ₹10/kWh. Pre-cooling at 5 PM costs only ₹7/kWh.",
                            "practical_tip": "Cool room before peak hours. Close doors/windows to retain coolness."
                        })
                    else:
                        suggestions.append({
                            "type": "time_shift",
                            "suggestion": f"Shift AC to late night (11 PM-6 AM) when rates drop to ₹5/kWh (save ₹{current_cost * 0.5:.2f})",
                            "comfort_impact": "depends on schedule",
                            "reason": "Night hours have lowest demand and cheapest rates. Perfect for bedroom cooling.",
                            "practical_tip": "Use AC timer to start at 11 PM. Room stays cool through the night."
                        })
                
                # Reduce other loads
                suggestions.append({
                    "type": "load_management",
                    "suggestion": f"Turn off geyser, heater, or washing machine while AC is running",
                    "comfort_impact": "none",
                    "potential_savings": "₹50-100/month",
                    "reason": "Running AC with other high-power appliances pushes you into peak pricing tier.",
                    "practical_tip": "Heat water before using AC, or use washing machine after AC is off."
                })
            
            # Washing Machine - PRACTICAL
            elif "washing" in name_lower or "washer" in name_lower:
                # PRIORITY 1: If user chose a reasonable time (not peak), give load management tips
                if current_status != "PEAK":
                    suggestions.append({
                        "type": "load_management",
                        "suggestion": f"✅ Good time choice! To maximize savings: Turn off AC, heater, or geyser while washing machine runs",
                        "comfort_impact": "none",
                        "potential_savings": "₹20-40/cycle",
                        "reason": f"At {start_time}:00, you're paying ₹{current_pricing['price']}/kWh. Running multiple high-power appliances together pushes you into peak pricing.",
                        "practical_tip": "Use washing machine alone. Heat water before or after washing cycle."
                    })
                    
                    suggestions.append({
                        "type": "usage_optimization",
                        "suggestion": "Run full loads only. Half loads waste 50% of electricity per kg of clothes",
                        "comfort_impact": "none",
                        "potential_savings": "₹30-50/month",
                        "reason": "Washing machine uses same power for half load or full load. Maximize efficiency.",
                        "practical_tip": "Collect clothes for 2-3 days, then wash full load."
                    })
                
                # PRIORITY 2: Only suggest time shift if it's PEAK hour
                if current_status == "PEAK":
                    suggestions.append({
                        "type": "time_shift",
                        "suggestion": f"⚠️ PEAK HOUR: {start_time}:00 costs ₹{current_pricing['price']}/kWh. Shift to 2:00 PM or 10:00 PM to save ₹{current_cost * 0.5:.2f}",
                        "comfort_impact": "minimal",
                        "reason": f"At {start_time}:00, peak demand drives rates high. Mid-afternoon (2-4 PM) or late evening (10-11 PM) are cheaper.",
                        "practical_tip": "Use delayed start feature. Load now, set to start at 2 PM or 10 PM."
                    })
                else:
                    # If off-peak/moderate, emphasize load management over time shift
                    suggestions.append({
                        "type": "duration_optimization",
                        "suggestion": f"Use quick wash cycle (30-45 min) instead of full cycle to reduce runtime by 50%",
                        "comfort_impact": "none",
                        "potential_savings": f"₹{current_cost * 0.3:.2f} per wash",
                        "reason": "Quick wash uses less water heating time, cutting energy consumption significantly.",
                        "practical_tip": "Quick wash works well for lightly soiled clothes. Save full cycles for heavily soiled items."
                    })
            
            # Geyser/Water Heater - PRACTICAL
            elif "geyser" in name_lower or "water heater" in name_lower:
                if current_status == "PEAK":
                    if start_time >= 6 and start_time <= 9:
                        suggestions.append({
                            "type": "time_shift",
                            "suggestion": f"⚠️ MORNING PEAK: Everyone heats water at {start_time}:00. Heat at 5:30 AM (before peak) to save ₹{current_cost * 0.5:.2f}",
                            "comfort_impact": "none",
                            "reason": f"At {start_time}:00, peak demand costs ₹10/kWh. Just 30 minutes earlier costs ₹5/kWh.",
                            "practical_tip": "Set timer for 5:30 AM. Water stays hot for 2-3 hours in insulated tank."
                        })
                
                suggestions.append({
                    "type": "usage_optimization",
                    "suggestion": "Heat water at night (11 PM), use in morning. Insulated geysers retain heat for 8-10 hours",
                    "comfort_impact": "none",
                    "potential_savings": f"₹{current_cost * 0.5:.2f} per use",
                    "reason": "Night electricity is 50% cheaper. Modern geysers keep water hot overnight.",
                    "practical_tip": "Heat at 11 PM, use at 7 AM. Add insulation blanket to geyser for better retention."
                })
            
            return suggestions
        
        # Analyze each appliance
        appliance_analysis = []
        total_current_cost = 0
        total_best_cost = 0
        total_energy = 0
        
        for appliance in appliances:
            name = appliance.get("name", "Unknown Appliance")
            wattage = float(appliance.get("wattage", 0))
            start_time = int(appliance.get("start_time", datetime.now().hour))
            duration = float(appliance.get("duration_hours", 1))
            comfort_priority = appliance.get("user_comfort_priority", "medium")
            
            if wattage <= 0:
                continue
            
            # Calculate energy consumption
            energy_kwh = calculate_energy(wattage, duration)
            total_energy += energy_kwh
            
            # Get prediction for scheduled time
            current_prediction = get_lstm_peak_prediction(start_time, wattage, duration)
            current_pricing = pricing_rule(
                current_prediction["predicted_load"],
                start_time,
                current_prediction["is_peak_by_lstm"],
                current_prediction["load_category"]
            )
            current_cost = energy_kwh * current_pricing["price"]
            total_current_cost += current_cost
            
            # Detect rebound peak for current time
            rebound_info = detect_rebound_peak(start_time, wattage, duration)
            
            # Find best time and alternative times
            best_time_slot = None
            min_cost = float('inf')
            alternative_times = []  # Store comfort-friendly alternatives NEAR user's time
            
            # Define practical hours for different appliances
            if "heater" in name.lower() or "geyser" in name.lower():
                # Heater: practical times are 5-10 AM, 5-11 PM
                practical_hours = list(range(5, 11)) + list(range(17, 24))
            elif "ac" in name.lower() or "air" in name.lower():
                # AC: practical times are 10 AM - 11 PM
                practical_hours = list(range(10, 24))
            elif "washing" in name.lower():
                # Washing machine: practical daytime hours 7 AM - 10 PM
                practical_hours = list(range(7, 23))
            else:
                # Other appliances: daytime hours preferred
                practical_hours = list(range(6, 23))
            
            # PRIORITIZE: Find best time within PRACTICAL hours first
            best_practical_time = None
            min_practical_cost = float('inf')
            absolute_best_slot = None
            absolute_min_cost = float('inf')
            
            for hour in range(24):
                prediction = get_lstm_peak_prediction(hour, wattage, duration)
                pricing = pricing_rule(
                    prediction["predicted_load"],
                    hour,
                    prediction["is_peak_by_lstm"],
                    prediction["load_category"]
                )
                cost = energy_kwh * pricing["price"]
                
                # Store time slot info
                time_slot = {
                    "hour": hour,
                    "load_category": prediction["load_category"],
                    "price_per_kwh": float(pricing["price"]),
                    "total_cost": float(cost),
                    "is_peak": bool(pricing["peak"]),
                    "predicted_load": float(prediction["predicted_load"])
                }
                
                # Track absolute best time (any hour, for reference)
                if cost < absolute_min_cost:
                    absolute_min_cost = cost
                    absolute_best_slot = time_slot.copy()
                
                # Track absolute best for best_time_slot too (default)
                if cost < min_cost:
                    min_cost = cost
                    best_time_slot = time_slot
                
                # Track best PRACTICAL time (prioritize this!)
                if hour in practical_hours and cost < min_practical_cost:
                    min_practical_cost = cost
                    best_practical_time = time_slot
                
                # Track alternatives NEAR user's time (within 4 hours) AND practical
                hour_diff = abs(hour - start_time)
                # Handle wrap-around (e.g., 23:00 to 01:00 is 2 hours, not 22)
                if hour_diff > 12:
                    hour_diff = 24 - hour_diff
                
                # Only include if: nearby, practical, not current time, and not peak
                if (hour_diff <= 4 and 
                    hour != start_time and 
                    not pricing["peak"] and
                    hour in practical_hours):
                    time_slot["time_difference"] = hour - start_time
                    time_slot["is_practical"] = True
                    alternative_times.append(time_slot)
            
            # USE PRACTICAL BEST TIME if available, otherwise fall back to absolute best
            if best_practical_time and best_practical_time["hour"] in practical_hours:
                best_time_slot = best_practical_time
                min_cost = min_practical_cost
            
            # If no practical alternatives found nearby, add some practical off-peak times
            if len(alternative_times) == 0:
                for hour in practical_hours:
                    prediction = get_lstm_peak_prediction(hour, wattage, duration)
                    pricing = pricing_rule(
                        prediction["predicted_load"],
                        hour,
                        prediction["is_peak_by_lstm"],
                        prediction["load_category"]
                    )
                    if not pricing["peak"]:
                        cost = energy_kwh * pricing["price"]
                        alternative_times.append({
                            "hour": hour,
                            "load_category": prediction["load_category"],
                            "price_per_kwh": float(pricing["price"]),
                            "total_cost": float(cost),
                            "is_peak": False,
                            "time_difference": hour - start_time,
                            "is_practical": True,
                            "predicted_load": float(prediction["predicted_load"])
                        })
                        if len(alternative_times) >= 5:
                            break
            
            total_best_cost += min_cost
            
            # Sort alternatives by cost first, then proximity
            alternative_times.sort(key=lambda x: (x["total_cost"], abs(x["time_difference"])))
            alternative_times = alternative_times[:5]  # Keep top 5
            
            # Calculate savings
            cost_reduction = current_cost - min_cost
            
            # Determine status
            current_status = "PEAK" if current_pricing["peak"] else "OFF-PEAK"
            if current_prediction["load_category"] == "moderate":
                current_status = "MODERATE"
            
            # Get comfort suggestions
            comfort_suggestions = get_comfort_suggestions(name, wattage, start_time, duration, current_status, current_cost)
            
            # ALWAYS include basic rebound peak info (even without explanations)
            basic_rebound_analysis = None
            if rebound_info["is_rebound_peak"]:
                # Find practical alternative times for this appliance
                # These should be comfort-appropriate times with naturally expected grid usage
                practical_alternatives = []
                if "heater" in name.lower() or "geyser" in name.lower() or "water" in name.lower():
                    practical_alternatives = [8, 22, 19]  # Morning peak (natural), late evening, evening
                elif "washing" in name.lower():
                    practical_alternatives = [17, 13]  # Late afternoon, early afternoon  
                elif "ac" in name.lower():
                    practical_alternatives = [13, 23]  # Early afternoon (moderate), late night
                else:
                    practical_alternatives = [13, 17, 22]  # General alternatives
                
                # Format alternatives as readable times
                alt_times_str = ", ".join([f"{h}:00" for h in practical_alternatives[:3]])
                
                # Calculate load reduction if duration is reduced
                reduced_duration = max(0.5, duration * 0.5)  # 50% reduction
                load_reduction_kw = (wattage * (duration - reduced_duration)) / 1000
                
                # Build comprehensive rebound analysis
                basic_rebound_analysis = {
                    "is_rebound_peak": True,
                    "severity": rebound_info.get("risk_level", "MEDIUM"),
                    "risk_level": rebound_info.get("risk_level", "MEDIUM"),
                    
                    # Main alert message
                    "alert_message": rebound_info["rebound_reason"],
                    
                    # Load pattern visualization
                    "load_pattern": {
                        "hour_before": {
                            "time": f"{(start_time-1)%24}:00",
                            "load_category": rebound_info['hour_before_load']
                        },
                        "your_time": {
                            "time": f"{start_time}:00",
                            "load_category": rebound_info['current_load']
                        },
                        "hour_after": {
                            "time": f"{(start_time+1)%24}:00",
                            "load_category": rebound_info['hour_after_load']
                        }
                    },
                    
                    # Why rebound peak occurs
                    "why_rebound_peak_occurs": "Rebound peak occurs when many users shift electricity usage to off-peak hours, creating a new demand spike.",
                    
                    # How to avoid rebound peak - PRIORITIZE LOAD MANAGEMENT
                    "how_to_avoid": [
                        f"Stagger usage — schedule at a different off-peak hour (e.g., {practical_alternatives[0]}:00 or {practical_alternatives[1]}:00) to spread grid load",
                        f"Choose comfort-friendly alternatives: peak usage hours for {name} are [{', '.join(str(h) for h in practical_alternatives)}], which are naturally expected by the grid",
                        "Reduce runtime duration to minimise per-hour load contribution",
                        f"Use split-usage strategy: run 40% now for immediate need, 60% at a non-clustered off-peak hour",
                        f"⚡ TURN OFF other heavy appliances (AC, heater, geyser) during {start_time}:00-{(start_time+int(duration))%24}:00 to compensate for your {wattage}W load"
                    ],
                    
                    # Load reduction action plan
                    "load_reduction_plan": {
                        "context": f"You are the only scheduled appliance at {start_time}:00. The rebound risk comes from many OTHER households running their {name} at the same AI-recommended off-peak slot. To reduce collective grid impact:",
                        "actions": [
                            {
                                "appliance": name,
                                "action": "shift_time",
                                "suggestion": f"Move to {practical_alternatives[0]}:00 or {practical_alternatives[1]}:00 — spreading load across different hours avoids a cluster spike.",
                                "impact": f"{wattage}W removed from {start_time}:00",
                                "badge": "Shift time"
                            },
                            {
                                "appliance": name,
                                "action": "reduce_duration",
                                "suggestion": f"Run for {reduced_duration}h instead of {duration}h to halve your contribution.",
                                "impact": f"~{load_reduction_kw:.1f}kW equivalent reduction",
                                "badge": "Reduce duration"
                            }
                        ],
                        "total_reduction": f"Reduces {start_time}:00 artificial spike by {load_reduction_kw:.1f} kW"
                    }
                }
            
            # Generate best time recommendation with reason
            best_hour = best_time_slot["hour"]
            if best_time_slot["load_category"] == "off-peak":
                if 0 <= best_hour <= 5:
                    best_reason = f"{best_hour}:00 is deep off-peak (night hours) when grid demand is at its lowest — very few households are consuming electricity, so rates drop to Rs.{best_time_slot['price_per_kwh']:.0f}/kWh."
                else:
                    best_reason = f"{best_hour}:00 is off-peak with minimal grid demand, making it the cheapest slot at Rs.{best_time_slot['price_per_kwh']:.0f}/kWh."
            elif best_time_slot["load_category"] == "moderate":
                if 10 <= best_hour <= 16:
                    best_reason = f"{best_hour}:00 is a moderate-demand period (mid-day) when most people are at work/school. Grid load is lower than peak hours, so rates are Rs.{best_time_slot['price_per_kwh']:.0f}/kWh instead of Rs.10/kWh."
                elif best_hour == 23:
                    best_reason = f"{best_hour}:00 is late evening with declining demand as households wind down, offering moderate rates of Rs.{best_time_slot['price_per_kwh']:.0f}/kWh."
                else:
                    best_reason = f"{best_hour}:00 has moderate grid load, offering a balance of comfort and cost at Rs.{best_time_slot['price_per_kwh']:.0f}/kWh."
            else:
                best_reason = f"{best_hour}:00 is the cheapest practical time at Rs.{best_time_slot['price_per_kwh']:.0f}/kWh."
            
            # If no savings, explain the user is already optimal
            if cost_reduction == 0:
                best_reason += f" Your chosen time ({start_time}:00) is already at the same rate — you're paying the optimal price for practical hours!"
            
            best_time_rec = {
                "hour": best_time_slot["hour"],
                "load_category": best_time_slot["load_category"],
                "price_per_kwh": best_time_slot["price_per_kwh"],
                "total_cost": best_time_slot["total_cost"],
                "savings": float(cost_reduction),
                "reason": best_reason
            }
            
            # Include absolute cheapest time if it differs from practical best
            if (absolute_best_slot and 
                absolute_best_slot["hour"] != best_time_slot["hour"] and
                absolute_min_cost < min_cost):
                abs_hour = absolute_best_slot["hour"]
                abs_savings = current_cost - absolute_min_cost
                best_time_rec["absolute_best_time"] = {
                    "hour": abs_hour,
                    "load_category": absolute_best_slot["load_category"],
                    "price_per_kwh": absolute_best_slot["price_per_kwh"],
                    "total_cost": absolute_best_slot["total_cost"],
                    "savings": float(abs_savings),
                    "note": f"Cheapest at {abs_hour}:00 (Rs.{absolute_best_slot['price_per_kwh']:.0f}/kWh, save Rs.{abs_savings:.2f}) but may be less comfortable for {name}."
                }
            
            appliance_result = {
                "appliance_name": name,
                "wattage": wattage,
                "duration_hours": duration,
                "energy_consumption_kwh": float(energy_kwh),
                "user_comfort_priority": comfort_priority,
                
                # Current scheduled time
                "scheduled_time": {
                    "hour": start_time,
                    "status": current_status,
                    "load_category": current_prediction["load_category"],
                    "price_per_kwh": float(current_pricing["price"]),
                    "total_cost": float(current_cost),
                    "is_peak": bool(current_pricing["peak"]),
                    "is_rebound_peak": rebound_info["is_rebound_peak"],
                    "rebound_risk_level": rebound_info.get("risk_level", "LOW"),
                    "rebound_explanation": rebound_info["rebound_reason"] if rebound_info["is_rebound_peak"] else None,
                    "comfort_score": rebound_info.get("comfort_score", 10)
                },
                
                # Best time recommendation
                "best_time_recommendation": best_time_rec,
                
                # Alternative times close to user preference
                "comfort_friendly_alternatives": alternative_times,
                
                # User comfort suggestions
                "comfort_suggestions": comfort_suggestions,
                
                # Basic rebound peak analysis (always included)
                "rebound_peak_analysis": basic_rebound_analysis,
                
                # Cost summary
                "cost_summary": {
                    "current_cost": float(current_cost),
                    "best_possible_cost": float(min_cost),
                    "potential_savings": float(cost_reduction) if cost_reduction > 0 else 0,
                    "savings_percentage": float((cost_reduction / current_cost) * 100) if current_cost > 0 and cost_reduction > 0 else 0
                }
            }
            
            # Add comprehensive RAG-powered explanations
            if include_explanations:
                # Get detailed RAG explanations for current scenario
                current_rag_explanation = get_pricing_explanation(
                    current_prediction["predicted_load"],
                    current_pricing["price"],
                    current_pricing["peak"],
                    start_time,
                    name,
                    current_prediction["is_peak_by_lstm"],
                    current_pricing.get("peak_reason")
                )
                
                # Get RAG-powered energy saving tips specific to appliance
                rag_tips = get_energy_saving_tips(
                    wattage,
                    duration,
                    name,
                    start_time,
                    current_pricing["peak"],
                    current_prediction["predicted_load"]
                )
                
                # Get RAG explanation for best time
                best_rag_explanation = get_pricing_explanation(
                    best_time_slot.get("predicted_load", current_prediction["predicted_load"]),
                    best_time_slot["price_per_kwh"],
                    best_time_slot["is_peak"],
                    best_time_slot["hour"],
                    name
                )
                
                # Build clear, structured explanation
                clear_explanation = {
                    "current_time_analysis": {
                        "summary": f"Using {name} at {start_time}:00",
                        "status": current_status,
                        "cost_per_hour": f"₹{current_pricing['price']}/kWh",
                        "total_cost": f"₹{current_cost:.2f}",
                        "explanation": current_rag_explanation.get("text", current_rag_explanation) if isinstance(current_rag_explanation, dict) else current_rag_explanation,
                        "supporting_images": current_rag_explanation.get("images", []) if isinstance(current_rag_explanation, dict) else []
                    },
                    
                    "rebound_peak_analysis": None,
                    
                    "savings_opportunity": {
                        "can_save": cost_reduction > 0,
                        "amount": f"₹{cost_reduction:.2f}" if cost_reduction > 0 else "₹0.00",
                        "best_time": f"{best_time_slot['hour']}:00",
                        "best_time_cost": f"₹{best_time_slot['total_cost']:.2f}",
                        "explanation": best_rag_explanation.get("text", best_rag_explanation) if isinstance(best_rag_explanation, dict) else best_rag_explanation if cost_reduction > 0 else "You're already using the best time!",
                        "supporting_images": best_rag_explanation.get("images", []) if isinstance(best_rag_explanation, dict) and cost_reduction > 0 else []
                    },
                    
                    "user_comfort_recommendations": {
                        "rag_generated_tips": rag_tips.get("text", rag_tips) if isinstance(rag_tips, dict) else rag_tips,
                        "supporting_images": rag_tips.get("images", []) if isinstance(rag_tips, dict) else [],
                        "practical_suggestions": comfort_suggestions
                    },
                    
                    "simple_summary": ""
                }
                
                # Add detailed rebound peak analysis if detected
                if rebound_info["is_rebound_peak"]:
                    # Get RAG explanation for rebound peak phenomenon
                    rebound_query = f"What is rebound peak in electricity demand? Why does using a {wattage}W {name} at {start_time}:00 cause rebound peak? How can users avoid rebound peak while maintaining comfort?"
                    
                    try:
                        from services.rag_service import chat_assistant
                        rebound_rag = chat_assistant(rebound_query, k=3)
                        rebound_text = rebound_rag.get("text", rebound_rag) if isinstance(rebound_rag, dict) else rebound_rag
                        rebound_images = rebound_rag.get("images", []) if isinstance(rebound_rag, dict) else []
                    except:
                        rebound_text = rebound_info["rebound_reason"]
                        rebound_images = []
                    
                    clear_explanation["rebound_peak_analysis"] = {
                        "is_rebound_peak": True,
                        "severity": "HIGH" if wattage >= 2000 else "MODERATE",
                        "what_is_rebound_peak": "Rebound peak occurs when many users shift their electricity usage from peak to off-peak hours, creating a new peak during traditionally off-peak times.",
                        "why_this_causes_rebound": rebound_info["rebound_reason"],
                        "detailed_explanation": rebound_text,
                        "load_pattern": {
                            "hour_before": f"{(start_time-1)%24}:00 - {rebound_info['hour_before_load']} load",
                            "current_hour": f"{start_time}:00 - {rebound_info['current_load']} load",
                            "hour_after": f"{(start_time+1)%24}:00 - {rebound_info['hour_after_load']} load"
                        },
                        "impact": f"Your {wattage}W {name} adds to grid demand surge at {start_time}:00",
                        "how_to_avoid": [
                            f"Spread usage across multiple off-peak hours instead of concentrating at {start_time}:00",
                            "Consider alternative times from 'comfort_friendly_alternatives' list",
                            f"Reduce duration from {duration}h if possible" if duration > 1 else "Consider shorter usage periods"
                        ],
                        "supporting_images": rebound_images
                    }
                
                # Build simple summary with CLEAR EXPLANATIONS
                summary_parts = []
                
                # Explain WHY it's peak/moderate/off-peak
                if current_status == "PEAK":
                    if start_time >= 7 and start_time <= 9:
                        peak_reason = f"Morning rush hour (7-9 AM): Everyone uses heaters, geysers, and appliances before work/school"
                    elif start_time >= 18 and start_time <= 22:
                        peak_reason = f"Evening rush hour (6-10 PM): Everyone returns home and uses AC, heaters, cooking appliances"
                    else:
                        peak_reason = f"High grid demand at this hour due to combined household usage"
                    
                    summary_parts.append(f"⚠️ **PEAK ALERT:** {name} at {start_time}:00 costs ₹{current_pricing['price']}/kWh")
                    summary_parts.append(f"📊 **Why Peak?** {peak_reason}")
                    summary_parts.append(f"⚡ **Your Load:** {current_prediction['predicted_load']:.2f} kWh (Base: {current_prediction.get('base_load', 0):.2f} + Your {name}: {current_prediction.get('appliance_contribution', 0):.2f})")
                    
                    if rebound_info["is_rebound_peak"]:
                        summary_parts.append(f"🔄 **REBOUND PEAK:** Many users shifted to this 'off-peak' time, creating new peak!")
                
                elif current_status == "MODERATE":
                    if start_time >= 10 and start_time <= 17:
                        moderate_reason = f"Mid-day hours: Moderate demand as most people are at work/school"
                    else:
                        moderate_reason = f"Transition period with moderate grid demand"
                    
                    summary_parts.append(f"🟡 **MODERATE:** {name} at {start_time}:00 costs ₹{current_pricing['price']}/kWh")
                    summary_parts.append(f"📊 **Why Moderate?** {moderate_reason}")
                    summary_parts.append(f"⚡ **Your Load:** {current_prediction['predicted_load']:.2f} kWh (Base: {current_prediction.get('base_load', 0):.2f} + Your {name}: {current_prediction.get('appliance_contribution', 0):.2f})")
                else:
                    if start_time >= 23 or start_time <= 6:
                        offpeak_reason = f"Night hours (11 PM-6 AM): Very low demand as most people sleep"
                    else:
                        offpeak_reason = f"Low demand period - good time for high-power appliances"
                    
                    summary_parts.append(f"✅ **EXCELLENT CHOICE:** {name} at {start_time}:00 costs only ₹{current_pricing['price']}/kWh")
                    summary_parts.append(f"📊 **Why Off-Peak?** {offpeak_reason}")
                    summary_parts.append(f"⚡ **Your Load:** {current_prediction['predicted_load']:.2f} kWh (Base: {current_prediction.get('base_load', 0):.2f} + Your {name}: {current_prediction.get('appliance_contribution', 0):.2f})")
                
                # Show savings opportunity with PRACTICAL alternatives
                if cost_reduction > 0:
                    best_hour = best_time_slot['hour']
                    
                    # Give PRACTICAL explanation of best time
                    if best_hour >= 23 or best_hour <= 6:
                        best_time_reason = f"Late night/early morning (lowest demand, cheapest rates)"
                    elif best_hour >= 10 and best_hour <= 16:
                        best_time_reason = f"Mid-day (moderate demand, reasonable rates)"
                    else:
                        best_time_reason = f"Off-peak period"
                    
                    summary_parts.append(f"💰 **SAVE ₹{cost_reduction:.2f}:** Best time is {best_hour}:00 ({best_time_reason})")
                    summary_parts.append(f"💡 **Cost Comparison:** ₹{current_cost:.2f} now vs ₹{best_time_slot['total_cost']:.2f} at {best_hour}:00")
                else:
                    summary_parts.append(f"✨ **OPTIMAL TIMING:** You're already using the cheapest time!")
                
                # Show TOP practical suggestion
                if comfort_suggestions:
                    top_suggestion = comfort_suggestions[0]
                    summary_parts.append(f"🏠 **ACTION:** {top_suggestion['suggestion']}")
                    if 'practical_tip' in top_suggestion:
                        summary_parts.append(f"💡 **Tip:** {top_suggestion['practical_tip']}")
                
                clear_explanation["simple_summary"] = "\n".join(summary_parts)
                
                # Add conditional "if you must use now" recommendations
                if current_status in ["PEAK", "MODERATE"] and cost_reduction > 0:
                    # Generate smart split-usage recommendations
                    conditional_recommendations = {
                        "scenario": f"If you MUST use {name} at {start_time}:00 due to comfort needs",
                        "smart_alternatives": []
                    }
                    
                    # Calculate split usage options
                    name_lower = name.lower()
                    
                    # Option 1: Reduce current usage + use remaining in off-peak
                    if duration > 1:
                        reduced_duration = duration * 0.4  # Use 40% now
                        remaining_duration = duration * 0.6  # Use 60% later
                        
                        reduced_cost_now = (wattage * reduced_duration / 1000) * current_pricing["price"]
                        remaining_cost_offpeak = (wattage * remaining_duration / 1000) * best_time_slot["price_per_kwh"]
                        total_split_cost = reduced_cost_now + remaining_cost_offpeak
                        split_savings = current_cost - total_split_cost
                        
                        split_option = {
                            "option": "Split Usage Strategy",
                            "recommendation": f"Use {name} for {reduced_duration:.1f}h at {start_time}:00, then {remaining_duration:.1f}h at {best_time_slot['hour']}:00",
                            "cost_breakdown": {
                                "now": f"₹{reduced_cost_now:.2f} ({reduced_duration:.1f}h at ₹{current_pricing['price']}/kWh)",
                                "later": f"₹{remaining_cost_offpeak:.2f} ({remaining_duration:.1f}h at ₹{best_time_slot['price_per_kwh']}/kWh)",
                                "total": f"₹{total_split_cost:.2f}",
                                "savings": f"₹{split_savings:.2f} compared to full {duration}h at peak"
                            },
                            "comfort_impact": "High - you get immediate comfort and save money",
                            "reasoning": ""
                        }
                        
                        # Get RAG reasoning for split usage
                        try:
                            from services.rag_service import chat_assistant
                            split_query = f"Why is it beneficial to split {name} usage between peak hours and off-peak hours? How does partial usage at {start_time}:00 and remaining at {best_time_slot['hour']}:00 maintain comfort while saving electricity costs?"
                            split_rag = chat_assistant(split_query, k=2)
                            split_option["reasoning"] = split_rag.get("text", split_rag) if isinstance(split_rag, dict) else split_rag
                        except:
                            split_option["reasoning"] = f"Using {name} partially now gives immediate comfort, then continuing during off-peak hours provides cost savings while maintaining overall usage."
                        
                        conditional_recommendations["smart_alternatives"].append(split_option)
                    
                    # Option 2: Limit usage now with specific constraints
                    if "ac" in name_lower or "air conditioner" in name_lower:
                        limit_option = {
                            "option": "Limited Peak Usage",
                            "recommendation": f"If using AC at {start_time}:00, set temperature to 25-26°C (instead of 22-23°C) for {duration}h",
                            "benefits": {
                                "immediate_comfort": "Yes - room stays cool",
                                "energy_reduction": "15-20% less power consumption",
                                "cost_saving": f"₹{current_cost * 0.17:.2f} (approx 17% of ₹{current_cost:.2f})",
                                "grid_impact": "Reduced peak load contribution"
                            },
                            "then_continue": f"Switch to 23°C after {best_time_slot['hour']}:00 when rates drop to ₹{best_time_slot['price_per_kwh']}/kWh",
                            "comfort_impact": "Minimal - 2-3°C difference is barely noticeable with ceiling fan",
                            "reasoning": ""
                        }
                        
                        try:
                            from services.rag_service import chat_assistant
                            ac_query = f"How does AC temperature setting affect electricity consumption? What is the optimal temperature during peak hours to balance comfort and cost?"
                            ac_rag = chat_assistant(ac_query, k=2)
                            limit_option["reasoning"] = ac_rag.get("text", ac_rag) if isinstance(ac_rag, dict) else ac_rag
                        except:
                            limit_option["reasoning"] = "Each degree increase in AC temperature reduces power consumption by 6-8%. Setting at 25-26°C during peak hours significantly cuts costs while maintaining comfort."
                        
                        conditional_recommendations["smart_alternatives"].append(limit_option)
                    
                    elif "heater" in name_lower:
                        limit_option = {
                            "option": "Limited Peak Usage",
                            "recommendation": f"If using Heater at {start_time}:00, limit to 30-45 minutes for initial warmth",
                            "benefits": {
                                "immediate_comfort": "Yes - room warms up quickly",
                                "energy_reduction": f"{((duration - 0.75) / duration * 100):.0f}% less runtime",
                                "cost_saving": f"₹{current_cost - (wattage * 0.75 / 1000 * current_pricing['price']):.2f}",
                                "grid_impact": "Significantly reduced peak load"
                            },
                            "then_continue": f"Use full heating after {best_time_slot['hour']}:00 at ₹{best_time_slot['price_per_kwh']}/kWh (off-peak)",
                            "comfort_impact": "Minimal - room retains heat for 1-2 hours with proper insulation",
                            "reasoning": ""
                        }
                        
                        try:
                            from services.rag_service import chat_assistant
                            heater_query = f"How long does it take to heat a room? How long does heat remain after heater is turned off? What's the optimal heating strategy during peak electricity hours?"
                            heater_rag = chat_assistant(heater_query, k=2)
                            limit_option["reasoning"] = heater_rag.get("text", heater_rag) if isinstance(heater_rag, dict) else heater_rag
                        except:
                            limit_option["reasoning"] = "Rooms typically warm up in 30-45 minutes with a 2000W heater. Well-insulated spaces retain heat for 1-2 hours, making brief peak-hour usage practical."
                        
                        conditional_recommendations["smart_alternatives"].append(limit_option)
                    
                    # Option 3: Nearby off-peak alternative with minimal disruption
                    if alternative_times:
                        nearest_offpeak = alternative_times[0]  # Already sorted by cost and proximity
                        nearby_option = {
                            "option": "Nearby Off-Peak Alternative",
                            "recommendation": f"Shift to {nearest_offpeak['hour']}:00 (only {abs(nearest_offpeak['time_difference'])} hour {'earlier' if nearest_offpeak['time_difference'] < 0 else 'later'})",
                            "benefits": {
                                "time_difference": f"{abs(nearest_offpeak['time_difference'])} hour shift",
                                "cost": f"₹{nearest_offpeak['total_cost']:.2f} (vs ₹{current_cost:.2f} now)",
                                "savings": f"₹{current_cost - nearest_offpeak['total_cost']:.2f}",
                                "status": nearest_offpeak['load_category']
                            },
                            "comfort_impact": "Very minimal - small time adjustment",
                            "reasoning": f"Only {abs(nearest_offpeak['time_difference'])} hour difference from your preferred time, but saves ₹{current_cost - nearest_offpeak['total_cost']:.2f}"
                        }
                        conditional_recommendations["smart_alternatives"].append(nearby_option)
                    
                    clear_explanation["if_you_must_use_now"] = conditional_recommendations
                
                appliance_result["detailed_analysis"] = clear_explanation
            
            appliance_analysis.append(appliance_result)
        
        # Room-level summary
        total_savings = total_current_cost - total_best_cost
        
        # Calculate estimated monthly and yearly bills
        daily_cost = total_current_cost
        monthly_cost = daily_cost * 30
        yearly_cost = daily_cost * 365
        
        optimized_monthly = total_best_cost * 30
        optimized_yearly = total_best_cost * 365
        
        summary = {
            "room_name": room_name,
            "total_appliances": len(appliance_analysis),
            "total_energy_consumption_kwh": float(total_energy),
            
            # Room electricity bill
            "room_electricity_bill": {
                "current_daily_cost": float(total_current_cost),
                "current_monthly_cost": float(monthly_cost),
                "current_yearly_cost": float(yearly_cost),
                "optimized_daily_cost": float(total_best_cost),
                "optimized_monthly_cost": float(optimized_monthly),
                "optimized_yearly_cost": float(optimized_yearly),
                "monthly_savings": float(monthly_cost - optimized_monthly),
                "yearly_savings": float(yearly_cost - optimized_yearly)
            },
            
            # Quick summary
            "total_potential_savings": float(total_savings) if total_savings > 0 else 0,
            "savings_percentage": float((total_savings / total_current_cost) * 100) if total_current_cost > 0 and total_savings > 0 else 0
        }
        
        # Overall recommendation
        if include_explanations:
            peak_count = sum(1 for a in appliance_analysis if a["scheduled_time"]["is_peak"])
            rebound_count = sum(1 for a in appliance_analysis if a["scheduled_time"]["is_rebound_peak"])
            
            recommendations = []
            
            if total_savings > 5:
                recommendations.append(f"🎯 **HIGH SAVINGS POTENTIAL**: Save ₹{total_savings:.2f}/day (₹{monthly_cost - optimized_monthly:.2f}/month) by optimizing your schedule!")
            elif total_savings > 0:
                recommendations.append(f"💰 Save ₹{total_savings:.2f}/day by minor adjustments.")
            else:
                recommendations.append("✅ Excellent scheduling! You're already optimized.")
            
            if peak_count > 0:
                recommendations.append(f"⚠️ {peak_count} appliance(s) during PEAK hours - check comfort-friendly alternatives above.")
            
            if rebound_count > 0:
                recommendations.append(f"🔄 {rebound_count} appliance(s) may cause rebound peak - see explanations for details.")
            
            summary["smart_recommendations"] = recommendations
        
        response = {
            "status": "success",
            "summary": summary,
            "appliances": appliance_analysis
        }
        
        return jsonify(response)
    
    except Exception as e:
        import traceback
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


@scheduling_bp.route("/quick_schedule", methods=["POST"])
def quick_schedule():
    """
    Quick scheduling with simple input format
    
    Request: {
        "appliances": [
            {"name": "AC", "wattage": 1500, "start_time": 14, "duration_hours": 3},
            {"name": "Heater", "wattage": 2000, "start_time": 18, "duration_hours": 2}
        ]
    }
    
    Returns simplified response without detailed explanations
    """
    try:
        from services.scheduling_service import get_lstm_peak_prediction
        from datetime import datetime
        
        data = request.json
        appliances = data.get("appliances", [])
        
        if not appliances:
            return jsonify({
                "status": "error",
                "message": "Please provide at least one appliance"
            }), 400
        
        results = []
        total_cost = 0
        total_optimized_cost = 0
        
        for appliance in appliances:
            name = appliance.get("name", "Appliance")
            wattage = float(appliance.get("wattage", 0))
            start_time = int(appliance.get("start_time", datetime.now().hour))
            duration = float(appliance.get("duration_hours", 1))
            
            energy_kwh = calculate_energy(wattage, duration)
            
            # Current time
            current_pred = get_lstm_peak_prediction(start_time, wattage, duration)
            current_price = pricing_rule(
                current_pred["predicted_load"],
                start_time,
                current_pred["is_peak_by_lstm"],
                current_pred["load_category"]
            )
            current_cost = energy_kwh * current_price["price"]
            
            # Find best time
            best_cost = float('inf')
            best_hour = start_time
            
            for hour in range(24):
                pred = get_lstm_peak_prediction(hour, wattage, duration)
                price = pricing_rule(pred["predicted_load"], hour, pred["is_peak_by_lstm"], pred["load_category"])
                cost = energy_kwh * price["price"]
                
                if cost < best_cost:
                    best_cost = cost
                    best_hour = hour
            
            total_cost += current_cost
            total_optimized_cost += best_cost
            
            results.append({
                "appliance": name,
                "wattage": wattage,
                "scheduled_time": start_time,
                "status": current_pred["load_category"].upper(),
                "current_cost": float(current_cost),
                "best_time": best_hour,
                "optimized_cost": float(best_cost),
                "savings": float(current_cost - best_cost) if current_cost > best_cost else 0
            })
        
        return jsonify({
            "status": "success",
            "total_current_cost": float(total_cost),
            "total_optimized_cost": float(total_optimized_cost),
            "total_savings": float(total_cost - total_optimized_cost) if total_cost > total_optimized_cost else 0,
            "appliances": results
        })
    
    except Exception as e:
        import traceback
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


@scheduling_bp.route("/validate_schedule", methods=["POST"])
def validate_schedule():
    """
    Validate schedule configuration
    Request: {
        "schedule_type": "every day" | "weekdays" | "custom",
        "selected_days": ["monday", "tuesday", ...],
        "time": "14:00"
    }
    """
    try:
        data = request.json
        schedule_type = data.get("schedule_type", "every day")
        selected_days = data.get("selected_days", [])
        time = data.get("time", "00:00")
        
        valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        # Validation logic
        if schedule_type == "custom":
            if not selected_days:
                return jsonify({
                    "status": "error",
                    "message": "Please select at least one day for custom schedule"
                }), 400
            
            # Validate day names
            invalid_days = [day for day in selected_days if day.lower() not in valid_days]
            if invalid_days:
                return jsonify({
                    "status": "error",
                    "message": f"Invalid days: {', '.join(invalid_days)}"
                }), 400
        
        elif schedule_type == "weekdays":
            selected_days = ["monday", "tuesday", "wednesday", "thursday", "friday"]
        
        elif schedule_type == "every day":
            selected_days = valid_days
        
        return jsonify({
            "status": "success",
            "schedule_type": schedule_type,
            "selected_days": selected_days,
            "time": time,
            "message": "Schedule is valid"
        })
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500



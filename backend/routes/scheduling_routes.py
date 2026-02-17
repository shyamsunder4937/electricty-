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
        include_explanations = data.get("include_explanations", True)
        show_detailed_hours = data.get("show_detailed_hours", False)
        
        if not appliances:
            return jsonify({
                "status": "error",
                "message": "Please provide at least one appliance"
            }), 400
        
        # Helper function to detect rebound peak
        def detect_rebound_peak(hour, wattage, duration):
            """Check if a time slot can cause rebound peak"""
            # Get predictions for the hour and surrounding hours
            current_pred = get_lstm_peak_prediction(hour, wattage, duration)
            
            # Check hour before and after
            hour_before = (hour - 1) % 24
            hour_after = (hour + 1) % 24
            
            pred_before = get_lstm_peak_prediction(hour_before, wattage, duration)
            pred_after = get_lstm_peak_prediction(hour_after, wattage, duration)
            
            is_rebound = False
            rebound_reason = None
            
            # Rebound peak occurs when off-peak shifts to moderate/peak due to demand surge
            if current_pred["load_category"] == "off-peak":
                # If many appliances scheduled, could push to moderate/peak
                if wattage >= 1500:  # High-wattage appliance
                    is_rebound = True
                    rebound_reason = f"High-wattage appliance ({wattage}W) during off-peak could create demand surge, potentially shifting to moderate load"
            
            # Check if transitioning from off-peak to peak (typical rebound scenario)
            if (pred_before["load_category"] == "off-peak" and 
                current_pred["load_category"] in ["moderate", "peak"]):
                is_rebound = True
                rebound_reason = f"Transitioning from off-peak ({hour_before}:00) to {current_pred['load_category']} ({hour}:00) - typical rebound peak pattern"
            
            return {
                "is_rebound_peak": is_rebound,
                "rebound_reason": rebound_reason,
                "hour_before_load": pred_before["load_category"],
                "current_load": current_pred["load_category"],
                "hour_after_load": pred_after["load_category"]
            }
        
        # Helper function to generate user comfort suggestions
        def get_comfort_suggestions(name, wattage, start_time, duration, current_status):
            """Generate comfort-preserving cost-saving suggestions"""
            suggestions = []
            
            name_lower = name.lower()
            
            # Heater suggestions
            if "heater" in name_lower or "geyser" in name_lower:
                if current_status == "PEAK":
                    # Suggest using before peak hours
                    if start_time >= 6 and start_time < 10:  # Morning peak
                        suggestions.append({
                            "type": "time_shift",
                            "suggestion": f"Use {name} at {start_time-2}:00 instead of {start_time}:00 to avoid morning peak",
                            "comfort_impact": "minimal",
                            "reason": "Pre-heating before peak hours maintains comfort while saving money"
                        })
                    elif start_time >= 18 and start_time < 22:  # Evening peak
                        suggestions.append({
                            "type": "time_shift",
                            "suggestion": f"Start {name} at {start_time-1}:00 (before peak) or wait until 22:00 (after peak)",
                            "comfort_impact": "low",
                            "reason": "Room will stay warm, and you save on peak charges"
                        })
                
                # Suggest optimal duration
                if duration > 2:
                    suggestions.append({
                        "type": "duration_optimization",
                        "suggestion": f"Reduce heating duration from {duration}h to {duration-0.5}h",
                        "comfort_impact": "minimal",
                        "reason": "Room retains heat; slight reduction won't affect comfort significantly"
                    })
            
            # AC suggestions
            elif "ac" in name_lower or "air conditioner" in name_lower or "conditioner" in name_lower:
                if current_status == "PEAK":
                    suggestions.append({
                        "type": "temperature_optimization",
                        "suggestion": "Set AC temperature 1-2°C higher (e.g., 25°C instead of 23°C)",
                        "comfort_impact": "minimal",
                        "potential_savings": "15-20% on electricity",
                        "reason": "Small temperature increase significantly reduces power consumption"
                    })
                    
                if start_time >= 18:  # Evening use
                    suggestions.append({
                        "type": "time_shift",
                        "suggestion": f"Start AC at {start_time-1}:00 to pre-cool the room before peak hours",
                        "comfort_impact": "none",
                        "reason": "Pre-cooled room maintains temperature during peak hours"
                    })
                
                # Suggest usage during lower peak with comfort
                suggestions.append({
                    "type": "smart_usage",
                    "suggestion": "Use ceiling fan along with AC to maintain comfort at higher temperature setting",
                    "comfort_impact": "none",
                    "potential_savings": "20-30% on electricity",
                    "reason": "Air circulation makes room feel cooler without extra AC load"
                })
            
            # Washing Machine suggestions
            elif "washing" in name_lower or "washer" in name_lower:
                if current_status == "PEAK" or current_status == "MODERATE":
                    suggestions.append({
                        "type": "time_shift",
                        "suggestion": f"Schedule {name} during off-peak hours (11 PM - 6 AM)",
                        "comfort_impact": "none",
                        "reason": "Delayed start won't affect your comfort; save significantly on electricity"
                    })
            
            # Geyser/Water Heater specific
            elif "geyser" in name_lower or "water heater" in name_lower:
                suggestions.append({
                    "type": "usage_optimization",
                    "suggestion": "Heat water during off-peak hours and use insulated storage",
                    "comfort_impact": "none",
                    "potential_savings": "30-40%",
                    "reason": "Hot water stays warm for hours; no comfort compromise"
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
            alternative_times = []  # Store top 3 alternatives near user's preferred time
            
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
                    "is_peak": bool(pricing["peak"])
                }
                
                # Track best time
                if cost < min_cost:
                    min_cost = cost
                    best_time_slot = time_slot
                
                # Track alternatives near user's time (within 3 hours before/after)
                hour_diff = abs(hour - start_time)
                if hour_diff <= 3 and hour != start_time and not pricing["peak"]:
                    time_slot["time_difference"] = hour - start_time
                    alternative_times.append(time_slot)
            
            total_best_cost += min_cost
            
            # Sort alternatives by cost and proximity
            alternative_times.sort(key=lambda x: (x["total_cost"], abs(x["time_difference"])))
            alternative_times = alternative_times[:3]  # Keep top 3
            
            # Calculate savings
            cost_reduction = current_cost - min_cost
            
            # Determine status
            current_status = "PEAK" if current_pricing["peak"] else "OFF-PEAK"
            if current_prediction["load_category"] == "moderate":
                current_status = "MODERATE"
            
            # Get comfort suggestions
            comfort_suggestions = get_comfort_suggestions(name, wattage, start_time, duration, current_status)
            
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
                    "rebound_explanation": rebound_info["rebound_reason"] if rebound_info["is_rebound_peak"] else None
                },
                
                # Best time recommendation
                "best_time_recommendation": {
                    "hour": best_time_slot["hour"],
                    "load_category": best_time_slot["load_category"],
                    "price_per_kwh": best_time_slot["price_per_kwh"],
                    "total_cost": best_time_slot["total_cost"],
                    "savings": float(cost_reduction)
                },
                
                # Alternative times close to user preference
                "comfort_friendly_alternatives": alternative_times,
                
                # User comfort suggestions
                "comfort_suggestions": comfort_suggestions,
                
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
                
                # Build simple summary
                summary_parts = []
                
                if current_status == "PEAK":
                    summary_parts.append(f"⚠️ **ALERT:** {name} at {start_time}:00 is during PEAK HOURS (₹{current_pricing['price']}/kWh)")
                    if rebound_info["is_rebound_peak"]:
                        summary_parts.append(f"🔄 **REBOUND PEAK DETECTED:** This timing may cause demand surge")
                elif current_status == "MODERATE":
                    summary_parts.append(f"🟡 {name} at {start_time}:00 is during MODERATE hours (₹{current_pricing['price']}/kWh)")
                else:
                    summary_parts.append(f"✅ GOOD CHOICE: {name} at {start_time}:00 is during OFF-PEAK hours (₹{current_pricing['price']}/kWh)")
                
                if cost_reduction > 0:
                    summary_parts.append(f"💰 **SAVE ₹{cost_reduction:.2f}:** Switch to {best_time_slot['hour']}:00 (₹{best_time_slot['total_cost']:.2f} instead of ₹{current_cost:.2f})")
                else:
                    summary_parts.append(f"✨ You're already using the optimal time!")
                
                if comfort_suggestions:
                    summary_parts.append(f"🏠 **TOP TIP:** {comfort_suggestions[0]['suggestion']}")
                
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



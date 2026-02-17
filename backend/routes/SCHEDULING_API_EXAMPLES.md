# Scheduling API Examples

## Overview
The scheduling routes provide comprehensive analysis for multiple appliances in a room, including peak/off-peak predictions, cost analysis, and savings recommendations.

## Endpoints

### 1. `/schedule_appliances` - Full Analysis with Explanations

**POST** `/api/scheduling/schedule_appliances`

This endpoint provides the most comprehensive analysis including:
- Peak/off-peak prediction for each appliance
- Electricity consumption (kWh)
- Current cost at scheduled time
- Best time recommendation (off-peak)
- Cost reduction if used in off-peak
- Cost increase if used in peak
- RAG-powered explanations with images

#### Request Example:

```json
{
  "room_name": "Living Room",
  "appliances": [
    {
      "name": "Air Conditioner",
      "wattage": 1500,
      "start_time": 14,
      "duration_hours": 3
    },
    {
      "name": "Washing Machine",
      "wattage": 800,
      "start_time": 16,
      "duration_hours": 1
    },
    {
      "name": "Heater",
      "wattage": 2000,
      "start_time": 20,
      "duration_hours": 2
    }
  ],
  "include_explanations": true
}
```

#### Response Structure:

```json
{
  "status": "success",
  "summary": {
    "room_name": "Living Room",
    "total_appliances": 3,
    "total_energy_consumption_kwh": 10.3,
    "current_schedule_cost": 82.4,
    "best_possible_cost": 51.5,
    "worst_possible_cost": 103.0,
    "total_potential_savings": 30.9,
    "total_potential_increase": 20.6,
    "savings_percentage": 37.5,
    "increase_percentage": 25.0,
    "recommendation": "🎯 **High Savings Opportunity!** You can save ₹30.90 (37.5%) by rescheduling your appliances to off-peak hours.",
    "warning": "⚠️ 2 appliance(s) scheduled during PEAK hours. Consider rescheduling to save money."
  },
  "appliances": [
    {
      "appliance_name": "Air Conditioner",
      "wattage": 1500,
      "duration_hours": 3,
      "energy_consumption_kwh": 4.5,
      
      "scheduled_time": {
        "hour": 14,
        "status": "MODERATE",
        "load_category": "moderate",
        "predicted_load": 0.55,
        "price_per_kwh": 7,
        "total_cost": 31.5,
        "is_peak": false
      },
      
      "best_time_recommendation": {
        "hour": 3,
        "status": "OFF-PEAK",
        "load_category": "off-peak",
        "price_per_kwh": 5,
        "total_cost": 22.5,
        "savings_from_current": 9.0
      },
      
      "worst_time_scenario": {
        "hour": 19,
        "status": "PEAK",
        "load_category": "peak",
        "price_per_kwh": 10,
        "total_cost": 45.0,
        "additional_cost_from_current": 13.5
      },
      
      "cost_analysis": {
        "current_cost": 31.5,
        "minimum_cost_possible": 22.5,
        "maximum_cost_possible": 45.0,
        "potential_savings": 9.0,
        "potential_increase": 13.5,
        "savings_percentage": 28.6,
        "increase_percentage": 42.9
      },
      
      "all_time_slots": [
        {
          "hour": 0,
          "predicted_load": 0.25,
          "load_category": "off-peak",
          "price_per_kwh": 5,
          "total_cost": 22.5,
          "is_peak": false,
          "pricing_category": "off-peak"
        }
        // ... 23 more hours
      ],
      
      "explanations": {
        "current_time_explanation": "At 14:00, the grid is experiencing moderate load...",
        "current_time_images": ["/api/scheduling/images/tariff_structure.png"],
        "best_time_explanation": "3:00 AM is an off-peak hour with lowest electricity rates...",
        "best_time_images": ["/api/scheduling/images/peak_hours_chart.png"],
        "energy_saving_tips": "To maximize savings with your Air Conditioner...",
        "tips_images": ["/api/scheduling/images/energy_tips.png"],
        "summary": "💡 **Save ₹9.00** by running Air Conditioner at 3:00 instead of 14:00!"
      }
    }
    // ... other appliances
  ]
}
```

### 2. `/quick_schedule` - Simplified Analysis

**POST** `/api/scheduling/quick_schedule`

Quick scheduling without detailed explanations, perfect for dashboards.

#### Request Example:

```json
{
  "appliances": [
    {"name": "AC", "wattage": 1500, "start_time": 14, "duration_hours": 3},
    {"name": "Heater", "wattage": 2000, "start_time": 18, "duration_hours": 2}
  ]
}
```

#### Response:

```json
{
  "status": "success",
  "total_current_cost": 66.5,
  "total_optimized_cost": 45.0,
  "total_savings": 21.5,
  "appliances": [
    {
      "appliance": "AC",
      "wattage": 1500,
      "scheduled_time": 14,
      "status": "MODERATE",
      "current_cost": 31.5,
      "best_time": 3,
      "optimized_cost": 22.5,
      "savings": 9.0
    },
    {
      "appliance": "Heater",
      "wattage": 2000,
      "scheduled_time": 18,
      "status": "PEAK",
      "current_cost": 40.0,
      "best_time": 2,
      "optimized_cost": 20.0,
      "savings": 20.0
    }
  ]
}
```

## Key Features

### 1. **Peak/Off-Peak Detection**
- **OFF-PEAK**: < 0.5 kWh grid load → ₹5/kWh (cheapest)
- **MODERATE**: 0.5-0.7 kWh grid load → ₹7/kWh
- **PEAK**: > 0.7 kWh grid load → ₹10/kWh (most expensive)

### 2. **24-Hour Analysis**
Every appliance is analyzed across all 24 hours to find:
- Best time (minimum cost)
- Worst time (maximum cost)
- All hourly slots with pricing

### 3. **Cost Comparisons**
- **Current cost**: What you'll pay at the scheduled time
- **Potential savings**: How much you save by switching to off-peak
- **Potential increase**: How much more you'd pay at peak times

### 4. **RAG-Powered Explanations**
When `include_explanations: true`:
- Detailed pricing explanations
- Visual charts and graphs
- Energy saving tips
- Contextual recommendations

## Usage Scenarios

### Scenario 1: Morning Routine
```json
{
  "room_name": "Bathroom & Kitchen",
  "appliances": [
    {"name": "Geyser", "wattage": 2000, "start_time": 7, "duration_hours": 1},
    {"name": "Coffee Maker", "wattage": 800, "start_time": 7, "duration_hours": 0.25},
    {"name": "Toaster", "wattage": 1000, "start_time": 7, "duration_hours": 0.1}
  ]
}
```

### Scenario 2: Evening Comfort
```json
{
  "room_name": "Living Room",
  "appliances": [
    {"name": "AC", "wattage": 1500, "start_time": 18, "duration_hours": 4},
    {"name": "TV", "wattage": 150, "start_time": 19, "duration_hours": 3},
    {"name": "LED Lights", "wattage": 100, "start_time": 18, "duration_hours": 5}
  ]
}
```

### Scenario 3: Laundry Day
```json
{
  "room_name": "Utility Room",
  "appliances": [
    {"name": "Washing Machine", "wattage": 800, "start_time": 14, "duration_hours": 1},
    {"name": "Dryer", "wattage": 3000, "start_time": 15, "duration_hours": 1},
    {"name": "Iron", "wattage": 1200, "start_time": 16, "duration_hours": 0.5}
  ]
}
```

## Common Appliance Wattages (Reference)

| Appliance | Typical Wattage |
|-----------|----------------|
| Air Conditioner (1.5 ton) | 1500W |
| Heater | 2000W |
| Geyser | 2000W |
| Washing Machine | 800W |
| Dryer | 3000W |
| Iron | 1200W |
| Microwave | 1200W |
| Refrigerator | 150W |
| TV (LED 42") | 80-150W |
| Laptop | 60W |
| Fan | 75W |
| LED Bulb | 10W |

## Tips for Maximum Savings

1. **Schedule high-wattage appliances** (AC, Heater, Geyser) during off-peak hours (11 PM - 6 AM)
2. **Avoid 6-10 AM and 6-10 PM** - these are peak hours with highest rates
3. **Use the API response** to visualize cost patterns across 24 hours
4. **Batch similar tasks** - run washing machine, dryer together during off-peak
5. **Check the `all_time_slots`** array for detailed hourly breakdown

## Error Handling

```json
{
  "status": "error",
  "message": "Please provide at least one appliance"
}
```

Common errors:
- Missing appliances array
- Invalid wattage (must be > 0)
- Invalid time (must be 0-23)
- Invalid duration (must be > 0)

## Integration Example (Python)

```python
import requests

url = "http://localhost:5000/api/scheduling/schedule_appliances"

payload = {
    "room_name": "Living Room",
    "appliances": [
        {"name": "AC", "wattage": 1500, "start_time": 14, "duration_hours": 3},
        {"name": "TV", "wattage": 150, "start_time": 19, "duration_hours": 2}
    ],
    "include_explanations": True
}

response = requests.post(url, json=payload)
data = response.json()

print(f"Total Savings: ₹{data['summary']['total_potential_savings']:.2f}")
print(f"Recommendation: {data['summary']['recommendation']}")

for appliance in data['appliances']:
    print(f"\n{appliance['appliance_name']}:")
    print(f"  Current cost: ₹{appliance['cost_analysis']['current_cost']:.2f}")
    print(f"  Best time: {appliance['best_time_recommendation']['hour']}:00")
    print(f"  Savings: ₹{appliance['cost_analysis']['potential_savings']:.2f}")
```

## Next Steps

1. Integrate this API with your frontend dashboard
2. Create visualizations using the `all_time_slots` data
3. Display RAG explanations with images for user education
4. Implement scheduling automation based on best_time recommendations
5. Add user preferences for preferred scheduling windows

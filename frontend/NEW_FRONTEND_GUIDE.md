# 🎨 Frontend Redesign - Complete Documentation

## ✅ Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI Components
│   │   ├── ApplianceButton.jsx
│   │   ├── ScheduleListItem.jsx
│   │   ├── CostSummaryCard.jsx
│   │   ├── ReboundPeakAlert.jsx
│   │   ├── SmartRecommendations.jsx
│   │   ├── HourlyBreakdown.jsx
│   │   ├── ApplianceAnalysis.jsx
│   │   ├── AIInsights.jsx
│   │   └── LoadingSpinner.jsx
│   │
│   ├── pages/               # Page Components
│   │   └── Schedule.jsx
│   │
│   ├── index.css            # Design System & Global Styles
│   ├── App.jsx              # Main App Component
│   └── main.jsx             # Entry Point
│
├── package.json
└── vite.config.js
```

---

## 🎯 Design Philosophy

### ✨ Modern & Premium Aesthetic
- **Vibrant Gradients**: Blue-to-purple, purple, success gradients
- **Smooth Animations**: Fade-in, slide-in, scale, and hover effects
- **Glassmorphism**: Semi-transparent overlays with backdrop blur
- **Shadows & Depth**: Elevated cards with soft shadows
- **Premium Typography**: Inter font family with proper hierarchy

### 📐 Component-Based Architecture
- **Modular Design**: Each component is self-contained and reusable
- **Clean Separation**: Logic separated from presentation
- **Prop-Driven**: Components configured via props
- **No Duplication**: DRY principle followed throughout

### 🎨 Design System
- **Color Tokens**: Centralized color variables
- **Spacing Scale**: Consistent padding/margin system
- **Typography Scale**: Hierarchical text sizing
- **Responsive**: Mobile-first responsive design

---

## 🧩 Component Breakdown

### 1. **ApplianceButton.jsx**
Quick-select button for common appliances.

**Props:**
- `icon` - Emoji icon for the appliance
- `name` - Appliance name
- `wattage` - Power consumption
- `selected` - Boolean for selected state
- `onClick` - Click handler

**Features:**
- Hover effects with transform
- Purple gradient when selected
- Smooth transitions

---

### 2. **ScheduleListItem.jsx**
Displays added appliances in a list with gradient background.

**Props:**
- `appliance` - Appliance object (id, name, duration, wattage)
- `onDelete` - Delete handler function

**Features:**
- Purple gradient background
- Auto-icon assignment based on appliance name
- Delete button with hover effects
- Slide-in animation

---

### 3. **CostSummaryCard.jsx**
Blue-to-purple gradient card showing total cost and energy.

**Props:**
- `totalCost` - Total cost in rupees
- `totalEnergy` - Total energy in kWh

**Features:**
- Gradient background (Blue → Purple)
- Two-column layout
- Large, readable values
- Icons for visual appeal

---

### 4. **ReboundPeakAlert.jsx**
Warning card for rebound peak detection.

**Props:**
- `reboundPeak` - Object with `detected`, `message`, `details`

**Features:**
- Red gradient background
- Pulsing glow animation
- Conditional rendering (only shows if detected)
- Detailed explanation section

---

### 5. **SmartRecommendations.jsx**
List of AI-generated recommendations with green checkmarks.

**Props:**
- `recommendations` - Array of recommendation strings

**Features:**
- Green checkmark icons
- Clean list layout
- Light green background for each item
- Fade-in animation

---

### 6. **HourlyBreakdown.jsx**
Visual bar chart showing hourly load forecast.

**Props:**
- `hourly` - Array of hourly data (hour, load_forecast, is_peak, price, cost)

**Features:**
- **Green bars** for off-peak hours
- **Red bars** for peak hours
- **Tooltips** on hover showing full details
- **Responsive** bar heights based on load
- **Legend** for peak/off-peak colors
- Displays first 14 hours

---

### 7. **ApplianceAnalysis.jsx**
Per-appliance breakdown with percentages and costs.

**Props:**
- `appliances` - Array of appliance analysis objects

**Features:**
- Percentage of total consumption
- Cost breakdown
- Optimization suggestions
- Color-coded left border

---

### 8. **AIInsights.jsx**
RAG-generated AI explanations and insights.

**Props:**
- `insights` - Text content from RAG system

**Features:**
- Clean white card
- Robot icon header
- Pre-wrapped text formatting
- Fade-in animation

---

### 9. **LoadingSpinner.jsx**
Animated loading indicator.

**Props:**
- `text` - Optional loading text

**Features:**
- Rotating purple spinner
- Optional custom text
- Centered layout

---

## 📄 Main Page: Schedule.jsx

### Layout Structure

**Two-Panel Layout:**
```
┌─────────────────────────────────────────────────────┐
│  LEFT PANEL (Input)    │   RIGHT PANEL (Results)    │
│  • Room Configuration   │   • Cost Summary           │
│  • Add Appliance        │   • Rebound Peak Alert     │
│  • Quick-Select Buttons │   • Recommendations        │
│  • Form Fields          │   • Hourly Breakdown       │
│  • Added Appliances     │   • Appliance Analysis     │
│  • Generate Button      │   • AI Insights            │
└─────────────────────────────────────────────────────┘
```

### State Management
- `roomName` - Current room name
- `selectedAppliance` - Currently selected quick-select appliance
- `formData` - Form field values
- `appliances` - Array of added appliances
- `loading` - Loading state during API call
- `results` - API response with schedule data

### API Integration
**Endpoint:** `POST http://localhost:5000/api/schedule`

**Request Body:**
```json
{
  "room_name": "Living Room",
  "appliances": [
    {
      "name": "AC",
      "wattage": 2000,
      "duration": 4,
      "preferred_time": null
    }
  ]
}
```

**Response (expected):**
```json
{
  "total_cost": 45.50,
  "total_energy": 3.5,
  "rebound_peak": {
    "detected": true,
    "message": "...",
    "details": "..."
  },
  "recommendations": ["...", "..."],
  "hourly": [
    {
      "hour": "12 PM",
      "load_forecast": 2.5,
      "is_peak": false,
      "price": 5.2,
      "cost": 13.0
    }
  ],
  "appliances": [...],
  "explanation": "RAG-generated text..."
}
```

---

## 🎨 Design System (index.css)

### Color Palette
- **Primary**: Purple (#7c3aed → #5b21b6)
- **Success**: Green (#10b981 → #059669)
- **Warning**: Orange/Yellow (#f59e0b)
- **Danger**: Red (#ef4444 → #dc2626)
- **Info**: Blue (#3b82f6)

### Gradients
```css
--gradient-primary: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
--gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
--gradient-warning: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
--gradient-danger: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
--bg-gradient-page: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
```

### Spacing Scale
```css
--space-xs: 0.25rem;  /* 4px */
--space-sm: 0.5rem;   /* 8px */
--space-md: 1rem;     /* 16px */
--space-lg: 1.5rem;   /* 24px */
--space-xl: 2rem;     /* 32px */
--space-2xl: 3rem;    /* 48px */
```

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Scale**: xs (0.75rem) → 4xl (2.25rem)

### Animations
```css
@keyframes fade-in { ... }
@keyframes slide-in-left { ... }
@keyframes slide-in-right { ... }
@keyframes pulse-glow { ... }
@keyframes spin { ... }
```

---

## 🚀 Features Implemented

### ✅ Matching Reference Design

**Left Panel (Input):**
- ✅ Room Configuration card
- ✅ Add Appliance card with quick-select buttons
- ✅ Grid of 8 common appliances (AC, Heater, etc.)
- ✅ Form fields (Name, Wattage, Duration, Status)
- ✅ Purple "Add to Schedule" button
- ✅ List of added appliances (purple gradient bars)
- ✅ Large "Generate Smart Schedule" button with pulsing glow

**Right Panel (Results):**
- ✅ **Cost Summary** (blue-purple gradient)
- ✅ **Rebound Peak Alert** (red/pink border with pulsing)
- ✅ **Smart Recommendations** (green checkmarks)
- ✅ **Hourly Breakdown** (visual bar chart with tooltips)
- ✅ **Appliance Analysis** (per-appliance breakdown)
- ✅ **AI Insights** (RAG-generated explanations)

### ✅ Premium UX Features
- **Smooth Animations**: Fade-in, slide-in for all elements
- **Hover Effects**: Transform, scale, shadow changes
- **Loading States**: Spinner with custom text
- **Error Handling**: Alerts for missing fields or API errors
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Semantic HTML, proper labels, ARIA where needed

---

## 🔧 Development

### Running the App
```bash
cd frontend
npm install
npm run dev
```

The app will be available at: **http://localhost:5173**

### Backend Requirement
The frontend expects the backend API at: **http://localhost:5000**

Make sure the Python backend is running:
```bash
cd backend
python app.py
```

---

## 📝 Code Quality

### ✅ Best Practices Followed
1. **Component Modularity** - Each component in its own file
2. **Props Interface** - Clear props documentation
3. **State Management** - Minimal, localized state
4. **Error Handling** - Try-catch for API calls
5. **Conditional Rendering** - Show/hide based on data availability
6. **Loading States** - User feedback during async operations
7. **Semantic HTML** - Proper use of headings, buttons, forms
8. **Clean Code** - Clear variable names, comments where needed
9. **No Duplication** - Reusable components prevent code duplication
10. **Consistent Styling** - All styles use design system tokens

---

## 🎉 Summary

The frontend has been completely redesigned from scratch with:

- **9 reusable components**
- **1 main page** (Schedule)
- **Modern design system** with vibrant gradients and animations
- **Premium aesthetics** matching the reference designs
- **Clean code architecture** with proper separation of concerns
- **Full API integration** ready for backend
- **Responsive design** for all screen sizes

**The application is now ready to use and looks exactly like the reference images you provided!** 🚀

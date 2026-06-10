# ⚡ Quick Start Guide - 2 Minutes to Running

## 🚀 Start the Application

### Step 1: Start Backend (Terminal 1)
```bash
cd backend
python app.py
```
**Expected Output:**
```
✅ Flask app created successfully
* Running on http://127.0.0.1:5000
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
**Expected Output:**
```
  VITE ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

### Step 3: Open Browser
Navigate to: **http://localhost:5173**

---

## 🧪 Quick Test - Rebound Peak Detection

### Test in 30 Seconds:

1. **Go to Schedule page** (left sidebar)

2. **Add this appliance:**
   ```
   Name: Washing Machine
   Wattage: 2000
   Start Time: 14 (2 PM)
   Duration: 2
   ```

3. **Click "Add to List"**

4. **Click "Optimize Schedule"** (purple button)

5. **Look for:**
   - 🟠 Orange "REBOUND PEAK ALERT" banner
   - Load pattern: Off-peak → Moderate → Off-peak
   - Severity: HIGH
   - Avoidance suggestions

---

## 💬 Quick Test - Ask AI

1. **Go to Ask AI page** (left sidebar)

2. **Type any of these:**
   - "What are peak hours?"
   - "How to reduce my bill?"
   - "What is rebound peak?"

3. **Press Enter or click Send**

4. **See:**
   - AI response with explanations
   - Relevant images from documents
   - Source citations

---

## 🎯 What You'll See

### Schedule Page Features:
- ✅ 24-hour price charts
- ✅ Rebound peak alerts (orange)
- ✅ Cost comparisons (current vs optimized)
- ✅ Monthly/yearly projections
- ✅ Comfort-friendly suggestions
- ✅ Detailed appliance analysis

### Ask AI Features:
- ✅ Real-time chat responses
- ✅ Document images
- ✅ Source citations
- ✅ Energy saving tips
- ✅ Policy information

---

## 🔧 Troubleshooting

### Backend won't start?
```bash
pip install -r requirements.txt
```

### Frontend won't start?
```bash
cd frontend
npm install
```

### Can't connect?
- Backend must be on port **5000**
- Frontend must be on port **5173**
- Check both are running

---

## 📱 URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Docs**: See IMPLEMENTATION_SUMMARY.md

---

## 🎓 For Your Review Demo

### Demo Flow (5 minutes):

**1. Show Rebound Peak Detection (2 min)**
   - Add 2000W appliance at 2 PM
   - Show orange alert
   - Explain the concept
   - Show avoidance strategies

**2. Show Cost Optimization (2 min)**
   - Point out 24-hour chart
   - Show current vs optimized cost
   - Show monthly savings
   - Expand appliance card for details

**3. Show AI Assistant (1 min)**
   - Ask "What is rebound peak?"
   - Show AI response with images
   - Ask "When is cheapest time for AC?"

---

## ✅ Success Checklist

Before your review, verify:
- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Can add appliances
- [ ] Rebound peak alert shows for 2000W at 2 PM
- [ ] Ask AI responds to questions
- [ ] Charts and graphs display correctly

---

## 🎉 You're Ready!

Everything is set up and working. Good luck with your review!

**Key Points to Mention:**
- Rebound peak detection prevents grid overload
- AI-powered with document citations
- Comprehensive cost analysis
- User comfort prioritized
- Professional, modern design

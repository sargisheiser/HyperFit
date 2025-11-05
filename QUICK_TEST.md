# 🚀 Quick Test Guide - HYPERFIT UI

## **Get Everything Running in 3 Steps**

### **Step 1: Start the Backend**
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
source venv/bin/activate
python start_server.py
```

Backend will run at: **http://localhost:8000**

### **Step 2: Start the Frontend**
Open a new terminal:
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT/frontend
npm install
npm run dev
```

Frontend will run at: **http://localhost:3000**

### **Step 3: Test It!**

1. **Open Browser**: http://localhost:3000
2. **Register**: Create a new account
3. **Login**: Sign in with your credentials
4. **Test AI Food Recognition**:
   - Go to "Meals" page
   - Click "Upload & Analyze"
   - Upload a food image (JPG, PNG, etc.)
   - Watch the AI analyze it! ✨
   - See calories, macros, and food items

## 🎯 **What to Test**

### ✅ **Authentication**
- Register new user
- Login
- Logout

### ✅ **Dashboard**
- View stats (meals, workouts, calories)
- See recent meals

### ✅ **AI Food Recognition** (Main Feature!)
- Upload food image
- Get AI analysis
- See nutrition breakdown
- View confidence scores

### ✅ **Workouts**
- Add workouts
- Track duration
- View workout history

## 📸 **Test with Real Images**

Try uploading images of:
- Breakfast plates
- Lunch meals
- Dinner dishes
- Snacks
- Restaurant meals

The AI will analyze and extract:
- Food items detected
- Estimated quantities
- Calories
- Protein, carbs, fats
- Confidence scores

## 🎨 **UI Features**

- **Clean Design**: Modern, minimalistic interface
- **Real-time**: Instant updates
- **Responsive**: Works on all devices
- **Smooth**: Beautiful animations
- **User-friendly**: Intuitive navigation

## 🐛 **Troubleshooting**

**Frontend won't start?**
- Make sure Node.js is installed: `node --version`
- Install dependencies: `npm install`

**Can't connect to backend?**
- Make sure backend is running on port 8000
- Check backend logs for errors

**AI analysis not working?**
- Verify OpenAI API key in `.env`
- Check backend logs for API errors
- Make sure image is valid (JPG, PNG, etc.)

## ✅ **Ready!**

Everything is set up. Start both servers and test away! 🏋️✨

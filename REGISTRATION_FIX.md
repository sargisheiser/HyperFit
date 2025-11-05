# 🔧 Fix Registration Error - Quick Guide

## **Current Issue:**
"Not Found" or "Internal Server Error" when registering

## **Solution Steps:**

### **1. Make Sure Backend is Running**

Open Terminal 1:
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
source venv/bin/activate
./start_backend.sh
```

**Wait for:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### **2. Reinitialize Database (if needed)**

Open Terminal 2 (while backend is running):
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
source venv/bin/activate
python init_database.py
```

### **3. Restart Backend**

After database changes, restart the backend:
- Stop the backend (Ctrl+C in Terminal 1)
- Start again: `./start_backend.sh`

### **4. Test Backend Directly**

Test if registration works via API:
```bash
curl -X POST "http://localhost:8000/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "full_name": "Test User"
  }'
```

If this returns a user object, backend is working!

### **5. Check Frontend Connection**

Make sure frontend is connecting to the right URL:
- Check `frontend/src/services/api.js`
- Default: `http://localhost:8000`
- Make sure backend is running on port 8000

### **6. Check Browser Console**

Open browser DevTools (F12):
- **Console tab**: Look for errors
- **Network tab**: Check if `/api/users/register` request is being made
- Check the response status code

## **Common Fixes:**

### **Backend not running:**
```bash
./start_backend.sh
```

### **Database needs reset:**
```bash
rm hyperfit.db
python init_database.py
```

### **Port conflict:**
```bash
lsof -ti:8000 | xargs kill -9
```

### **CORS issues:**
- Backend CORS is already configured
- Make sure frontend URL matches CORS settings

## **Expected Behavior:**

✅ Backend running on port 8000
✅ Database initialized
✅ Frontend can connect to backend
✅ Registration creates user in database
✅ Auto-login after registration

## **If Still Not Working:**

1. Check backend terminal for error messages
2. Check browser console for errors
3. Verify API endpoint: http://localhost:8000/docs
4. Try registering via Swagger UI at `/docs`

The registration should work once backend is properly running! 🎉

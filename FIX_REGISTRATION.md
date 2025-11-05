# 🔧 Fix Registration "Not Found" Error

## **Issue:**
The registration page shows "Not Found" error when trying to create an account.

## **Root Cause:**
The backend server is not running or crashed due to import errors.

## **Solution:**

### **Step 1: Start the Backend Server**

Open a terminal and run:
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
./start_backend.sh
```

Or manually:
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
source venv/bin/activate
python start_server.py
```

**Wait for this message:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### **Step 2: Verify Backend is Running**

Open in browser: http://localhost:8000/docs

You should see the API documentation. If you see it, the backend is running!

### **Step 3: Test Registration**

1. Make sure backend is running (Step 1)
2. Make sure frontend is running: `npm run dev` in the `frontend` folder
3. Try registering again at http://localhost:3000/register

### **Step 4: Check Browser Console**

Open browser DevTools (F12) and check:
- Console tab for errors
- Network tab to see if API calls are being made
- Check if requests are going to `http://localhost:8000/api/users/register`

## **Common Issues:**

### **Backend not running:**
- Solution: Start backend with `./start_backend.sh`

### **Port already in use:**
```bash
lsof -ti:8000 | xargs kill -9
```

### **CORS errors:**
- Make sure backend CORS is configured in `backend/main.py`
- Frontend should connect to `http://localhost:8000`

### **Wrong API URL:**
- Check `frontend/src/services/api.js`
- Default is `http://localhost:8000`

## **Quick Test:**

Test the registration endpoint directly:
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

If this works, the backend is fine - the issue is with the frontend connection.

## **Verify Everything:**

✅ Backend running on port 8000
✅ Frontend running on port 3000
✅ No errors in backend terminal
✅ No CORS errors in browser console
✅ API endpoint accessible at `/api/users/register`

If all checked, registration should work! 🎉

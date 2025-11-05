# 🔧 Quick Fix - Connection Error

## **The Problem:**
Frontend shows "Cannot connect to server" error

## **The Solution:**

### **Step 1: Restart Backend (Important!)**

Kill the old backend process and start fresh:
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
lsof -ti:8000 | xargs kill -9
./start_backend.sh
```

**Wait for:**
```
INFO:     Application startup complete.
```

### **Step 2: Verify Backend is Working**

Open in browser: http://localhost:8000/docs

If you see the API documentation, backend is running!

### **Step 3: Test Registration via API**

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

If this returns a user object, the backend is working!

### **Step 4: Refresh Frontend**

1. Make sure backend is running (Step 1)
2. Refresh the frontend page: http://localhost:3000
3. Try registering again

## **If Still Not Working:**

### **Check Browser Console:**
- Open DevTools (F12)
- Go to Console tab
- Look for CORS errors or network errors
- Check Network tab to see the actual request

### **Check Backend Logs:**
- Look at the terminal where backend is running
- Check for any error messages

### **Verify Ports:**
```bash
# Check if backend is on port 8000
lsof -i:8000

# Check if frontend is on port 3000
lsof -i:3000
```

## **Common Issues:**

1. **Backend not fully started** - Wait for "Application startup complete"
2. **CORS error** - Backend CORS is now configured to allow all origins
3. **Database error** - Run `python init_database.py` if needed
4. **Port conflict** - Kill processes on ports 8000/3000

## **Everything Should Work Now!** 🎉

# 🚀 Start Both Backend & Frontend

## **Quick Start - Two Terminal Windows**

### **Terminal 1 - Backend:**
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
./start_backend.sh
```

Wait for: `INFO:     Uvicorn running on http://0.0.0.0:8000`

### **Terminal 2 - Frontend:**
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT/frontend
npm run dev
```

Or use the script:
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT/frontend
./start_frontend.sh
```

Wait for: `Local: http://localhost:3000`

## ✅ **Verify Both Are Running:**

- **Backend**: http://localhost:8000/docs (should show API docs)
- **Frontend**: http://localhost:3000 (should show login page)

## 🎯 **Then Test:**

1. Open http://localhost:3000
2. Click "Create your account"
3. Register with your details
4. Start using HYPERFIT!

## 🐛 **If Frontend Won't Start:**

### **Check Node.js:**
```bash
node --version  # Should show v18 or higher
npm --version   # Should show v8 or higher
```

### **Install Dependencies:**
```bash
cd frontend
npm install
```

### **Port Already in Use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### **Clear and Reinstall:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📝 **Current Status:**

✅ Backend: Running on port 8000
✅ Frontend: Running on port 3000
✅ Ready to test!

## 🎉 **Everything Should Work Now!**

# 🔧 Troubleshooting Guide - Connection Issues

## Problem: ERR_CONNECTION_TIMED_OUT

### ✅ Lösung 1: Backend neu starten

```bash
# Alte Prozesse beenden
kill $(lsof -ti:8000)

# Backend neu starten
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
./start_backend.sh
```

### ✅ Lösung 2: Frontend neu starten

```bash
cd frontend
npm run dev
```

### ✅ Lösung 3: Ports prüfen

```bash
# Backend Port prüfen
lsof -ti:8000

# Frontend Port prüfen  
lsof -ti:5173  # oder 3000
```

### ✅ Lösung 4: Backend Health Check

```bash
curl http://localhost:8000/health
```

Sollte zurückgeben: `{"status":"healthy","service":"HYPERFIT Backend"}`

### ✅ Lösung 5: CORS prüfen

Der Backend ist bereits konfiguriert für CORS:
- `allow_origins=["*"]` - Erlaubt alle Origins
- `allow_methods=["*"]` - Erlaubt alle Methoden
- `allow_headers=["*"]` - Erlaubt alle Headers

### ✅ Lösung 6: Browser Cache leeren

1. Chrome/Edge: `Ctrl+Shift+Delete` (Windows) oder `Cmd+Shift+Delete` (Mac)
2. Cache leeren
3. Seite neu laden: `Ctrl+F5` oder `Cmd+Shift+R`

### ✅ Lösung 7: Firewall/Proxy prüfen

- Stelle sicher, dass keine Firewall localhost blockiert
- Proxy-Einstellungen prüfen
- VPN deaktivieren falls aktiv

### ✅ Lösung 8: Backend Logs prüfen

```bash
# Backend Logs in Echtzeit anzeigen
# (wenn Backend im Terminal läuft)
```

### ✅ Lösung 9: Manuelle Verbindung testen

```bash
# Test 1: Backend Root
curl http://localhost:8000/

# Test 2: Health Check
curl http://localhost:8000/health

# Test 3: API Docs
curl http://localhost:8000/docs
```

### ✅ Lösung 10: Frontend API URL prüfen

Die Frontend API-Konfiguration ist in:
- `frontend/src/services/api.js` - Base URL: `http://localhost:8000`
- `frontend/vite.config.js` - Proxy: `/api` → `http://localhost:8000`

## 🔍 Häufige Fehler

### Fehler: "Cannot connect to server"
- **Ursache**: Backend läuft nicht
- **Lösung**: Backend starten mit `./start_backend.sh`

### Fehler: "CORS policy"
- **Ursache**: CORS nicht richtig konfiguriert
- **Lösung**: Backend CORS ist bereits konfiguriert, prüfe Browser-Konsole

### Fehler: "ERR_CONNECTION_TIMED_OUT"
- **Ursache**: Backend antwortet nicht oder Port blockiert
- **Lösung**: 
  1. Backend neu starten
  2. Port 8000 prüfen: `lsof -ti:8000`
  3. Firewall prüfen

## 📞 Schnelle Hilfe

1. **Backend Status prüfen**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **Backend neu starten**:
   ```bash
   cd /Users/mr.heiser/PycharmProjects/HYPERFIT
   ./start_backend.sh
   ```

3. **Frontend neu starten**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Beide Services prüfen**:
   - Backend: http://localhost:8000/docs
   - Frontend: http://localhost:5173 (oder 3000)

## ✅ Aktueller Status

- ✅ Backend läuft auf: `http://localhost:8000`
- ✅ CORS ist konfiguriert
- ✅ Frontend API URL: `http://localhost:8000`
- ✅ Proxy konfiguriert in `vite.config.js`

Wenn das Problem weiterhin besteht, prüfe die Browser-Konsole (F12) für detaillierte Fehlermeldungen.



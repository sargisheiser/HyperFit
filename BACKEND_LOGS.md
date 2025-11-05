# 📋 How to View Backend Logs

## **Method 1: View Log File**

```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
./view_logs.sh
```

Or manually:
```bash
tail -f logs/hyperfit.log
```

## **Method 2: Check Terminal Output**

Look at the terminal where you started the backend with `./start_backend.sh`

All errors and INFO messages will appear there in real-time.

## **Method 3: Follow Logs in Real-Time**

```bash
tail -f logs/hyperfit.log
```

This will show new log entries as they happen.

## **What to Look For:**

When you see a 500 error, check the logs for:
- `ERROR` messages
- `Traceback` (full error stack)
- `Registration error:` messages
- Any exceptions or failures

## **Example Log Output:**

```
2025-11-05 15:26:37 - backend.api.users - INFO - Registration attempt for email: test@example.com
2025-11-05 15:26:37 - backend.api.users - INFO - Hashing password...
2025-11-05 15:26:37 - backend.api.users - ERROR - Registration error: ...
```

## **Quick Check:**

```bash
# View last 50 lines
tail -50 logs/hyperfit.log

# Search for errors
grep ERROR logs/hyperfit.log

# Search for registration attempts
grep "Registration attempt" logs/hyperfit.log
```

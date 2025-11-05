# 🔒 HYPERFIT Security Guide

## ⚠️ **IMPORTANT: API Key Security**

Your OpenAI API key and other sensitive credentials are stored in the `.env` file, which is **NEVER** committed to Git.

### ✅ **What's Protected:**

1. **`.env` file** - Contains your API keys and secrets (already in `.gitignore`)
2. **Database files** - `*.db`, `*.sqlite` files are gitignored
3. **Upload directories** - User-uploaded content is excluded

### 🔐 **Your API Key:**

Your OpenAI API key is stored in:
```
.env
```

**This file is in `.gitignore` and will NEVER be pushed to GitHub.**

### 📝 **Supported OpenAI Models:**

The following models are configured in your system:
- `gpt-4o-mini` (default) - Fast and cost-effective
- `gpt-4.1-mini` - Alternative mini model
- `gpt-5-mini` - Latest mini model

You can change the model in `.env`:
```env
OPENAI_MODEL=gpt-4o-mini
```

### ✅ **Verification Checklist:**

Before pushing to GitHub, verify:

```bash
# Check that .env is ignored
git status | grep .env

# Should show nothing (file is ignored)
# If it shows .env, it's NOT ignored - DO NOT COMMIT!

# Verify .env is in .gitignore
grep -q "^\.env$" .gitignore && echo "✅ .env is in .gitignore" || echo "❌ .env NOT in .gitignore!"
```

### 🚨 **If You Accidentally Commit Secrets:**

1. **IMMEDIATELY** revoke your API key on OpenAI dashboard
2. Remove from Git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Generate a new API key
4. Update `.env` with the new key

### 📋 **Best Practices:**

1. ✅ **DO**: Use `.env` for all secrets
2. ✅ **DO**: Keep `.env` in `.gitignore`
3. ✅ **DO**: Use `env.example` as a template (without real keys)
4. ❌ **DON'T**: Commit `.env` to Git
5. ❌ **DON'T**: Hardcode API keys in source code
6. ❌ **DON'T**: Share API keys in screenshots or messages

### 🔍 **Files to Never Commit:**

- `.env` - Contains API keys
- `hyperfit.db` - Database with user data
- `uploads/` - User-uploaded files
- `*.log` - May contain sensitive information

All of these are already in `.gitignore`.

## ✅ **Current Security Status:**

Your project is properly configured:
- ✅ `.env` is in `.gitignore`
- ✅ API key is stored in `.env` (not in code)
- ✅ Database files are gitignored
- ✅ No secrets in source code

**Your API key is safe!** 🎉

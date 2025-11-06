# 🚀 HYPERFIT Deployment Guide

Complete guide for deploying HYPERFIT to production environments.

## 📋 **Prerequisites**

- Docker 20.10+
- Docker Compose 2.0+
- Git
- (Optional) Domain name and SSL certificate

## 🐳 **Docker Deployment**

### Quick Start (Development)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sargisheiser/HyperFit.git
   cd HyperFit
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Deploy:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:80
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Production Deployment

1. **Set up production environment:**
   ```bash
   # Edit .env with production values
   # Set strong SECRET_KEY
   # Configure DATABASE_URL (PostgreSQL recommended)
   # Set CORS_ORIGINS to your domain
   ```

2. **Deploy:**
   ```bash
   ./deploy.sh prod
   ```

3. **Optional: Set up reverse proxy (Nginx):**
   - Uncomment nginx service in `docker-compose.prod.yml`
   - Configure SSL certificates
   - Update nginx configuration

## 🔧 **Manual Docker Commands**

### Build Images
```bash
# Development
docker-compose build

# Production
docker-compose -f docker-compose.prod.yml build
```

### Start Services
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
docker-compose restart
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

## 🌐 **Cloud Deployment**

### Railway

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy:**
   ```bash
   railway init
   railway up
   ```

3. **Set environment variables in Railway dashboard**

### Render

1. **Create new Web Service**
2. **Connect GitHub repository**
3. **Configure:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. **Set environment variables**

### Heroku

1. **Install Heroku CLI**
2. **Create app:**
   ```bash
   heroku create hyperfit-app
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set SECRET_KEY=your-secret-key
   heroku config:set OPENAI_API_KEY=your-key
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

### AWS EC2

1. **Launch EC2 instance** (Ubuntu recommended)
2. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Clone and deploy:**
   ```bash
   git clone https://github.com/sargisheiser/HyperFit.git
   cd HyperFit
   ./deploy.sh prod
   ```

4. **Configure security groups:**
   - Open ports 80 (HTTP), 443 (HTTPS), 8000 (Backend)

### DigitalOcean App Platform

1. **Create new App**
2. **Connect GitHub repository**
3. **Configure services:**
   - Backend service (Python)
   - Frontend service (Static site)
4. **Set environment variables**

## 🔐 **Environment Variables**

### Required Variables

```env
# Security
SECRET_KEY=your-very-secure-secret-key-here

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Database
DATABASE_URL=sqlite:///./database.db
# Or for PostgreSQL: postgresql://user:password@host:5432/dbname

# CORS
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Optional Variables

```env
# File Upload
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp,mp4,avi,mov

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours
```

## 📊 **Database Setup**

### SQLite (Development)
```bash
docker-compose run --rm backend python init_database.py
```

### PostgreSQL (Production)
1. **Update DATABASE_URL in .env:**
   ```env
   DATABASE_URL=postgresql://user:password@postgres:5432/hyperfit
   ```

2. **Uncomment postgres service in docker-compose.yml**

3. **Run migrations:**
   ```bash
   docker-compose run --rm backend alembic upgrade head
   ```

## 🔒 **Security Best Practices**

1. **Use strong SECRET_KEY:**
   ```python
   import secrets
   print(secrets.token_urlsafe(32))
   ```

2. **Enable HTTPS** (use reverse proxy or cloud platform)

3. **Restrict CORS_ORIGINS** to your domain only

4. **Use environment variables** for sensitive data

5. **Regular updates:**
   ```bash
   docker-compose pull
   docker-compose up -d --build
   ```

6. **Backup database regularly**

## 📈 **Monitoring**

### Health Checks
- Backend: `http://localhost:8000/health`
- Frontend: `http://localhost:80/health`

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend

# Save logs
docker-compose logs > logs.txt
```

## 🔄 **Updates & Maintenance**

### Update Application
```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### Database Backup
```bash
# SQLite
docker-compose exec backend cp database.db database.db.backup

# PostgreSQL
docker-compose exec postgres pg_dump -U hyperfit hyperfit > backup.sql
```

### Clean Up
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## 🐛 **Troubleshooting**

### Container won't start
```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps
```

### Database connection issues
- Verify DATABASE_URL is correct
- Check database container is running
- Ensure network connectivity

### Port conflicts
- Change ports in docker-compose.yml
- Check if ports are already in use: `lsof -i :8000`

### Build failures
```bash
# Clean build
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -t test .
```

## 📝 **Production Checklist**

- [ ] Strong SECRET_KEY set
- [ ] Environment variables configured
- [ ] HTTPS enabled (SSL certificate)
- [ ] Database backed up
- [ ] CORS_ORIGINS restricted
- [ ] File upload limits set
- [ ] Monitoring set up
- [ ] Logs configured
- [ ] Backup strategy in place
- [ ] Domain configured
- [ ] Security headers enabled

## 📚 **Additional Resources**

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [React Deployment](https://create-react-app.dev/docs/deployment/)

## ✅ **Status**

**Deployment Configuration: COMPLETE** 🎉

Ready to deploy HYPERFIT to any environment!



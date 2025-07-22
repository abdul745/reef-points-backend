# Backend Deployment Guide

This guide will help you deploy your NestJS backend so you can share it with your frontend developer.

## 🚀 Quick Deployment Options

### Option 1: Railway (Recommended - Easiest)

Railway is perfect for sharing with frontend developers because it's simple and provides a public URL.

**Steps:**

1. Go to [railway.app](https://railway.app) and sign up
2. Connect your GitHub repository
3. Railway will automatically detect it's a Node.js app
4. Add environment variables in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=3004
   DB_HOST=your-postgres-host
   DB_PORT=5432
   DB_USERNAME=your-username
   DB_PASSWORD=your-password
   DB_NAME=reefswap
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=1h
   ```
5. Railway will provide you with a public URL like: `https://your-app.railway.app`

### Option 2: Render (Free Tier Available)

**Steps:**

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub repository
3. Choose "Web Service"
4. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`
   - Environment: Node
5. Add environment variables in Render dashboard
6. Get your public URL

### Option 3: Heroku (Paid)

**Steps:**

1. Install Heroku CLI
2. Run these commands:
   ```bash
   heroku create your-app-name
   heroku addons:create heroku-postgresql:mini
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-secret-key
   git push heroku main
   ```

### Option 4: DigitalOcean App Platform

**Steps:**

1. Go to DigitalOcean App Platform
2. Connect your GitHub repository
3. Configure as Node.js app
4. Add environment variables
5. Deploy

## 🗄️ Database Setup

### For Production Database:

**Option A: Railway PostgreSQL (Free)**

- Add PostgreSQL service in Railway
- Railway will provide connection details automatically

**Option B: Supabase (Free Tier)**

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get connection details from Settings > Database
4. Update environment variables

**Option C: Neon (Free Tier)**

1. Go to [neon.tech](https://neon.tech)
2. Create new project
3. Get connection string
4. Update environment variables

## 🔧 Environment Variables

Create a `.env` file locally for testing:

```env
NODE_ENV=production
PORT=3004
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=reefswap
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=1h
FRONTEND_URL=https://your-frontend-url.com
```

## 📋 Pre-Deployment Checklist

- [ ] Update JWT secret to a strong random string
- [ ] Set up production database
- [ ] Configure CORS for your frontend domain
- [ ] Test the build locally: `npm run build && npm run start:prod`
- [ ] Ensure all environment variables are set

## 🔗 Sharing with Frontend Developer

Once deployed, share these details with your frontend developer:

1. **API Base URL**: `https://your-app.railway.app` (or your chosen platform)
2. **Available Endpoints**:

   - `GET /` - Health check
   - `POST /users/connect-wallet` - Connect wallet
   - `POST /users/admin-login` - Admin login
   - `GET /settings` - Get settings (admin only)
   - `POST /settings/update` - Update settings (admin only)
   - Points and referral endpoints (check your controllers)

3. **Authentication**: Use JWT tokens in Authorization header:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

## 🧪 Testing Your Deployment

Test your deployed API:

```bash
# Health check
curl https://your-app.railway.app/

# Connect wallet
curl -X POST https://your-app.railway.app/users/connect-wallet \
  -H "Content-Type: application/json" \
  -d '{"address": "0x123..."}'
```

## 🔒 Security Notes

- Change the default JWT secret
- Use HTTPS in production
- Set up proper CORS origins
- Consider rate limiting for production
- Use environment variables for all secrets

## 🆘 Troubleshooting

**Common Issues:**

1. **Build fails**: Check if all dependencies are in `package.json`
2. **Database connection fails**: Verify environment variables
3. **CORS errors**: Check frontend URL configuration
4. **Port issues**: Ensure PORT environment variable is set

**Logs**: Check your platform's logs for detailed error messages.

# 🚀 Quick Deployment Guide

Your NestJS backend is now ready for deployment! Here's the fastest way to share it with your frontend developer:

## ✅ What's Been Prepared

- ✅ Environment variables configured
- ✅ CORS enabled for frontend integration
- ✅ Database configuration updated
- ✅ JWT configuration secured
- ✅ Docker setup ready
- ✅ Railway configuration added
- ✅ Build tested and working

## 🎯 Recommended: Deploy to Railway (5 minutes)

1. **Go to [railway.app](https://railway.app)** and sign up with GitHub
2. **Click "New Project"** → "Deploy from GitHub repo"
3. **Select your repository** (`reefswap-backend`)
4. **Add PostgreSQL database**:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically link it to your app
5. **Set environment variables** in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=3004
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=1h
   ```
6. **Deploy!** Railway will automatically build and deploy your app
7. **Get your URL**: `https://your-app-name.railway.app`

## 🔗 Share with Frontend Developer

Send this to your frontend developer:

```
🎉 Backend is deployed and ready!

API Base URL: https://your-app-name.railway.app

Available Endpoints:
- GET / - Health check
- POST /users/connect-wallet - Connect wallet
- POST /users/admin-login - Admin login
- GET /settings - Get settings (admin only)
- POST /settings/update - Update settings (admin only)

Authentication: Include JWT token in Authorization header:
Authorization: Bearer <token>

CORS is enabled for all origins in development.
```

## 🧪 Test Your Deployment

```bash
# Health check
curl https://your-app-name.railway.app/

# Should return: "Hello World!"
```

## 🔧 Alternative Platforms

If Railway doesn't work for you:

- **Render**: [render.com](https://render.com) - Free tier available
- **Heroku**: [heroku.com](https://heroku.com) - Paid but very reliable
- **DigitalOcean App Platform**: [digitalocean.com](https://digitalocean.com)

## 🆘 Need Help?

1. Check the full `DEPLOYMENT.md` guide for detailed steps
2. Look at Railway logs if deployment fails
3. Ensure all environment variables are set
4. Test locally first: `npm run build && npm run start:prod`

Your backend is now production-ready! 🎉
 
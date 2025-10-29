# 🚀 Quick Start Guide - Qolabb Web App

Get up and running in 5 minutes!

## Prerequisites
- Node.js 18+ installed
- A text editor (VS Code recommended)
- Terminal access

## Step 1: Dependencies (Already Installed ✅)
The project dependencies are already installed. If you need to reinstall:
```bash
npm install
```

## Step 2: Environment Setup

1. **Copy the environment template**:
   The `.env.local` file exists but needs your Supabase credentials.

2. **Get Supabase credentials** (Optional for now):
   - Visit [supabase.com](https://supabase.com)
   - Create a free account and project
   - Get your Project URL and anon key
   - Update `.env.local`

   **Note**: The app will run without Supabase, but authentication won't work until configured.

## Step 3: Run the Application

```bash
npm run dev
```

The app will start at: `http://localhost:3000`

## Step 4: Explore the App

### Pages to Visit:
1. **Homepage**: `http://localhost:3000/`
   - Beautiful landing page with hero, features, about, and how it works

2. **Sign Up**: `http://localhost:3000/signup`
   - Registration form (requires Supabase setup to function)

3. **Login**: `http://localhost:3000/login`
   - Login form (requires Supabase setup to function)

4. **Onboarding**: `http://localhost:3000/onboarding`
   - Multi-step onboarding flow for new users

5. **Dashboard**: `http://localhost:3000/dashboard`
   - Basic dashboard layout (placeholder)

6. **Coming Soon**: `http://localhost:3000/coming-soon`
   - Animated placeholder for future features

## Step 5: Next Steps

### Without Supabase (Explore UI Only):
- ✅ View and interact with all pages
- ✅ Test responsive design (resize browser)
- ✅ Experience animations and interactions
- ❌ Cannot sign up/login (needs Supabase)

### With Supabase (Full Functionality):
1. Follow `SUPABASE_SETUP.md` for detailed instructions
2. Add credentials to `.env.local`
3. Restart the dev server
4. Test complete authentication flow

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Check for linting errors
npm run lint
```

## Project Structure at a Glance

```
📁 3_webapp_development/
  📁 app/              → Pages (login, signup, dashboard, etc.)
  📁 components/       → Reusable UI components
  📁 lib/              → Utilities (Supabase client)
  📄 .env.local        → Environment variables
  📄 README.md         → Full documentation
```

## Design Features

✨ **Visual Style**: Clean, modern, inspired by Codecademy & Uber  
🎨 **Colors**: Black/white/gray + navy & beige accents  
📱 **Responsive**: Mobile, tablet, desktop optimized  
🎭 **Animations**: Smooth Framer Motion transitions  
🎯 **Icons**: Unified Lucide React icons (no emojis)

## Troubleshooting

### Port 3000 already in use?
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

### Module not found errors?
```bash
# Clear Next.js cache and reinstall
rm -rf .next node_modules
npm install
```

### Styling not working?
```bash
# Rebuild Tailwind
npm run dev
```

## Getting Help

- 📖 **Full Documentation**: See `README.md`
- 🔐 **Supabase Setup**: See `SUPABASE_SETUP.md`
- 📊 **Project Summary**: See `PROJECT_SUMMARY.md`

## What's Working Right Now

| Feature | Status | Requires Supabase |
|---------|--------|-------------------|
| Homepage | ✅ Working | No |
| UI/Animations | ✅ Working | No |
| Navigation | ✅ Working | No |
| Sign Up Page | ✅ Working | Yes (for functionality) |
| Login Page | ✅ Working | Yes (for functionality) |
| Onboarding | ✅ Working | No (UI only) |
| Dashboard | ✅ Working | No (placeholder) |

## Production Deployment

### Deploy to Vercel (Recommended):
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

```bash
# Or use Vercel CLI
npx vercel --prod
```

---

**🎉 You're all set! Start exploring the app at http://localhost:3000**

**Questions?** Check the documentation files or the Supabase/Next.js official docs.

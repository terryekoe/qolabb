# Qolabb Web Application

A modern web application built with Next.js to promote equitable participation in student group projects.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)

## 📁 Project Structure

```
3_webapp_development/
├── app/                      # Next.js App Router pages
│   ├── (auth)/
│   │   ├── login/           # Login page
│   │   ├── signup/          # Sign up page
│   │   └── onboarding/      # Onboarding flow
│   ├── dashboard/           # Dashboard (Coming Soon)
│   ├── coming-soon/         # Coming Soon page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage
│   └── globals.css          # Global styles
├── components/              # Reusable components
│   ├── home/               # Homepage sections
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── AboutSection.tsx
│   │   └── HowItWorksSection.tsx
│   ├── Button.tsx
│   ├── Navigation.tsx
│   ├── Footer.tsx
│   └── ComingSoon.tsx
├── lib/                     # Utility libraries
│   └── supabase.ts         # Supabase client
└── public/                  # Static assets
```

## 🎨 Design System

### Color Palette
- **Primary**: Black/White/Gray
- **Accent 1**: Qolabb Navy (`#334e68` to `#102a43`)
- **Accent 2**: Qolabb Beige (`#b6a37c` to `#5e4b34`)

### Typography
- **Sans-serif**: Geist Sans (Inter fallback)
- **Monospace**: Geist Mono (JetBrains Mono fallback)

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📄 Pages

### Implemented
- ✅ **Homepage** (`/`) - Hero, Features, About, How It Works
- ✅ **Login** (`/login`) - Email/password authentication
- ✅ **Sign Up** (`/signup`) - User registration
- ✅ **Onboarding** (`/onboarding`) - New user setup flow
- ✅ **Coming Soon** (`/coming-soon`) - Placeholder for future features
- ✅ **Dashboard** (`/dashboard`) - Basic dashboard layout

### Planned
- ⏳ **Teams** - Create and manage teams
- ⏳ **Projects** - Track project contributions
- ⏳ **Analytics** - Participation insights and metrics
- ⏳ **Settings** - User preferences and account settings
- ⏳ **Profile** - User profile management

## 🔐 Authentication Setup (Supabase)

To enable authentication:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env.local` with your credentials
4. (Optional) Set up authentication providers in Supabase dashboard

## 🎯 Features

### Current
- Responsive design (mobile-first)
- Smooth animations and transitions
- Clean, modern UI inspired by Codecademy and Uber
- Email/password authentication flow
- Onboarding experience for new users

### Upcoming
- Team creation and management
- Contribution tracking
- Real-time analytics dashboard
- Participation metrics
- Export reports
- Notifications

## 🧪 Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📱 Responsive Design

The application is fully responsive and optimized for:
- 📱 Mobile (320px - 768px)
- 💻 Tablet (768px - 1024px)
- 🖥️ Desktop (1024px+)

## 🎨 Component Library

### Core Components
- `<Button>` - Primary UI button with variants
- `<Navigation>` - Main navigation bar
- `<Footer>` - Site footer with links
- `<ComingSoon>` - Placeholder for unimplemented features

### Page Sections
- `<HeroSection>` - Homepage hero banner
- `<FeaturesSection>` - Features showcase
- `<AboutSection>` - About Qolabb
- `<HowItWorksSection>` - Step-by-step guide

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

```bash
# Or use Vercel CLI
vercel --prod
```

## 📝 Environment Variables

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Your Supabase anon/public key
```

## 🤝 Contributing

This is a student project. Contributions and suggestions are welcome!

## 📄 License

MIT License - see main project README

## 👨‍💻 Author

**Terry Ekoe Aziaba**  
Project Lead / Developer / Researcher

---

**Built with ❤️ for fair team collaboration**

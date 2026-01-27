# CypherMed Frontend

Modern, glassmorphic web interface for CypherMed - decentralized medical records on Solana.

## 🎨 Design System

- **UI Style:** iOS 26 glassmorphism (frosted glass, backdrop blur)
- **Color Palette:** Hospital-inspired blues, teals, and clean whites
- **Framework:** Next.js 14 + React 18 + TypeScript
- **Styling:** Tailwind CSS with custom glassmorphism components
- **Animations:** Smooth transitions and float effects

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd app
npm install
# or
yarn install
```

### Development

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Pages

### Onboarding (`/`)
- 4-slide feature showcase
- Smooth carousel navigation
- Call-to-action buttons

### Login/Signup (`/login`)
- Email/password authentication
- Solana wallet connection (Phantom)
- Tab-based signup/signin switching
- Forgot password link

## 🎨 Components

### Glassmorphism Elements
- `.glass` - Full glassmorphic container
- `.glass-sm` - Smaller glass component
- `.glass-dark` - Dark variant with reduced opacity
- `.btn-primary` - Primary action button (gradient)
- `.btn-secondary` - Secondary button (glass style)
- `.input-glass` - Form input with glass styling

### Animations
- `animate-slide-up` - Page entrance animation
- `animate-float` - Floating emoji animation

## 🔌 Integration Checklist

- [ ] Connect Phantom/Solflare wallet
- [ ] Integrate backend API (http://localhost:3000/api)
- [ ] Authentication context (Zustand)
- [ ] Protected routes & redirects
- [ ] Patient dashboard
- [ ] Records list view
- [ ] Access requests management
- [ ] Notifications center

## 🎯 Next Steps

1. ✅ Onboarding & Login UI
2. Dashboard (patient home, overview)
3. Records management (list, create, view)
4. Access requests (approve/deny)
5. Notifications center
6. Settings & profile

## 📝 Color Reference

Hospital Blue: `#0284c7` - Primary
Hospital Teal: `#0d9488` - Secondary
Hospital Green: `#22c55e` - Success
Clean White: `#ffffff` - Background

## 🚀 Build & Deploy

```bash
npm run build
npm run start
```

Deploy to Vercel, Netlify, or your preferred host.

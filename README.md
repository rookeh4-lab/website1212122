# Plutora Client Web Application

A faithful, pixel-perfect recreation of the official [Plutora Client](https://plutoraclient.com/) web application built with React, Vite, React Router, and AOS (Animate On Scroll).

---

## 🚀 Features & Pages Included

### 1. **Landing Page (`/`)**
- **Hero Section**: Exact typography, gradient text (`hero-gradient`), CTA buttons ("Get Started Now", "Try free for 3 days"), and feature checkmarks (Fabric 1.21.11, Windows 10+, Instant Delivery).
- **Showcase Section**: Dual embedded 16:9 YouTube video player showcases.
- **Pricing Plans**: Interactive tiered pricing cards (`1 month`, `Lifetime` with Bestseller badge, `3 months`), feature lists, and dynamic discount calculations.
- **Free Trial CTA Box**: Quick invite to start the 3-day trial.

### 2. **Interactive Purchase & Checkout Flow**
- **Purchase Modal (`Zn`)**:
  - Email input & real-time discount code / affiliate referral code validation.
  - Multi-currency conversion selector (**USD**, **EUR**, **GBP**).
  - Stripe and PayPal payment method toggles.
  - Interactive statements check boxes and price recalculation.
- **Manual PayPal Modal (`CashAppModal` / `Xn`)**:
  - Randomized payment memo generation (`"thanks for the ride %user%"`, `"coffee on me %user%"`).
  - Step-by-step payment instructions, copy buttons, and confirmation state.
- **Checkout Success (`/checkout-success`)**:
  - Instant license key generation & copy-to-clipboard button.

### 3. **Authentication & User Dashboard**
- **Sign In (`/login`)**:
  - Discord OAuth integration button.
  - 6-digit OTP verification with auto-focus advance, paste parsing, and backspace retreat.
- **Dashboard (`/dashboard`)**:
  - **My Licenses**: Active key management, license renaming modal, HWID status, HWID reset confirmation with wipe effect, and extra reset purchases.
  - **Billing History**: Tabular summary of recent purchases and transaction status.
  - **FAQ Guide**: Interactive accordion trouble-shooting answers and direct Discord ticket help.

### 4. **Free Trial (`/trial`)**
- 3-day trial countdown and claim system with invitation code handling.
- Fileless launcher access for trial participants.

### 5. **Launcher & Download Center (`/download`)**
- Verification of active license.
- Single-use fileless PowerShell command minting and copying for instant in-game injection.

### 6. **Affiliate Partner Center (`/affiliates`)**
- 20% recurring revenue share tracker.
- Real-time click counters, referral sales, total earnings, and unpaid balance.
- Custom referral code updater and randomize generator.

### 7. **Live Stats & System Status**
- **Live Stats (`/stats`)**: Real-time counter animation (`requestAnimationFrame` cubic ease) for Live users, Total launches, Total accounts, and Active licenses.
- **System Health (`/status`)**: Live ping status for Backend API, Core Database, Discord Bot, and Stripe Gateway.
- **Changelog (`/changelog`)**: Release notes, Discord Rich Presence preview image, and feature list.

### 8. **Legal Pages**
- **Terms of Service (`/terms`)**
- **Privacy Policy (`/privacy`)**
- **Refund Policy (`/refund`)**

---

## 🛠️ Tech Stack
- **Framework**: [React 18](https://react.dev/)
- **Bundler / Dev Server**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router v6](https://reactrouter.com/)
- **Scroll Animations**: [AOS (Animate On Scroll)](https://michalsnik.github.io/aos/)
- **Design System**: Authentic Plutora dark mode styling with radial gradients, glassmorphism, and custom keyframes.

---

## 🏃 Running the Application

### Development Server:
```bash
npm run dev
```
Runs at `http://localhost:5173/`.

### Production Build:
```bash
npm run build
```
Creates the optimized production bundle in `dist/`.

### Preview Build:
```bash
npm run preview
```

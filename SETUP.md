# Lawanyabati Krishi Farm Management System

## Local Development Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- npm or yarn

### 1. Clone & Install
```bash
git clone <repo-url>
cd lawanyabati-farm
npm install
```

### 2. Create .env.local
Copy `.env.example` to `.env.local` and fill in values:
```bash
copy .env.example .env.local
```

Edit `.env.local`:
```
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```
Open http://localhost:3000

### 4. First Login
- **Username:** `admin`
- **Password:** `1234`
- **Change your password immediately** at `/dashboard/settings`

The system auto-creates admin credentials on first login. Alternatively run the seed script:
```bash
npm install dotenv  # if not already installed
node scripts/setup-admin.js
```

---

## Vercel Deployment

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Import in Vercel
- Go to [vercel.com](https://vercel.com) → **New Project**
- Import your GitHub repository
- Framework: **Next.js** (auto-detected)

### 3. Add Environment Variables in Vercel Dashboard
| Variable | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `NEXTAUTH_SECRET` | Random 32-char base64 string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |

### 4. Deploy
Vercel auto-deploys on every push to `main`.

---

## MongoDB Atlas Setup (Free Tier)
1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free **M0** cluster
3. **Database Access:** Create user with `readWrite` permissions
4. **Network Access:** Allow `0.0.0.0/0` (all IPs) for Vercel serverless functions
5. Copy connection string → replace `MONGODB_URI` in your environment variables

> **Connection pooling**: The app uses global MongoDB connection caching to stay within Atlas M0's 500-connection limit on Vercel serverless.

---

## Changing Admin Password
1. Login with current credentials
2. Navigate to **Dashboard → Settings**
3. Use the **Change Password** section
4. Enter your current password and new password, then save

---

## Adding Farmers
1. Go to the **Farmers** page
2. Click **Add Farmer**
3. Enter farmer code (e.g., `F-01`), name, phone, and milk rate per litre
4. Farmer codes must be unique across the system

---

## Daily Milk Entry Workflow
1. Open the **Entry** page — shift is auto-detected from the time of day
   - Before 12:00 PM → **Morning** shift
   - 12:00 PM or later → **Evening** shift
2. Enter quantity (litres) for each active farmer
3. Adjust rate per litre if different from the farmer's default
4. Click **Save All Entries**
5. **Duplicate protection:** re-saving updates existing entries for the same farmer/date/shift

---

## Project Structure
```
lawanyabati-farm/
├── src/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── dashboard/     # Protected dashboard pages
│   │   ├── globals.css    # Tailwind v4 CSS config
│   │   └── layout.tsx
│   ├── components/        # Reusable UI components
│   ├── lib/
│   │   ├── db.ts          # MongoDB connection utility
│   │   └── auth.ts        # NextAuth configuration
│   └── models/            # Mongoose schemas
├── scripts/
│   └── setup-admin.js     # Admin seed script
├── SETUP.md               # This file
└── .env.example           # Environment variable template
```

---

## Troubleshooting

### "Cannot connect to MongoDB"
- Verify `MONGODB_URI` is correctly set in `.env.local`
- Check Atlas **Network Access** allows your IP (or `0.0.0.0/0`)
- Ensure the database user has `readWrite` permissions

### "Invalid credentials" on login
- Run `node scripts/setup-admin.js` to reset admin to `admin / 1234`
- Ensure `NEXTAUTH_SECRET` is set in `.env.local`

### Build fails on Vercel
- Confirm all environment variables are added in the Vercel dashboard
- Check that `NEXTAUTH_URL` matches your Vercel deployment URL exactly

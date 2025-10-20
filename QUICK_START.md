# Apple Reward System - Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- A Supabase account (free at https://supabase.com)
- Git (for deployment to Vercel)

## Local Development Setup (5 minutes)

### 1. Clone and Install
\`\`\`bash
git clone <your-repo-url>
cd apple-reward-system
npm install
\`\`\`

### 2. Create Supabase Project
1. Go to https://supabase.com and sign up
2. Click "New Project"
3. Fill in project details and create
4. Wait for initialization (2-3 minutes)

### 3. Get Your Credentials
1. In Supabase dashboard, go to **Settings → API**
2. Copy these three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Setup Environment Variables
1. Create `.env.local` file in project root
2. Add your three Supabase credentials:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### 5. Run Database Migrations
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy entire content from `scripts/01-init-database.sql`
4. Paste and click **Run**
5. Repeat for `scripts/02-seed-data.sql`

### 6. Start Development Server
\`\`\`bash
npm run dev
\`\`\`
Visit http://localhost:3000

### 7. Test Login
Use demo credentials:
- **Admin**: admin@school.com / admin123
- **Assistant**: assistant@school.com / assist123

## Deployment to Vercel (5 minutes)

### 1. Push to GitHub
\`\`\`bash
git add .
git commit -m "Initial commit"
git push origin main
\`\`\`

### 2. Connect to Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Select the project

### 3. Add Environment Variables
1. In Vercel project settings, go to **Environment Variables**
2. Add all three Supabase variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Make sure they're set for **Production**

### 4. Deploy
1. Click **Deploy**
2. Wait for deployment to complete
3. Your app is live!

## Adding Users

### Add Admin User
\`\`\`sql
INSERT INTO users (name, email, password, role, barcode, apples)
VALUES ('New Admin', 'newadmin@school.com', 'password123', 'admin', '2003', 0);
\`\`\`

### Add Assistant User
\`\`\`sql
INSERT INTO users (name, email, password, role, barcode, apples)
VALUES ('New Assistant', 'newassistant@school.com', 'password123', 'assistant', '3003', 0);
\`\`\`

### Add Student
\`\`\`sql
INSERT INTO students (name, barcode, apples)
VALUES ('New Student', '1004', 0);
\`\`\`

## Features

### Admin Can:
- ✅ Scan their own barcode (2xxx) to mark attendance
- ✅ Scan student barcodes (1xxx) to view student info
- ✅ Add apples to students
- ✅ View their dashboard with attendance history

### Assistant Can:
- ✅ Scan student barcodes (1xxx) only
- ✅ View student information
- ✅ Cannot scan admin or other assistant barcodes
- ✅ View their dashboard

### Students:
- ✅ Can be scanned by admins and assistants
- ✅ Earn apples from attendance
- ✅ View their profile (future feature)

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` file exists
- Verify all three variables are present
- Restart dev server: `npm run dev`

### "Invalid email or password"
- Verify user exists in database
- Check exact email and password match
- Make sure seed data was inserted

### "Student not found"
- Verify barcode starts with "1"
- Check student exists in database
- Barcode must be unique

### Database Connection Error
- Verify Supabase project is active
- Check internet connection
- Verify environment variables are correct

## Next Steps

1. **Customize branding** - Update colors and logo
2. **Add more users** - Use SQL queries above
3. **Set up RLS** - Add Row Level Security for production
4. **Enable email verification** - For new accounts
5. **Add password hashing** - For security

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
\`\`\`

# Apple Reward System - Deployment Guide

## Step-by-Step Deployment Instructions

### Step 1: Set Up Supabase Database

1. **Create a Supabase Account**
   - Go to https://supabase.com
   - Click "Start your project"
   - Sign up with GitHub or email

2. **Create a New Project**
   - Click "New Project"
   - Choose a name (e.g., "apple-reward-system")
   - Set a strong database password
   - Select your region (closest to your users)
   - Click "Create new project" and wait for it to initialize

3. **Get Your Credentials**
   - Go to Project Settings → API
   - Copy your:
     - `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
     - `anon public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
     - `service_role` key (SUPABASE_SERVICE_ROLE_KEY)

### Step 2: Run Database Migrations

1. **Open Supabase SQL Editor**
   - In your Supabase dashboard, go to SQL Editor
   - Click "New Query"

2. **Run Initialization Script**
   - Copy the entire content from `scripts/01-init-database.sql`
   - Paste it into the SQL editor
   - Click "Run"
   - Wait for success message

3. **Seed Initial Data**
   - Click "New Query" again
   - Copy the entire content from `scripts/02-seed-data.sql`
   - Paste it into the SQL editor
   - Click "Run"

4. **Create Helper Functions** (Optional but recommended)
   - Create a new query and run:
   \`\`\`sql
   CREATE OR REPLACE FUNCTION increment_apples(user_id UUID, amount INTEGER)
   RETURNS void AS $$
   BEGIN
     UPDATE users SET apples = apples + amount WHERE id = user_id;
   END;
   $$ LANGUAGE plpgsql;

   CREATE OR REPLACE FUNCTION increment_student_apples(student_id UUID, amount INTEGER)
   RETURNS void AS $$
   BEGIN
     UPDATE students SET apples = apples + amount WHERE id = student_id;
   END;
   $$ LANGUAGE plpgsql;
   \`\`\`

### Step 3: Set Up Environment Variables

1. **Create `.env.local` file** (for local development)
   \`\`\`
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   \`\`\`

2. **For Production (Vercel)**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add the three variables above
   - Make sure they're set for Production environment

### Step 4: Deploy to Vercel

1. **Connect Your Repository**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Select the repository containing this project

2. **Configure Environment Variables**
   - In the "Environment Variables" section, add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Paste the values from Step 3

3. **Deploy**
   - Click "Deploy"
   - Wait for the deployment to complete
   - Your app will be live at the provided URL

### Step 5: Test Your Deployment

1. **Test Login**
   - Go to your deployed URL
   - Try logging in with:
     - Email: `admin@school.com`
     - Password: `admin123`
   - Or:
     - Email: `assistant@school.com`
     - Password: `assist123`

2. **Test Barcode Scanning**
   - After login, try scanning a student barcode (e.g., `1001`)
   - Verify the student data appears

3. **Test Dashboard**
   - Click on your profile to view the dashboard
   - Verify your attendance and apples are displayed

## Adding More Users

To add more admin or assistant users:

1. **Go to Supabase SQL Editor**
2. **Run this query:**
   \`\`\`sql
   INSERT INTO users (name, email, password, role, barcode, apples)
   VALUES ('New User Name', 'email@school.com', 'password123', 'admin', '2002', 0);
   \`\`\`
   - Change `role` to 'admin' or 'assistant'
   - Change `barcode` to a unique value starting with 2 (admin) or 3 (assistant)

## Adding More Students

To add more students:

1. **Go to Supabase SQL Editor**
2. **Run this query:**
   \`\`\`sql
   INSERT INTO students (name, barcode, apples)
   VALUES ('Student Name', '1004', 0);
   \`\`\`
   - Change `barcode` to a unique value starting with 1

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure all three environment variables are set in `.env.local` (local) or Vercel (production)
- Restart your development server after adding `.env.local`

### "Invalid email or password"
- Verify the user exists in the database
- Check the email and password are correct
- Make sure you're using the exact values from the seed data

### "Student not found"
- Verify the barcode exists in the students table
- Make sure the barcode starts with "1" for students

### Database Connection Issues
- Verify your Supabase project is active
- Check that your IP is not blocked (Supabase allows all IPs by default)
- Verify the environment variables are correct

## Next Steps

1. **Add Row Level Security (RLS)** for better security
2. **Implement password hashing** instead of storing plain text passwords
3. **Add email verification** for new accounts
4. **Set up automated backups** in Supabase
5. **Monitor usage** with Supabase analytics

## Support

For issues with:
- **Supabase**: https://supabase.com/docs
- **Vercel**: https://vercel.com/docs
- **Next.js**: https://nextjs.org/docs
\`\`\`

\`\`\`json file="" isHidden

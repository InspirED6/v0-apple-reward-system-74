# Apple Reward System

A modern web application for managing student rewards using an apple-based point system. Admins and assistants can scan barcodes to track attendance and award apples to students.

## Features

- 🔐 **Secure Authentication** - Email/password login for admins and assistants
- 📱 **Mobile-Friendly** - Works on iPhone and Android with camera support
- 📊 **Dashboard** - View attendance history and earned apples
- 🎯 **Role-Based Access** - Different permissions for admins and assistants
- 🍎 **Reward System** - Track apples earned through attendance
- 💾 **Real Database** - Supabase PostgreSQL for data persistence
- 🚀 **Production Ready** - Deployed on Vercel

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Barcode**: HTML5 Canvas for barcode detection

## Quick Start

See [QUICK_START.md](./QUICK_START.md) for detailed setup instructions.

### TL;DR
\`\`\`bash
npm install
# Add .env.local with Supabase credentials
npm run dev
\`\`\`

## Project Structure

\`\`\`
app/
├── page.tsx                 # Home page (redirects to login)
├── login/
│   └── page.tsx            # Login page
├── dashboard/
│   └── [name]/
│       └── page.tsx        # User dashboard
└── api/
    ├── auth/
    │   ├── login/route.ts  # Authentication endpoint
    │   └── logout/route.ts # Logout endpoint
    ├── scan/route.ts       # Barcode scanning endpoint
    └── dashboard/
        └── [name]/route.ts # Dashboard data endpoint

lib/
└── db.ts                   # Supabase client configuration

scripts/
├── 01-init-database.sql    # Database schema
└── 02-seed-data.sql        # Initial data
\`\`\`

## Database Schema

### Users Table
- Stores admin and assistant accounts
- Fields: id, name, email, password, role, barcode, apples, created_at, updated_at

### Students Table
- Stores student information
- Fields: id, name, barcode, apples, created_at, updated_at

### Attendance Table
- Tracks attendance records
- Fields: id, user_id, attendance_date, created_at

### Loyalty History Table
- Tracks weekly bonuses
- Fields: id, user_id, week, bonus_apples, created_at

### Apple Transactions Table
- Logs all apple additions
- Fields: id, student_id, admin_id, apples_added, reason, created_at

## Deployment

### Deploy to Vercel
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## User Roles

### Admin
- Can scan their own barcode to mark attendance
- Can scan student barcodes to view/manage students
- Can add apples to students
- Earns 150 apples per attendance
- Earns 50 bonus apples for 3+ attendances per week

### Assistant
- Can only scan student barcodes
- Cannot scan admin or other assistant barcodes
- Can view student information
- Cannot add apples (admin only)

### Student
- Can be scanned by admins and assistants
- Earns apples from attendance
- Can view their profile (future feature)

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.com | admin123 |
| Assistant | assistant@school.com | assist123 |

## Security Notes

⚠️ **Important**: This is a demo application. For production use:
- Implement password hashing (bcrypt)
- Enable Row Level Security (RLS) in Supabase
- Use environment variables for sensitive data
- Implement email verification
- Add rate limiting
- Use HTTPS only

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your needs.

## Support

For issues or questions:
1. Check [QUICK_START.md](./QUICK_START.md) for common issues
2. Review [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for deployment help
3. Check Supabase and Vercel documentation

## Roadmap

- [ ] Student profile page
- [ ] Leaderboard
- [ ] Email notifications
- [ ] Password reset
- [ ] Two-factor authentication
- [ ] Admin panel for user management
- [ ] Analytics dashboard
- [ ] Export reports
\`\`\`

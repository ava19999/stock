# Setup Guide: New Login System

This guide walks you through completing the setup of the new authentication system.

## What Has Been Implemented

✅ **Code Changes**:
- Created authentication service (`services/authService.ts`)
- Updated App.tsx to use database authentication
- Removed auto-login behavior
- Implemented proper session management

✅ **Database Migration**:
- Created SQL migration script (`migrations/001_create_users_table.sql`)
- Migration creates `users` table with proper schema
- Includes default admin user creation

✅ **Documentation**:
- Complete authentication system documentation (`docs/AUTHENTICATION.md`)
- Migration instructions (`migrations/README.md`)
- Security considerations documented

## What You Need to Do

### 1. Run Database Migration (Required)

The authentication system requires a `users` table in your Supabase database. Follow these steps:

1. Open your Supabase project: https://doyyghsijggiibkcktuq.supabase.co
2. Navigate to: **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `migrations/001_create_users_table.sql`
5. Click **Run** to execute the migration
6. Verify success by checking the **Table Editor** - you should see a new `users` table

### 2. Verify Default Admin User

After running the migration:

1. Go to **Table Editor** in Supabase
2. Select the `users` table
3. Verify there is one row with:
   - username: `ava`
   - password: `9193`
   - name: `Admin Ava`
   - role: `admin`

### 3. Test the Application

Once the database is set up:

1. **Clear browser storage** (to remove old session data):
   - Open browser DevTools (F12)
   - Go to Application → Local Storage
   - Clear all items starting with `stockmaster_`

2. **Build and run the app**:
   ```bash
   npm install
   npm run dev
   ```

3. **Test Admin Login**:
   - You should see the login screen (no auto-login)
   - Enter username: `ava`
   - Enter password: `9193`
   - Click "Masuk Aplikasi"
   - Should redirect to inventory view

4. **Test Guest Login**:
   - Logout if logged in
   - Enter any name (e.g., "John Doe")
   - Leave password field empty
   - Click "Masuk Aplikasi"
   - Should redirect to shop view

5. **Test Session Persistence**:
   - After logging in, refresh the page
   - Should remain logged in
   - Logout and verify session is cleared

## Troubleshooting

### Issue: "Login Gagal" or "Login Failed"

**Possible causes**:
1. Database migration not run yet
2. Supabase connection issues
3. Wrong credentials

**Solution**:
- Check Supabase connection in browser console
- Verify `users` table exists in Supabase
- Check credentials match database

### Issue: Application shows blank screen

**Possible causes**:
1. JavaScript error in browser console
2. Build issues

**Solution**:
- Check browser console for errors
- Run `npm run build` to verify no build errors
- Clear browser cache

### Issue: Auto-login still happening

**Possible causes**:
1. Old session data in localStorage
2. Browser cache

**Solution**:
- Clear browser localStorage
- Clear browser cache
- Do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Next Steps (Optional Enhancements)

After the basic system is working, consider these enhancements:

1. **Password Hashing**:
   - Implement bcrypt for password hashing
   - Migrate existing passwords

2. **User Registration**:
   - Add user registration form
   - Add email validation

3. **Session Management**:
   - Implement JWT tokens
   - Add session expiration
   - Add refresh tokens

4. **Security Hardening**:
   - Add rate limiting
   - Implement account lockout
   - Add audit logging
   - Remove public insert policy from users table

5. **Use Supabase Auth**:
   - Migrate to Supabase's built-in authentication
   - Get benefits of managed authentication service

## Support

For detailed information about the authentication system, see:
- `docs/AUTHENTICATION.md` - Complete system documentation
- `migrations/README.md` - Database migration details
- `services/authService.ts` - Authentication service code

## Security Reminder

⚠️ **This implementation uses plain text passwords for simplicity.** 

Before deploying to production:
1. Implement password hashing (bcrypt/argon2)
2. Use HTTPS for all connections
3. Add rate limiting
4. Implement proper session management
5. Consider using Supabase Auth
6. Review and restrict RLS policies

---

**Questions or Issues?** Check the documentation or review the code comments for more details.

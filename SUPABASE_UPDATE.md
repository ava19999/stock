# Supabase Configuration Update - Summary

## What Was Done

This update addresses the requirements in the problem statement to configure Supabase integration with the provided API credentials and ensure proper access to the `base_mjm` and `base_bjw` tables.

### Changes Made

1. **Updated Supabase ANON_KEY**
   - Updated `.env` file with the new ANON_KEY
   - Updated `lib/supabase.ts` with the new ANON_KEY
   - Added warning comments about potential JWT payload issue

2. **Enhanced Logging**
   - Added detailed console logging in `services/supabaseService.ts` for:
     - Table name resolution (which table is being accessed for which store)
     - Successful data fetches (with item counts)
     - Error details (message, code, hint) when data access fails
   - This helps diagnose RLS misconfiguration or blocked keys

3. **Verified Table Mapping Logic**
   - Confirmed `getTableName()` correctly maps stores to tables:
     - `mjm` store → `base_mjm` table ✓
     - `bjw` store → `base_bjw` table ✓
     - Default/null → `base` table ✓

4. **Created Documentation**
   - Added `docs/SUPABASE_CONFIG.md` with comprehensive guide covering:
     - Configuration structure
     - Table schema and mapping
     - Debugging common issues
     - Testing procedures

## Configuration Details

**Supabase URL:** `https://doyyghsijggiibkcktuq.supabase.co`

**ANON_KEY:** Updated with the key from problem statement (expires 2080)

**Tables:**
- `base_mjm` - MJM store inventory
- `base_bjw` - BJW store inventory  
- `base` - Legacy/default table

## How to Verify

### 1. Check Build
```bash
npm install
npm run build
```
✅ Build should complete successfully without errors

### 2. Test Application (Requires Live Supabase Access)

Since the sandboxed environment cannot access the Supabase API, manual verification should be done in a live environment:

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open the application in a browser**

3. **Open browser console (F12)** to see the logging output

4. **Login and select a store (MJM or BJW)**

5. **Navigate to the Inventory/Dashboard view**

6. **Check console logs for:**
   ```
   Supabase client initialized successfully with URL: https://doyyghsijggiibkcktuq.supabase.co
   [SupabaseService] Using table: base_mjm for store: mjm
   [fetchInventory] Fetching all items from table: base_mjm
   [fetchInventory] Successfully fetched X items from base_mjm
   ```

7. **Verify data is displayed** in the inventory list

### 3. If Data Access Fails

If you see errors in the console, check for:

#### Error: "JWT expired" or 401 Unauthorized
- The ANON_KEY may be invalid or malformed
- Solution: Regenerate ANON_KEY in Supabase dashboard

#### Error: Mentions "row-level security" or "insufficient privileges"
- RLS policies may not be configured correctly
- Solution: Check RLS policies in Supabase dashboard for `base_mjm` and `base_bjw` tables
- Ensure SELECT policies allow public/anon access:
  ```sql
  CREATE POLICY "Enable read access for all users" ON public.base_mjm
  FOR SELECT USING (true);
  
  CREATE POLICY "Enable read access for all users" ON public.base_bjw
  FOR SELECT USING (true);
  ```

#### Error: "relation does not exist"
- Tables `base_mjm` or `base_bjw` may not exist in the database
- Solution: Create the tables in Supabase SQL editor or verify table names

## Important Note About the ANON_KEY

⚠️ The ANON_KEY provided in the problem statement has a JWT payload that appears to be missing the role value (`"role",` instead of `"role":"anon",`). This is noted in the code with comments. If authentication fails, the key should be regenerated in the Supabase dashboard with a proper structure.

A properly formatted JWT payload should look like:
```json
{
  "iss": "supabase",
  "ref": "doyyghsijggiibkcktuq",
  "role": "anon",
  "iat": 1765259756,
  "exp": 2080835756
}
```

## Files Modified

- `.env` - Updated ANON_KEY
- `lib/supabase.ts` - Updated ANON_KEY, added warning comment
- `services/supabaseService.ts` - Enhanced logging in fetch functions
- `docs/SUPABASE_CONFIG.md` - New comprehensive documentation
- `.gitignore` - Added test files to ignore list

## Next Steps

1. Deploy the changes to your environment
2. Test the application with live Supabase access
3. Check browser console logs to verify table access
4. If issues occur, follow the debugging guide in `docs/SUPABASE_CONFIG.md`
5. If JWT errors occur, regenerate the ANON_KEY in Supabase dashboard

## Questions or Issues?

See the detailed documentation in `docs/SUPABASE_CONFIG.md` for:
- Complete configuration reference
- Troubleshooting guide
- Common issues and solutions
- RLS policy examples

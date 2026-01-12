# Database Routing Test Plan

## Purpose
Verify that the application correctly routes database queries to store-specific tables (base_mjm, base_bjw) based on user login.

## Prerequisites
Before running these tests, ensure the Supabase database has the following tables:
- `base_mjm` (MJM store inventory)
- `base_bjw` (BJW store inventory)
- `barang_masuk_mjm`, `barang_masuk_bjw` (stock in records)
- `barang_keluar_mjm`, `barang_keluar_bjw` (stock out records)
- `orders_mjm`, `orders_bjw` (order records)
- `foto_mjm`, `foto_bjw` (photo records)
- `list_harga_jual_mjm`, `list_harga_jual_bjw` (price lists)
- `chat_sessions_mjm`, `chat_sessions_bjw` (chat sessions)
- `retur_mjm`, `retur_bjw` (return records)
- `scan_resi_mjm`, `scan_resi_bjw` (shipping scan logs)

## Test Scenarios

### Test 1: Store Selection
**Steps:**
1. Open the application
2. Verify that StoreSelector screen appears
3. Click on "MJM86 AUTOPART"
4. Verify that LoginPage for MJM appears with yellow theme
5. Go back and select "BJW AUTOPART"
6. Verify that LoginPage for BJW appears with red theme

**Expected Result:**
- Store selection works correctly
- Theme changes based on store selection
- Database context is set (check browser console for `setDatabaseStore` calls)

### Test 2: MJM Store Database Access
**Steps:**
1. Select MJM86 store
2. Login as admin with name "Admin" and password "mjm123"
3. Navigate to Inventory/Dashboard view
4. Open browser Developer Tools > Network tab
5. Filter for Supabase API calls
6. Add a new inventory item
7. Check the Network tab for the POST request to Supabase

**Expected Result:**
- All database queries should target tables ending with `_mjm`
- POST request should insert into `base_mjm` table
- No queries to `_bjw` tables should be visible

**Validation Points:**
- Check that inventory items are fetched from `base_mjm`
- Check that price data comes from `list_harga_jual_mjm`
- Check that photos come from `foto_mjm`

### Test 3: BJW Store Database Access
**Steps:**
1. Logout from MJM store
2. Select BJW store
3. Login as admin with name "Admin" and password "bjw123"
4. Navigate to Inventory/Dashboard view
5. Open browser Developer Tools > Network tab
6. Filter for Supabase API calls
7. Add a new inventory item
8. Check the Network tab for the POST request to Supabase

**Expected Result:**
- All database queries should target tables ending with `_bjw`
- POST request should insert into `base_bjw` table
- No queries to `_mjm` tables should be visible

**Validation Points:**
- Check that inventory items are fetched from `base_bjw`
- Check that price data comes from `list_harga_jual_bjw`
- Check that photos come from `foto_bjw`

### Test 4: Data Isolation
**Steps:**
1. Login to MJM store and create a test item "TEST-MJM-001"
2. Note the item details
3. Logout and login to BJW store
4. Search for "TEST-MJM-001"
5. Verify item is not found
6. Create a test item "TEST-BJW-001" in BJW store
7. Logout and login back to MJM store
8. Search for "TEST-BJW-001"
9. Verify item is not found

**Expected Result:**
- Items created in MJM store are not visible in BJW store
- Items created in BJW store are not visible in MJM store
- Complete data isolation between stores

### Test 5: Order Management
**Steps:**
1. Login to MJM store as guest
2. Add items to cart and checkout with name "Test Customer MJM"
3. Logout and login as admin to MJM store
4. Check Orders section - verify the order appears
5. Logout and login to BJW store as admin
6. Check Orders section - verify the MJM order does NOT appear
7. Create an order in BJW store with name "Test Customer BJW"
8. Verify it appears in BJW orders but not in MJM orders

**Expected Result:**
- Orders are isolated per store
- MJM orders stored in `orders_mjm`
- BJW orders stored in `orders_bjw`

### Test 6: Context Persistence
**Steps:**
1. Login to MJM store
2. Add an inventory item
3. Refresh the browser page (F5)
4. Verify you're still logged into MJM store
5. Verify the item you added is still there
6. Check localStorage in DevTools - verify `stockmaster_auth_state` contains `selectedStore: "mjm"`

**Expected Result:**
- Store selection persists across page refreshes
- Database context is correctly restored on page load
- User remains logged into the same store

### Test 7: Console Verification
**Steps:**
1. Open browser console
2. Login to MJM store
3. Execute in console: `import { getDatabaseStore } from './lib/databaseConfig'; console.log(getDatabaseStore());`
4. Verify output is "mjm"
5. Logout and login to BJW store
6. Execute same command
7. Verify output is "bjw"

**Expected Result:**
- Database store context correctly reflects selected store
- Context changes appropriately on store switch

## Manual Inspection

### Code Inspection
Verify the following in the codebase:

1. **No hardcoded table names:**
   ```bash
   grep -r "from('base')" services/
   grep -r "from('orders')" services/
   # Should return no results
   ```

2. **All table names use getTableName:**
   ```bash
   grep -r "getTableName" services/
   # Should show multiple occurrences
   ```

3. **Store context is set:**
   ```bash
   grep -r "setDatabaseStore" context/
   # Should show calls in StoreContext
   ```

### Database Inspection
Check Supabase dashboard:

1. Verify tables exist with correct naming:
   - `base_mjm` and `base_bjw`
   - All supporting tables with `_mjm` and `_bjw` suffixes

2. Insert test data in both tables to enable testing

3. Verify table schemas are identical between mjm and bjw versions

## Success Criteria

✅ All database queries route to correct store-specific tables
✅ No cross-store data leakage
✅ Store context persists across page refreshes
✅ Build completes without errors
✅ No hardcoded table references in service layer
✅ Login flow remains unchanged from user perspective

## Troubleshooting

### Issue: Queries failing with "table not found"
**Cause:** Supabase tables with `_mjm` or `_bjw` suffix don't exist
**Solution:** Create the required tables in Supabase database

### Issue: Seeing data from wrong store
**Cause:** Database context not set properly
**Solution:** Check that `setDatabaseStore()` is called in StoreContext when store is selected

### Issue: Context not persisting
**Cause:** localStorage not being set/read correctly
**Solution:** Check browser console for errors, verify localStorage permissions

### Issue: Login works but queries fail
**Cause:** Database context set but tables don't exist
**Solution:** Verify all required tables exist with proper suffixes in Supabase

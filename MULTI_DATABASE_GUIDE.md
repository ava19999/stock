# Multi-Database Implementation Guide

## Overview

This application now supports multiple databases based on user login. When a user selects a store (MJM86 or BJW), all database operations are automatically routed to that store's specific tables.

## Architecture

### Database Table Naming Convention

All tables are suffixed with the store identifier:

**MJM86 Store Tables:**
- `base_mjm` - Main inventory
- `barang_masuk_mjm` - Stock in transactions
- `barang_keluar_mjm` - Stock out transactions
- `foto_mjm` - Product photos
- `list_harga_jual_mjm` - Selling price list
- `orders_mjm` - Customer orders
- `chat_sessions_mjm` - Customer chat sessions
- `retur_mjm` - Return transactions
- `scan_resi_mjm` - Shipping tracking logs

**BJW Store Tables:**
- `base_bjw` - Main inventory
- `barang_masuk_bjw` - Stock in transactions
- `barang_keluar_bjw` - Stock out transactions
- `foto_bjw` - Product photos
- `list_harga_jual_bjw` - Selling price list
- `orders_bjw` - Customer orders
- `chat_sessions_bjw` - Customer chat sessions
- `retur_bjw` - Return transactions
- `scan_resi_bjw` - Shipping tracking logs

### Key Components

#### 1. Database Configuration (`lib/databaseConfig.ts`)
This module manages the database routing logic:

```typescript
// Set the current store context
setDatabaseStore(store: StoreType)

// Get the current store context
getDatabaseStore(): StoreType

// Get table name with appropriate prefix
getTableName(baseTableName: string): string

// Get all table names for current store
getTableNames()
```

#### 2. Store Context (`context/StoreContext.tsx`)
Manages user authentication and store selection:
- Calls `setDatabaseStore()` when a store is selected
- Persists store selection in localStorage
- Clears database context on logout

#### 3. Supabase Service (`services/supabaseService.ts`)
All database operations now use dynamic table names:
- Uses `getBaseTableName()` for inventory table
- Uses `getTableName('tablename')` for other tables
- No hardcoded table names

## Setup Instructions

### 1. Database Setup in Supabase

You need to create duplicate tables for each store. For each table in the original schema, create two versions:

**Example for `base` table:**
1. Create `base_mjm` with the same schema as original `base`
2. Create `base_bjw` with the same schema as original `base`

**Repeat for all tables:**
- barang_masuk → barang_masuk_mjm, barang_masuk_bjw
- barang_keluar → barang_keluar_mjm, barang_keluar_bjw
- foto → foto_mjm, foto_bjw
- list_harga_jual → list_harga_jual_mjm, list_harga_jual_bjw
- orders → orders_mjm, orders_bjw
- chat_sessions → chat_sessions_mjm, chat_sessions_bjw
- retur → retur_mjm, retur_bjw
- scan_resi → scan_resi_mjm, scan_resi_bjw

### 2. SQL Script to Clone Tables

Here's a sample SQL script to help create the suffixed tables:

```sql
-- Example: Clone base table for MJM store
CREATE TABLE base_mjm (LIKE base INCLUDING ALL);

-- Example: Clone base table for BJW store
CREATE TABLE base_bjw (LIKE base INCLUDING ALL);

-- Repeat for all other tables
CREATE TABLE barang_masuk_mjm (LIKE barang_masuk INCLUDING ALL);
CREATE TABLE barang_masuk_bjw (LIKE barang_masuk INCLUDING ALL);

CREATE TABLE barang_keluar_mjm (LIKE barang_keluar INCLUDING ALL);
CREATE TABLE barang_keluar_bjw (LIKE barang_keluar INCLUDING ALL);

-- Continue for remaining tables...
```

### 3. Data Migration (Optional)

If you have existing data in the original tables, decide which store it belongs to and migrate:

```sql
-- Example: Move existing data to MJM store
INSERT INTO base_mjm SELECT * FROM base;

-- Or split data between stores based on criteria
-- INSERT INTO base_mjm SELECT * FROM base WHERE [some_condition];
-- INSERT INTO base_bjw SELECT * FROM base WHERE [other_condition];
```

## User Flow

### 1. Store Selection
- User opens application
- Store selector shows two options: MJM86 and BJW
- User clicks on desired store
- `setDatabaseStore(store)` is called internally
- User proceeds to login page

### 2. Login
- User sees login page themed for selected store
- User enters credentials (unchanged from before)
- On successful login, `setDatabaseStore()` is verified
- All subsequent database queries use correct table suffix

### 3. Data Operations
- All CRUD operations automatically route to correct tables
- Example: Adding inventory item in MJM store → inserts to `base_mjm`
- Example: Creating order in BJW store → inserts to `orders_bjw`

### 4. Data Isolation
- MJM users see only MJM data
- BJW users see only BJW data
- No cross-store data visibility or leakage

## Development Guide

### Adding New Database Operations

When adding new database operations, always use `getTableName()`:

```typescript
// ❌ DON'T do this:
const { data } = await supabase.from('my_table').select('*');

// ✅ DO this:
const { data } = await supabase.from(getTableName('my_table')).select('*');
```

### Testing in Development

Use the browser console validation utilities:

```javascript
// Check current store context
window.showCurrentStore();

// Show all table name mappings
window.showTableNames();

// Run full validation
window.validateDatabaseRouting();
```

### Common Patterns

**Fetching data:**
```typescript
const { data } = await supabase
  .from(getTableName('orders'))
  .select('*')
  .eq('status', 'pending');
```

**Inserting data:**
```typescript
const { error } = await supabase
  .from(getTableName('base'))
  .insert([{ /* data */ }]);
```

**Updating data:**
```typescript
const { error } = await supabase
  .from(getTableName('orders'))
  .update({ status: 'completed' })
  .eq('id', orderId);
```

## Troubleshooting

### Issue: "Table does not exist" error
**Solution:** Verify all required tables with `_mjm` and `_bjw` suffixes exist in Supabase.

### Issue: Seeing wrong store's data
**Solution:** Check that store context is set correctly:
```javascript
window.showCurrentStore(); // Should show 'mjm' or 'bjw'
```

### Issue: Data not persisting after page refresh
**Solution:** Check localStorage for `stockmaster_auth_state`. Should contain correct `selectedStore` value.

### Issue: Cannot switch between stores
**Solution:** Use the logout button to clear current session, then select different store.

## Security Considerations

1. **Row Level Security (RLS):** Consider adding RLS policies in Supabase to enforce data isolation at the database level.

2. **API Keys:** The same Supabase API keys work for both stores. Consider separate projects for complete isolation.

3. **Password Security:** Store passwords (currently in code) should be moved to environment variables or secure backend.

## Migration Checklist

- [ ] Create all `_mjm` suffixed tables in Supabase
- [ ] Create all `_bjw` suffixed tables in Supabase  
- [ ] Verify table schemas match between mjm/bjw versions
- [ ] Migrate existing data to appropriate store tables
- [ ] Test MJM store login and data operations
- [ ] Test BJW store login and data operations
- [ ] Verify data isolation between stores
- [ ] Set up database backups for both stores
- [ ] Configure RLS policies if needed
- [ ] Update documentation for end users

## Monitoring

Monitor the following:
- Database query patterns (ensure queries hit correct tables)
- Error rates (should not increase with multi-db support)
- Data consistency (verify no cross-store contamination)
- Performance (table suffixes should have minimal impact)

## Future Enhancements

Potential improvements:
1. Add store-specific database connections (separate Supabase projects)
2. Implement automatic table creation on store setup
3. Add data export/import between stores
4. Create admin panel for cross-store analytics
5. Add audit logging for store switches

# Database Scripts

This directory contains utility scripts for managing the Supabase database.

## Clear Database Script

The `clearDatabase.ts` script clears all data from specific Supabase tables.

### Tables Cleared

The script will empty the following tables:
- `list_harga_jual` - Pricing information
- `inventory` - Inventory/stock data
- `barang_masuk` - Incoming goods records
- `barang_keluar` - Outgoing goods records

### Configuration

The script uses the Supabase configuration from `lib/supabase.ts` by default. This means it will work out of the box with your existing project configuration.

#### Using environment variables (optional)

If you want to use different credentials, you can override them with environment variables:

```bash
# Linux/Mac
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-supabase-anon-key"
npm run clear-db

# Windows (Command Prompt)
set SUPABASE_URL=your-supabase-url
set SUPABASE_ANON_KEY=your-supabase-anon-key
npm run clear-db

# Windows (PowerShell)
$env:SUPABASE_URL="your-supabase-url"
$env:SUPABASE_ANON_KEY="your-supabase-anon-key"
npm run clear-db
```

### Usage

#### Using npm script (recommended)

```bash
npm run clear-db
```

#### Direct execution (TypeScript)

```bash
tsx scripts/clearDatabase.ts
```

Or with ts-node (if configured):

```bash
ts-node scripts/clearDatabase.ts
```

#### Direct execution (JavaScript)

If you prefer to use the plain JavaScript version (CommonJS):

```bash
node scripts/clearDatabase.cjs
```

### Features

- **Multiple table support**: Clears multiple tables in sequence
- **Error handling**: Continues clearing other tables even if one fails
- **Logging**: Provides detailed console output for each operation
- **Confirmation**: Shows count of records before and after deletion
- **Summary**: Provides a summary of successful and failed operations

### Example Output

```
═══════════════════════════════════════════════════════════
🗑️  SUPABASE DATABASE CLEAR SCRIPT
═══════════════════════════════════════════════════════════

⚠️  WARNING: This will DELETE ALL DATA from the following tables:
   - list_harga_jual
   - inventory
   - barang_masuk
   - barang_keluar

🔧 Initializing Supabase client...
   URL: https://doyyghsijggiibkcktuq.supabase.co
✅ Supabase client initialized successfully

📋 Clearing table: list_harga_jual...
   📊 Found 150 records to delete
   ✅ Successfully cleared 150 records from list_harga_jual
   📊 Remaining records: 0

📋 Clearing table: inventory...
   📊 Found 0 records to delete
   ✅ Table inventory is already empty

📋 Clearing table: barang_masuk...
   📊 Found 320 records to delete
   ✅ Successfully cleared 320 records from barang_masuk
   📊 Remaining records: 0

📋 Clearing table: barang_keluar...
   📊 Found 280 records to delete
   ✅ Successfully cleared 280 records from barang_keluar
   📊 Remaining records: 0

═══════════════════════════════════════════════════════════
📊 SUMMARY
═══════════════════════════════════════════════════════════

✅ Successfully cleared: 4 table(s)

🎉 All tables cleared successfully!
═══════════════════════════════════════════════════════════
```

### Safety Considerations

⚠️ **WARNING**: This script will permanently delete all data from the specified tables. This action cannot be undone.

- Always backup your data before running this script
- Use with caution in production environments
- Consider using database snapshots or backups
- Test in a development environment first

### Troubleshooting

#### Permission Errors

If you encounter permission errors, ensure that:
1. Your `SUPABASE_ANON_KEY` has the necessary permissions to delete records
2. The tables have proper RLS (Row Level Security) policies configured
3. You're using the correct Supabase URL and key

#### Table Not Found Errors

If a table doesn't exist:
1. Check the table name spelling
2. Verify the table exists in your Supabase database
3. The script will log the error but continue with other tables

### Exit Codes

- `0` - All tables cleared successfully
- `1` - One or more tables failed to clear or a fatal error occurred

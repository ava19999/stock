<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# StockMaster AI - Multi-Store Inventory Management System

This application provides a complete inventory management solution with support for multiple stores (MJM86 and BJW). Each store has its own isolated database, ensuring complete data separation and security.

## ✨ Features

- 🏪 **Multi-Store Support**: Separate database instances for MJM86 and BJW stores
- 🔐 **Store-Specific Login**: Each store has its own authentication and data access
- 📦 **Complete Inventory Management**: Track stock levels, prices, and transactions
- 📊 **Order Management**: Process orders, returns, and shipping
- 💰 **Pricing & Cost Tracking**: Manage selling prices and cost prices
- 📸 **Product Photos**: Store multiple photos per product
- 🔄 **Stock History**: Track all stock movements (in/out)
- 🚚 **Shipping Integration**: Scan and track shipments
- 💬 **Customer Chat**: Built-in chat system for customer support
- 🎨 **Themed UI**: Each store has its own color theme and branding

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and database

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd stock
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with your Supabase credentials:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   VITE_SUPABASE_URL="your-supabase-url"
   ```

4. Set up the database:
   See [MULTI_DATABASE_GUIDE.md](./MULTI_DATABASE_GUIDE.md) for detailed instructions on creating the required database tables.

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Build for production:
   ```bash
   npm run build
   ```

## 🗄️ Multi-Database Architecture

The application uses a multi-database architecture where each store has its own set of tables:

### MJM86 Store Tables
- `base_mjm` - Main inventory
- `barang_masuk_mjm` - Stock in transactions
- `barang_keluar_mjm` - Stock out transactions
- `orders_mjm` - Customer orders
- And 5 more supporting tables...

### BJW Store Tables
- `base_bjw` - Main inventory
- `barang_masuk_bjw` - Stock in transactions
- `barang_keluar_bjw` - Stock out transactions
- `orders_bjw` - Customer orders
- And 5 more supporting tables...

### How It Works

1. User selects a store (MJM86 or BJW) at the login screen
2. The application sets the database context for that store
3. All subsequent database queries automatically route to that store's tables
4. Data is completely isolated between stores - no cross-contamination

For detailed implementation details, see [MULTI_DATABASE_GUIDE.md](./MULTI_DATABASE_GUIDE.md).

## 🧪 Testing

### Manual Testing

Follow the comprehensive test plan in [test-database-routing.md](./test-database-routing.md) to validate:
- Store selection and login
- Database query routing
- Data isolation between stores
- Context persistence
- Order management per store

### Development Validation Tools

In development mode, open the browser console and use:

```javascript
// Check current store context
window.showCurrentStore();

// View all table name mappings
window.showTableNames();

// Run full validation
window.validateDatabaseRouting();
```

## 📚 Documentation

- **[MULTI_DATABASE_GUIDE.md](./MULTI_DATABASE_GUIDE.md)** - Complete implementation guide with database setup instructions
- **[test-database-routing.md](./test-database-routing.md)** - Comprehensive test plan with 7 test scenarios

## 🔧 Configuration

### Store Configuration

Store settings are configured in `types/store.ts`:

```typescript
export const STORE_CONFIGS = {
  mjm: {
    id: 'mjm',
    name: 'MJM86',
    theme: { primary: 'yellow-400', ... },
    adminPassword: 'mjm123',
  },
  bjw: {
    id: 'bjw',
    name: 'BJW',
    theme: { primary: 'red-500', ... },
    adminPassword: 'bjw123',
  },
};
```

**⚠️ Security Note**: In production, move passwords to environment variables or use a secure authentication service.

## 🏗️ Project Structure

```
stock/
├── components/          # React components
│   ├── auth/           # Login and store selection
│   ├── common/         # Reusable components
│   └── layout/         # Layout components
├── context/            # React contexts (StoreContext)
├── lib/                # Core utilities
│   ├── supabase.ts    # Supabase client
│   └── databaseConfig.ts  # Multi-database routing
├── services/           # API services
│   └── supabaseService.ts  # Database operations
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── App.tsx             # Main app component
```

## 🔐 Access Credentials

### Default Admin Passwords
- **MJM86 Store**: `mjm123`
- **BJW Store**: `bjw123`

### Guest Access
- Select "Pengunjung" (Guest) mode
- Enter any name to browse the catalog

## 🛠️ Development

### Adding New Features

When adding new database operations:

```typescript
// ❌ DON'T do this:
const { data } = await supabase.from('my_table').select('*');

// ✅ DO this:
const { data } = await supabase.from(getTableName('my_table')).select('*');
```

This ensures queries are routed to the correct store's table.

### Code Quality

The codebase follows these principles:
- ✅ TypeScript for type safety
- ✅ No hardcoded table names
- ✅ Dynamic database routing
- ✅ Development-only debugging utilities
- ✅ Comprehensive error handling

## 📈 Future Enhancements

Potential improvements:
- [ ] Separate Supabase projects per store for complete isolation
- [ ] Automatic table creation on store setup
- [ ] Data export/import between stores
- [ ] Cross-store analytics dashboard
- [ ] Audit logging for store switches
- [ ] Row-level security (RLS) policies

## 🤝 Contributing

1. Ensure all database operations use `getTableName()`
2. Test with both MJM and BJW stores
3. Verify data isolation
4. Run build to check for errors
5. Update documentation as needed

## 📝 License

This project is part of AI Studio applications.

View the app in AI Studio: https://ai.studio/apps/drive/1bB3yPh_hTscSGBrE3dgwP4l4RaVPL_pa

## 🆘 Support

For issues or questions:
1. Check [MULTI_DATABASE_GUIDE.md](./MULTI_DATABASE_GUIDE.md) troubleshooting section
2. Review [test-database-routing.md](./test-database-routing.md) for validation steps
3. Use browser console validation tools (development mode)

---

Built with ❤️ using React, TypeScript, Supabase, and Tailwind CSS

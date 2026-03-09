const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');

    // Users
    const adminHash = await bcrypt.hash('admin123', 10);
    const managerHash = await bcrypt.hash('manager123', 10);
    const staffHash = await bcrypt.hash('staff123', 10);

    await client.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
        ('Admin User', 'admin@warehouse.com', $1, 'admin'),
        ('Warehouse Manager', 'manager@warehouse.com', $2, 'manager'),
        ('Stock Staff', 'staff@warehouse.com', $3, 'staff')
      ON CONFLICT (email) DO NOTHING
    `, [adminHash, managerHash, staffHash]);

    // Kitchens (5 branches)
    await client.query(`
      INSERT INTO kitchens (name, location, manager_name) VALUES
        ('Kitchen A – Main Branch', 'Ground Floor, Building A', 'Aung Ko Ko'),
        ('Kitchen B – City Centre', '2nd Floor, City Mall', 'Mya Mya Thu'),
        ('Kitchen C – Airport Wing', 'Terminal 2, Level 1', 'Zaw Lin'),
        ('Kitchen D – North Campus', 'Block D, Staff Canteen', 'Thida Htwe'),
        ('Kitchen E – South Wing', 'South Extension, B1', 'Kyaw Min')
      ON CONFLICT DO NOTHING
    `);

    // Suppliers
    await client.query(`
      INSERT INTO suppliers (name, contact, phone, address) VALUES
        ('Fresh Farm Supplies', 'U Hla Myint', '+95 9 111 222 333', '12 Market St, Yangon'),
        ('Ocean Fresh Seafood', 'Daw Khin Mar', '+95 9 444 555 666', '5 Harbour Rd, Yangon'),
        ('Golden Grain Co.', 'U Tun Oo', '+95 9 777 888 999', '88 Industrial Zone, Mandalay'),
        ('Veg & More Ltd.', 'Daw Hnin Wai', '+95 9 321 654 987', '23 Farm Road, Bago'),
        ('Beverage World', 'Ko Phyo Wai', '+95 9 100 200 300', '45 Distribution Hub, Yangon')
      ON CONFLICT DO NOTHING
    `);

    // Items
    await client.query(`
      INSERT INTO items (name, category, unit, min_stock_level, supplier_id) VALUES
        ('Jasmine Rice', 'Grain', 'kg', 50, 3),
        ('Chicken Breast', 'Meat', 'kg', 20, 1),
        ('Cooking Oil (Palm)', 'Oil', 'litre', 30, 1),
        ('Onion', 'Vegetable', 'kg', 15, 4),
        ('Garlic', 'Vegetable', 'kg', 10, 4),
        ('Soy Sauce', 'Condiment', 'bottle', 20, 5),
        ('Fish Sauce', 'Condiment', 'bottle', 15, 2),
        ('Potato', 'Vegetable', 'kg', 20, 4),
        ('Tomato', 'Vegetable', 'kg', 10, 4),
        ('Shrimp (Medium)', 'Seafood', 'kg', 10, 2),
        ('Pork Belly', 'Meat', 'kg', 15, 1),
        ('Wheat Flour', 'Grain', 'kg', 25, 3),
        ('Sugar', 'Condiment', 'kg', 20, 3),
        ('Salt', 'Condiment', 'kg', 10, 3),
        ('Chilli Powder', 'Spice', 'kg', 5, 4),
        ('Mineral Water (500ml)', 'Beverage', 'bottle', 100, 5),
        ('Soft Drink (Can)', 'Beverage', 'can', 50, 5),
        ('Butter', 'Dairy', 'kg', 5, 1),
        ('Egg', 'Dairy', 'pcs', 100, 1),
        ('Ginger', 'Vegetable', 'kg', 5, 4)
      ON CONFLICT DO NOTHING
    `);

    // Sample stock_in records (last 14 days)
    const today = new Date();
    const daysAgo = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d.toISOString().split('T')[0];
    };

    await client.query(`
      INSERT INTO stock_in (item_id, supplier_id, quantity, unit_price, received_date, notes, created_by) VALUES
        (1, 3, 200, 1200, $1, 'Monthly rice supply', 1),
        (2, 1, 80, 8500, $1, 'Weekly chicken order', 1),
        (3, 1, 60, 2100, $2, 'Oil restock', 1),
        (4, 4, 50, 600, $2, '', 2),
        (5, 4, 30, 1200, $3, '', 2),
        (6, 5, 48, 1500, $3, '2 dozen bottles', 2),
        (7, 2, 36, 1800, $4, '', 1),
        (8, 4, 100, 400, $4, '', 1),
        (9, 4, 40, 500, $5, '', 2),
        (10, 2, 25, 15000, $5, 'Premium shrimp', 1),
        (11, 1, 60, 9000, $6, '', 1),
        (12, 3, 100, 900, $6, '', 2),
        (13, 3, 80, 800, $7, '', 2),
        (16, 5, 500, 200, $7, 'Week supply', 1),
        (19, 1, 600, 300, $8, '', 2),
        (18, 1, 20, 4500, $8, '', 1)
    `, [daysAgo(14), daysAgo(10), daysAgo(7), daysAgo(5), daysAgo(3), daysAgo(2), daysAgo(1), daysAgo(0)]);

    // Sample stock_out records
    await client.query(`
      INSERT INTO stock_out (item_id, kitchen_id, quantity, dispatch_date, notes, created_by) VALUES
        (1, 1, 30, $1, 'Weekly supply', 2),
        (1, 2, 25, $1, '', 2),
        (2, 1, 15, $2, 'Kitchen A request', 2),
        (2, 3, 10, $2, '', 2),
        (3, 1, 10, $3, '', 2),
        (3, 4, 8, $3, '', 2),
        (4, 2, 12, $4, '', 2),
        (5, 2, 8, $4, '', 2),
        (6, 3, 12, $5, '', 2),
        (7, 3, 10, $5, '', 2),
        (8, 4, 20, $6, '', 2),
        (9, 5, 10, $6, '', 2),
        (10, 1, 5, $7, '', 2),
        (11, 2, 10, $7, '', 2),
        (16, 1, 100, $8, '', 2),
        (19, 1, 120, $8, '', 2)
    `, [daysAgo(12), daysAgo(9), daysAgo(6), daysAgo(4), daysAgo(3), daysAgo(2), daysAgo(1), daysAgo(0)]);

    console.log('✅ Seeding complete!');
    console.log('📋 Demo accounts:');
    console.log('   admin@warehouse.com    / admin123   (Admin)');
    console.log('   manager@warehouse.com  / manager123 (Manager)');
    console.log('   staff@warehouse.com    / staff123   (Staff)');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

seed().catch(e => { console.error(e); process.exit(1); });

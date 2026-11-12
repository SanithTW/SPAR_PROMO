import express from 'express';
import cors from 'cors';

// Pre-defined realistic catalog items
const CATALOG: Array<{
  product_id: number;
  pro_code: string;
  product_description: string;
  department: string;
  sub_department: string;
  product_class: string;
  selling_price: string;
  list_cost: string;
  barcode: string;
  brand: string;
  uom: string;
}> = [
  {
    product_id: 3654,
    pro_code: '00003654',
    product_description: 'SPAR Choice Basmati Rice 5kg',
    department: 'Fresh / Food',
    sub_department: 'Grains & Rice',
    product_class: 'Rice',
    selling_price: '240.00',
    list_cost: '180.00',
    barcode: '6001000036541',
    brand: 'SPAR',
    uom: 'BAG',
  },
  {
    product_id: 14,
    pro_code: '00000014',
    product_description: 'RANCRIP CASSAVA CHIPS ORIGINAL 100G',
    department: 'Food',
    sub_department: 'Snacks & Confectionery',
    product_class: 'Chips',
    selling_price: '180.00',
    list_cost: '135.00',
    barcode: '4792000000142',
    brand: 'RANCRIP',
    uom: 'PK',
  },
  {
    product_id: 8,
    pro_code: '00000008',
    product_description: 'CAMPIONI PASTA LASAGNE PLAIN #96 250G',
    department: 'Food',
    sub_department: 'Pasta & Noodles',
    product_class: 'Pasta',
    selling_price: '320.00',
    list_cost: '240.00',
    barcode: '4792000000081',
    brand: 'CAMPIONI',
    uom: 'PK',
  },
  {
    product_id: 20,
    pro_code: '00000020',
    product_description: 'ANCHOR FRESH MILK BOTTLE 1L',
    department: 'Fresh',
    sub_department: 'Dairy & Milk',
    product_class: 'Milk',
    selling_price: '420.00',
    list_cost: '344.40',
    barcode: '4792000000203',
    brand: 'ANCHOR',
    uom: 'EA',
  },
  {
    product_id: 100245,
    pro_code: '100245',
    product_description: 'Fresh Milk 1L',
    department: 'Fresh',
    sub_department: 'Dairy',
    product_class: 'Chilled Milk',
    selling_price: '450.00',
    list_cost: '369.00',
    barcode: '4791002450017',
    brand: 'SPAR',
    uom: 'EA',
  },
  {
    product_id: 16348,
    pro_code: '00016348',
    product_description: 'SPAR Premium Pasta Spaghetti 500g',
    department: 'Food',
    sub_department: 'Pasta & Noodles',
    product_class: 'Pasta',
    selling_price: '155.00',
    list_cost: '116.25',
    barcode: '6001000163489',
    brand: 'SPAR',
    uom: 'PK',
  },
  {
    product_id: 1,
    pro_code: '00000001',
    product_description: 'SPAR Italian Penne Rigate Pasta 500g',
    department: 'Food',
    sub_department: 'Pasta & Noodles',
    product_class: 'Pasta',
    selling_price: '165.00',
    list_cost: '123.75',
    barcode: '6001000000016',
    brand: 'SPAR',
    uom: 'PK',
  },
];

function getOrGenerateProduct(code: string) {
  const clean = code.trim();
  const padded = clean.padStart(8, '0');
  const found = CATALOG.find(
    (c) => c.pro_code === clean || c.pro_code === padded || String(c.product_id) === clean
  );
  if (found) return found;

  // Dynamically generate realistic SPAR item if code is numeric
  if (/^\d{1,8}$/.test(clean)) {
    const num = parseInt(clean, 10);
    return {
      product_id: num,
      pro_code: padded,
      product_description: `SPAR Select Item #${padded}`,
      department: 'Food',
      sub_department: 'Packaged Grocery',
      product_class: 'General Food',
      selling_price: '250.00',
      list_cost: '187.50',
      barcode: `6001${padded}`,
      brand: 'SPAR',
      uom: 'EA',
    };
  }

  return null;
}

export function startMockServices() {
  // ----------------------------------------------------
  // 1. Mock Product Master API on Port 8001
  // ----------------------------------------------------
  const pmApp = express();
  pmApp.use(cors());
  pmApp.use(express.json());
  pmApp.use(express.urlencoded({ extended: true }));

  // Health
  pmApp.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'SPAR Product Master API', version: '2.0' });
  });

  // Auth token login
  pmApp.post('/auth/login', (req, res) => {
    res.json({
      access_token: 'mock-pm-token-authenticated-2026',
      token_type: 'bearer',
      expires_in: 3600,
    });
  });

  // Single product detail by code
  pmApp.get('/products/code/:code', (req, res) => {
    const prod = getOrGenerateProduct(req.params.code);
    if (!prod) {
      return res.status(404).json({ message: 'Product not found in Product Master' });
    }

    return res.json({
      product_id: prod.product_id,
      pro_code: prod.pro_code,
      product_description: prod.product_description,
      case_size: 1,
      uom_desc: prod.uom,
      uom_code: prod.uom,
      supplier_order_active: true,
      dep_code: 'FRESH',
      department: prod.department,
      sub_department: prod.sub_department,
      product_class: prod.product_class,
      brand: prod.brand,
      dc_order_status: 'ACTIVE',
      selling_price: prod.selling_price,
      list_cost: prod.list_cost,
      barcode: prod.barcode,
      vat_active: true,
      suppliers: [
        {
          supplier_id: 101,
          supplier_code: 'SUP-001',
          supplier_name: 'SPAR Retail Distributors',
        },
      ],
    });
  });

  // Search products
  pmApp.get('/products', (req, res) => {
    const q = (req.query.q as string || '').toLowerCase().trim();
    let matches = [...CATALOG];

    if (q) {
      matches = matches.filter(
        (c) =>
          c.product_description.toLowerCase().includes(q) ||
          c.pro_code.includes(q) ||
          c.pro_code.padStart(8, '0').includes(q) ||
          c.barcode.includes(q) ||
          c.product_class.toLowerCase().includes(q) ||
          c.sub_department.toLowerCase().includes(q)
      );

      // If search query is an exact numeric code not in catalog, include generated item
      if (/^\d{1,8}$/.test(q)) {
        const gen = getOrGenerateProduct(q);
        if (gen && !matches.some((m) => m.pro_code === gen.pro_code)) {
          matches.push(gen);
        }
      }
    }

    const items = matches.map((m) => ({
      product_id: m.product_id,
      pro_code: m.pro_code,
      product_description: m.product_description,
      case_size: 1,
      uom_desc: m.uom,
      supplier_order_active: true,
      dep_code: 'FRESH',
      department: m.department,
      sub_department: m.sub_department,
      product_class: m.product_class,
      brand: m.brand,
      dc_order_status: 'ACTIVE',
      selling_price: m.selling_price,
      barcode: m.barcode,
    }));

    return res.json({
      items,
      total: items.length,
      page: 1,
      size: items.length,
      pages: 1,
    });
  });

  // ----------------------------------------------------
  // 2. Mock POS Sales API on Port 8000
  // ----------------------------------------------------
  const salesApp = express();
  salesApp.use(cors());
  salesApp.use(express.json());
  salesApp.use(express.urlencoded({ extended: true }));

  // Health
  salesApp.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'SPAR POS Sales API', version: '2.0' });
  });

  // Auth token login
  salesApp.post('/auth/login', (req, res) => {
    res.json({
      access_token: 'mock-sales-token-authenticated-2026',
      token_type: 'bearer',
      expires_in: 3600,
    });
  });

  // Query sales lines
  salesApp.get('/sales', (req, res) => {
    const productCode = (req.query.product_code as string || '00003654').trim().padStart(8, '0');
    const prod = getOrGenerateProduct(productCode) || CATALOG[0];
    const unitPrice = parseFloat(prod.selling_price);

    // Realistic monthly transactions
    const months = ['2026-09', '2026-08', '2026-07', '2025-09'];
    const lines = [];
    let invoiceCounter = 88200;

    for (const m of months) {
      const txCount = 5;
      for (let i = 1; i <= txCount; i++) {
        const day = String(i * 5).padStart(2, '0');
        const qty = 15 + ((invoiceCounter % 7) * 4);
        const amount = qty * unitPrice;
        invoiceCounter++;
        lines.push({
          sales_line_id: invoiceCounter,
          invoice_id: invoiceCounter,
          invoice_number: `INV-2026-${invoiceCounter}`,
          invoice_date: `${m}-${day}`,
          location_id: 1,
          location_code: 'LOC-01',
          location_desc: 'SPAR Supermarket Colombo Fort',
          member_id: 501,
          member_code: 'MBR-501',
          product_id: prod.product_id,
          product_code: prod.pro_code,
          product_desc: prod.product_description,
          department: prod.department,
          qty: String(qty),
          selling_price: prod.selling_price,
          discount_percent: '0',
          discount_amount: '0',
          tax_rate: '15.0',
          unit_price_exc_vat: (unitPrice / 1.15).toFixed(2),
          total_amount_exc_vat: (amount / 1.15).toFixed(2),
          vat_amount: (amount - amount / 1.15).toFixed(2),
          amount: amount.toFixed(2),
        });
      }
    }

    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
    const sliced = lines.slice(offset, offset + limit);

    return res.json({
      items: sliced,
      total: lines.length,
      page: Math.floor(offset / limit) + 1,
      size: limit,
      pages: Math.ceil(lines.length / limit),
    });
  });

  // Start servers with error handling if port already in use
  const pmServer = pmApp.listen(8001, () => {
    console.log(`📦 Mock Product Master API online: http://localhost:8001`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`ℹ️ Port 8001 is already in use by an existing Product Master service.`);
    } else {
      console.warn(`Warning starting Product Master mock on 8001:`, err.message);
    }
  });

  const salesServer = salesApp.listen(8000, () => {
    console.log(`💳 Mock POS Sales API online:       http://localhost:8000`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`ℹ️ Port 8000 is already in use by an existing Sales service.`);
    } else {
      console.warn(`Warning starting Sales mock on 8000:`, err.message);
    }
  });

  return { pmServer, salesServer };
}

// ─── Dashboard Stats ─────────────────────────────────────────
export const MOCK_STATS = {
  total_products: 847,
  total_orders: 1243,
  total_revenue: 2847500,
  active_xml_sources: 3,
};

// ─── Recent Orders ───────────────────────────────────────────
export const MOCK_RECENT_ORDERS = [
  { id: 1, order_number: 'KS-2024-1001', customer_name: 'Ahmet Yilmaz', total: 4599, status: 'delivered', created_at: '2024-12-20T10:30:00Z' },
  { id: 2, order_number: 'KS-2024-1002', customer_name: 'Elif Demir', total: 8750, status: 'shipped', created_at: '2024-12-21T14:15:00Z' },
  { id: 3, order_number: 'KS-2024-1003', customer_name: 'Mehmet Kaya', total: 1899, status: 'processing', created_at: '2024-12-22T09:00:00Z' },
  { id: 4, order_number: 'KS-2024-1004', customer_name: 'Ayse Celik', total: 12340, status: 'pending', created_at: '2024-12-23T16:45:00Z' },
  { id: 5, order_number: 'KS-2024-1005', customer_name: 'Can Ozturk', total: 3150, status: 'cancelled', created_at: '2024-12-23T18:20:00Z' },
];

// ─── Admin Products ──────────────────────────────────────────
export const MOCK_ADMIN_PRODUCTS = [
  { id: 1, name: 'Naturehike Cloud Up 2 Kisilik Cadir', sku: 'NH-CU2', price: 4299, comparePrice: 5499, stockQuantity: 15, stockStatus: 'in_stock', isActive: true, isFeatured: true, isNew: false, mainImage: null, brandName: 'Naturehike', categoryName: 'Cadirlar' },
  { id: 2, name: 'Deuter Orbit -5° Uyku Tulumu', sku: 'DT-ORB5', price: 3150, comparePrice: null, stockQuantity: 22, stockStatus: 'in_stock', isActive: true, isFeatured: true, isNew: true, mainImage: null, brandName: 'Deuter', categoryName: 'Uyku Tulumlari' },
  { id: 3, name: 'Osprey Atmos AG 65L Sirt Cantasi', sku: 'OS-ATM65', price: 8750, comparePrice: 9900, stockQuantity: 8, stockStatus: 'in_stock', isActive: true, isFeatured: true, isNew: false, mainImage: null, brandName: 'Osprey', categoryName: 'Sirt Cantalari' },
  { id: 4, name: 'MSR PocketRocket 2 Kamp Ocagi', sku: 'MSR-PR2', price: 1899, comparePrice: null, stockQuantity: 30, stockStatus: 'in_stock', isActive: true, isFeatured: false, isNew: true, mainImage: null, brandName: 'MSR', categoryName: 'Kamp Ocaklari' },
  { id: 5, name: 'Petzl Actik Core Bas Feneri', sku: 'PZ-ACT', price: 1350, comparePrice: null, stockQuantity: 18, stockStatus: 'in_stock', isActive: true, isFeatured: true, isNew: true, mainImage: null, brandName: 'Petzl', categoryName: 'Aydinlatma' },
  { id: 6, name: 'Black Diamond Trail Trekking Baton', sku: 'BD-TRL', price: 2100, comparePrice: 2500, stockQuantity: 12, stockStatus: 'in_stock', isActive: true, isFeatured: false, isNew: false, mainImage: null, brandName: 'Black Diamond', categoryName: 'Trekking' },
  { id: 7, name: 'Helinox Chair One Kamp Sandalyesi', sku: 'HX-CH1', price: 3600, comparePrice: null, stockQuantity: 0, stockStatus: 'out_of_stock', isActive: false, isFeatured: true, isNew: false, mainImage: null, brandName: 'Helinox', categoryName: 'Kamp Mobilyasi' },
  { id: 8, name: 'Salomon X Ultra 4 GTX Outdoor Bot', sku: 'SL-XU4', price: 5490, comparePrice: 6200, stockQuantity: 6, stockStatus: 'in_stock', isActive: true, isFeatured: true, isNew: true, mainImage: null, brandName: 'Salomon', categoryName: 'Ayakkabi' },
];

// ─── Admin Brands ────────────────────────────────────────────
export const MOCK_ADMIN_BRANDS = [
  { id: 1, name: 'Naturehike', slug: 'naturehike', logoUrl: null, isActive: true, isFeatured: true },
  { id: 2, name: 'Deuter', slug: 'deuter', logoUrl: null, isActive: true, isFeatured: true },
  { id: 3, name: 'MSR', slug: 'msr', logoUrl: null, isActive: true, isFeatured: true },
  { id: 4, name: 'Petzl', slug: 'petzl', logoUrl: null, isActive: true, isFeatured: true },
  { id: 5, name: 'Black Diamond', slug: 'black-diamond', logoUrl: null, isActive: true, isFeatured: true },
  { id: 6, name: 'Osprey', slug: 'osprey', logoUrl: null, isActive: true, isFeatured: true },
  { id: 7, name: 'Sea to Summit', slug: 'sea-to-summit', logoUrl: null, isActive: true, isFeatured: false },
  { id: 8, name: 'Jetboil', slug: 'jetboil', logoUrl: null, isActive: true, isFeatured: false },
];

// ─── Admin Categories ────────────────────────────────────────
export const MOCK_ADMIN_CATEGORIES = [
  {
    id: 1, parentId: null, name: 'Cadirlar', slug: 'cadirlar', description: null, icon: null, imageUrl: null, bannerImageUrl: null, depth: 0, path: '1', isActive: true, sortOrder: 1, metaTitle: null, metaDescription: null, productCount: 45,
    children: [
      { id: 5, parentId: 1, name: 'Kamp Cadirlari', slug: 'kamp-cadirlari', description: null, icon: null, imageUrl: null, bannerImageUrl: null, depth: 1, path: '1/5', isActive: true, sortOrder: 1, metaTitle: null, metaDescription: null, productCount: 28 },
      { id: 6, parentId: 1, name: 'Trekking Cadirlari', slug: 'trekking-cadirlari', description: null, icon: null, imageUrl: null, bannerImageUrl: null, depth: 1, path: '1/6', isActive: true, sortOrder: 2, metaTitle: null, metaDescription: null, productCount: 17 },
    ],
  },
  {
    id: 2, parentId: null, name: 'Uyku Tulumlari', slug: 'uyku-tulumlari', description: null, icon: null, imageUrl: null, bannerImageUrl: null, depth: 0, path: '2', isActive: true, sortOrder: 2, metaTitle: null, metaDescription: null, productCount: 38,
    children: [
      { id: 7, parentId: 2, name: 'Yazlik', slug: 'yazlik-uyku-tulumu', description: null, icon: null, imageUrl: null, bannerImageUrl: null, depth: 1, path: '2/7', isActive: true, sortOrder: 1, metaTitle: null, metaDescription: null, productCount: 15 },
      { id: 8, parentId: 2, name: 'Kislik', slug: 'kislik-uyku-tulumu', description: null, icon: null, imageUrl: null, bannerImageUrl: null, depth: 1, path: '2/8', isActive: true, sortOrder: 2, metaTitle: null, metaDescription: null, productCount: 23 },
    ],
  },
  {
    id: 3, parentId: null, name: 'Sirt Cantalari', slug: 'sirt-cantalari', description: null, icon: null, imageUrl: null, bannerImageUrl: null, depth: 0, path: '3', isActive: true, sortOrder: 3, metaTitle: null, metaDescription: null, productCount: 52,
    children: [
      { id: 9, parentId: 3, name: 'Gunluk', slug: 'gunluk-sirt-cantasi', description: null, icon: null, imageUrl: null, bannerImageUrl: null, depth: 1, path: '3/9', isActive: true, sortOrder: 1, metaTitle: null, metaDescription: null, productCount: 20 },
      { id: 10, parentId: 3, name: 'Dagci', slug: 'dagci-sirt-cantasi', description: null, icon: null, imageUrl: null, bannerImageUrl: null, depth: 1, path: '3/10', isActive: true, sortOrder: 2, metaTitle: null, metaDescription: null, productCount: 32 },
    ],
  },
  {
    id: 4, parentId: null, name: 'Kamp Mutfagi', slug: 'kamp-mutfagi', description: null, icon: null, imageUrl: null, bannerImageUrl: null, depth: 0, path: '4', isActive: true, sortOrder: 4, metaTitle: null, metaDescription: null, productCount: 67,
    children: [],
  },
];

// ─── Admin Orders ────────────────────────────────────────────
export const MOCK_ADMIN_ORDERS = [
  { id: 1, orderNumber: 'KS-2024-1001', customerId: 1, status: 'delivered' as const, paymentStatus: 'paid' as const, paymentMethod: 'credit_card', subtotal: 4299, discount: 0, shippingCost: 0, total: 4299, shippingAddress: {}, billingAddress: {}, createdAt: '2024-12-20T10:30:00Z', customer: { id: 1, name: 'Ahmet Yilmaz', email: 'ahmet@example.com' } },
  { id: 2, orderNumber: 'KS-2024-1002', customerId: 2, status: 'shipped' as const, paymentStatus: 'paid' as const, paymentMethod: 'credit_card', subtotal: 8750, discount: 300, shippingCost: 0, total: 8450, shippingAddress: {}, billingAddress: {}, createdAt: '2024-12-21T14:15:00Z', customer: { id: 2, name: 'Elif Demir', email: 'elif@example.com' } },
  { id: 3, orderNumber: 'KS-2024-1003', customerId: 3, status: 'preparing' as const, paymentStatus: 'paid' as const, paymentMethod: 'bank_transfer', subtotal: 1899, discount: 0, shippingCost: 29.90, total: 1928.90, shippingAddress: {}, billingAddress: {}, createdAt: '2024-12-22T09:00:00Z', customer: { id: 3, name: 'Mehmet Kaya', email: 'mehmet@example.com' } },
  { id: 4, orderNumber: 'KS-2024-1004', customerId: 4, status: 'pending' as const, paymentStatus: 'pending' as const, paymentMethod: 'credit_card', subtotal: 12340, discount: 500, shippingCost: 0, total: 11840, shippingAddress: {}, billingAddress: {}, createdAt: '2024-12-23T16:45:00Z', customer: { id: 4, name: 'Ayse Celik', email: 'ayse@example.com' } },
  { id: 5, orderNumber: 'KS-2024-1005', customerId: 5, status: 'cancelled' as const, paymentStatus: 'refunded' as const, paymentMethod: 'credit_card', subtotal: 3150, discount: 0, shippingCost: 0, total: 3150, shippingAddress: {}, billingAddress: {}, createdAt: '2024-12-23T18:20:00Z', customer: { id: 5, name: 'Can Ozturk', email: 'can@example.com' } },
  { id: 6, orderNumber: 'KS-2024-1006', customerId: 6, status: 'confirmed' as const, paymentStatus: 'paid' as const, paymentMethod: 'credit_card', subtotal: 5490, discount: 0, shippingCost: 0, total: 5490, shippingAddress: {}, billingAddress: {}, createdAt: '2024-12-24T11:00:00Z', customer: { id: 6, name: 'Zeynep Arslan', email: 'zeynep@example.com' } },
];

// ─── Admin Banners ───────────────────────────────────────────
export const MOCK_ADMIN_BANNERS = [
  { id: 1, title: 'Yaz Kampanyasi', subtitle: 'Yeni Sezon', imageUrl: '/placeholder-banner.jpg', mobileImageUrl: null, linkUrl: '/tum-urunler', buttonText: 'Keşfet', titleColor: '#FFFFFF', subtitleColor: '#FFFFFF', buttonColor: '#FFFFFF', position: 'hero', sortOrder: 1 },
];

// ─── Admin Variant Types ─────────────────────────────────────
export const MOCK_ADMIN_VARIANT_TYPES = [
  { id: 1, name: 'Renk', displayType: 'color', optionsCount: 12 },
  { id: 2, name: 'Beden', displayType: 'button', optionsCount: 6 },
  { id: 3, name: 'Boyut', displayType: 'dropdown', optionsCount: 4 },
];

// ─── Admin XML Sources ───────────────────────────────────────
export const MOCK_ADMIN_XML_SOURCES = [
  { id: 1, name: 'Naturehike TR Feed', url: 'https://feed.naturehike.com.tr/products.xml', format: 'xml', isActive: true, autoSync: true, syncInterval: 360, lastSyncAt: '2024-12-23T06:00:00Z', totalProducts: 245, importedProducts: 238, errors: 7 },
  { id: 2, name: 'Deuter XML Catalog', url: 'https://api.deuter.com/catalog.xml', format: 'xml', isActive: true, autoSync: true, syncInterval: 720, lastSyncAt: '2024-12-22T12:00:00Z', totalProducts: 180, importedProducts: 180, errors: 0 },
  { id: 3, name: 'Outdoor Toptan Feed', url: 'https://outdoortoptan.com/feed/products', format: 'xml', isActive: false, autoSync: false, syncInterval: 1440, lastSyncAt: '2024-12-10T00:00:00Z', totalProducts: 422, importedProducts: 415, errors: 7 },
];

// ─── Admin Pages ─────────────────────────────────────────────
export const MOCK_ADMIN_PAGES = [
  { id: 1, title: 'Hakkimizda', slug: 'hakkimizda', content: '<p>Giyim Mağazası hakkinda bilgiler...</p>', metaTitle: 'Hakkimizda - Giyim Mağazası', metaDescription: 'Giyim Mağazası hakkinda bilgi edinin.', isActive: true },
  { id: 2, title: 'Iletisim', slug: 'iletisim', content: '<p>Iletisim bilgileri...</p>', metaTitle: 'Iletisim - Giyim Mağazası', metaDescription: 'Bizimle iletisime gecin.', isActive: true },
  { id: 3, title: 'Iade Politikasi', slug: 'iade-politikasi', content: '<p>Iade politikamiz...</p>', metaTitle: 'Iade Politikasi - Giyim Mağazası', metaDescription: 'Iade ve degisim kosullari.', isActive: true },
  { id: 4, title: 'Gizlilik Politikasi', slug: 'gizlilik-politikasi', content: '<p>Gizlilik politikamiz...</p>', metaTitle: 'Gizlilik Politikasi - Giyim Mağazası', metaDescription: 'Kisisel verilerin korunmasi.', isActive: true },
];

// ─── Marketplace Mock Data ───────────────────────────────────
export const MOCK_TRENDYOL_CREDENTIALS = {
  id: 1,
  marketplace: 'trendyol' as const,
  apiKey: 'ty-api-key-demo',
  sellerId: 'TY-123456',
  supplierId: 'SUP-789',
  baseUrl: 'https://api.trendyol.com',
  isActive: true,
};

export const MOCK_HEPSIBURADA_CREDENTIALS = {
  id: 2,
  marketplace: 'hepsiburada' as const,
  apiKey: 'hb-api-key-demo',
  sellerId: 'HB-654321',
  baseUrl: 'https://api.hepsiburada.com',
  isActive: false,
};

export const MOCK_MARKETPLACE_PRODUCTS = [
  { id: 1, productId: 1, marketplace: 'trendyol', marketplaceProductId: 'TY-P001', marketplaceBarcode: '8680001', status: 'on_sale' as const, price: 4299, salePrice: 4099, commissionRate: 12, lastSyncedAt: '2024-12-23T10:00:00Z', product: { name: 'Naturehike Cloud Up 2 Cadir', barcode: 'NH-CU2-001' } },
  { id: 2, productId: 2, marketplace: 'trendyol', marketplaceProductId: 'TY-P002', marketplaceBarcode: '8680002', status: 'approved' as const, price: 3150, salePrice: 3150, commissionRate: 10, lastSyncedAt: '2024-12-23T10:00:00Z', product: { name: 'Deuter Orbit -5° Uyku Tulumu', barcode: 'DT-ORB5-001' } },
  { id: 3, productId: 3, marketplace: 'trendyol', marketplaceProductId: undefined, marketplaceBarcode: undefined, status: 'pending' as const, price: 8750, salePrice: 8500, commissionRate: 15, lastSyncedAt: undefined, product: { name: 'Osprey Atmos AG 65L', barcode: 'OS-ATM65-001' } },
];


// ─── Pagination ───────────────────────────────────────────────
export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

// ─── Category ─────────────────────────────────────────────────
export interface Category {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  depth: number;
  path: string;
  isActive: boolean;
  isFeatured: boolean;
  homepageProductIds: number[];
  showcaseTitle: string | null;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  productCount: number;
  children?: Category[];
}

export interface FeaturedCategory extends Category {
  products: ProductListItem[];
}

export interface CategoryDetailResponse {
  data: {
    category: Category;
    children: Category[];
    ancestors: Category[];
    products: PaginatedResponse<ProductListItem>;
  };
}

// ─── Trust Badge ──────────────────────────────────────────────
export interface TrustBadge {
  id: number;
  icon: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

// ─── Brand ────────────────────────────────────────────────────
export interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
}

// ─── Banner ───────────────────────────────────────────────────
export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  buttonText: string | null;
  titleColor: string;
  subtitleColor: string;
  buttonColor: string;
  position: string;
  sortOrder: number;
}

// ─── Product Image ────────────────────────────────────────────
export interface ProductImage {
  id: number;
  imageUrl: string;
  sortOrder: number;
  isMain: boolean;
  altText: string | null;
}

// ─── Variant ──────────────────────────────────────────────────
export interface VariantValue {
  id: number;
  optionValue: string;
  colorCode: string | null;
  typeName: string;
  displayType: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string | null;
  barcode: string | null;
  price: number;
  comparePrice: number | null;
  costPrice: number | null;
  stockQuantity: number;
  weight: number | null;
  isActive: boolean;
  sortOrder: number;
  variantValues: VariantValue[];
  images: ProductImage[];
}

// ─── Product Attribute ────────────────────────────────────────
export interface ProductAttribute {
  id: number;
  name: string;
  value: string;
}

// ─── Product (List) ───────────────────────────────────────────
export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  stockQuantity: number;
  stockStatus: string;
  isActive: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isNew: boolean;
  mainImage: string | null;
  brandName: string | null;
  categoryName: string | null;
}

// ─── Product (Detail) ─────────────────────────────────────────
export interface Product {
  id: number;
  sku: string | null;
  barcode: string | null;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  comparePrice: number | null;
  costPrice: number | null;
  currency: string;
  stockQuantity: number;
  stockStatus: string;
  weight: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  brandId: number | null;
  categoryId: number | null;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
  brand: Brand | null;
  category: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
  attributes: ProductAttribute[];
  reviewStats?: ReviewStats;
}

// ─── Cart ─────────────────────────────────────────────────────
export interface CartItemVariantInfo {
  type: string;
  value: string;
}

export interface ServerCartItem {
  id: string;
  productId: number;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
  variantId: number | null;
  variantInfo: CartItemVariantInfo[];
}

export interface ServerCartResponse {
  data: {
    items: ServerCartItem[];
    total: number;
    itemCount: number;
  };
}

// ─── Customer ────────────────────────────────────────────────
export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  ordersCount?: number;
  totalSpent?: number;
  orders?: CustomerOrder[];
  addresses?: CustomerAddress[];
  reviews?: CustomerReview[];
}

export interface CustomerOrder {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  itemsCount: number;
}

export interface CustomerAddress {
  id: number;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string | null;
  addressLine: string;
  postalCode: string | null;
  isDefault: boolean;
}

export interface CustomerReview {
  id: number;
  rating: number;
  title: string | null;
  comment: string;
  isApproved: boolean;
  createdAt: string;
  product: { id: number; name: string; slug: string } | null;
}

// ─── Address ─────────────────────────────────────────────────
export interface Address {
  id: number;
  customer_id: number;
  title: string;
  full_name: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string | null;
  address_line: string;
  postal_code: string | null;
  is_default: boolean;
}

// ─── Order ───────────────────────────────────────────────────
export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  paymentReceiptUrl?: string | null;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  shippingAddress: Record<string, string>;
  billingAddress: Record<string, string>;
  notes?: string;
  createdAt: string;
  items?: OrderItem[];
  customer?: Customer;
}

// ─── OrderItem ───────────────────────────────────────────────
export interface OrderItem {
  id: number;
  productId: number;
  productVariantId?: number;
  productName: string;
  productSlug?: string;
  imageUrl?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variantInfo?: { type: string; value: string }[] | Record<string, string>;
}

// ─── Refund Request ─────────────────────────────────────────
export interface RefundRequest {
  id: number;
  order_id: number;
  customer_id: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  description: string | null;
  images: string[] | null;
  refund_amount: number;
  admin_note: string | null;
  paytr_reference: string | null;
  created_at: string;
  updated_at: string;
  order?: Order;
  customer?: Customer;
}

// ─── Review ──────────────────────────────────────────────────
export interface Review {
  id: number;
  productId: number;
  customerId: number;
  orderId: number | null;
  rating: number;
  title: string | null;
  comment: string;
  isApproved: boolean;
  createdAt: string;
  customer?: {
    id: number;
    name: string;
  };
}

export interface ReviewStats {
  average: number;
  count: number;
}

// ─── Settings ─────────────────────────────────────────────────
export interface Setting {
  [key: string]: string;
}

export interface SiteSettings {
  general?: Record<string, string>;
  social?: Record<string, string>;
  shipping?: Record<string, string>;
  seo?: Record<string, string>;
  homepage?: Record<string, string>;
  payment?: Record<string, string>;
}

// ─── Blog Post ───────────────────────────────────────────────
export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string;
  featuredImage: string | null;
  author: string;
  publishedAt: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

// ─── Page ─────────────────────────────────────────────────────
export interface Page {
  id: number;
  title: string;
  slug: string;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
}

// ─── Homepage Sections ──────────────────────────────────────
export type HomepageSectionType =
  | 'hero_banner'
  | 'product_grid'
  | 'category_showcase'
  | 'banner_group'
  | 'text_block'
  | 'advantage_bar'
  | 'brand_carousel'
  | 'trust_badges'
  | 'newsletter'
  | 'featured_categories'
  | 'category_vitrin'
  | 'all_products';

export interface HomepageSection {
  id: number;
  type: HomepageSectionType;
  title: string | null;
  subtitle: string | null;
  sortOrder: number;
  data: Record<string, unknown>;
}

export interface HomepageSectionAdmin {
  id: number;
  type: HomepageSectionType;
  title: string | null;
  subtitle: string | null;
  config: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Marketplace ─────────────────────────────────────────────
export interface MarketplaceCredential {
  id: number;
  marketplace: 'trendyol' | 'hepsiburada' | 'ciceksepeti';
  apiKey: string;
  sellerId?: string;
  supplierId?: string;
  baseUrl?: string;
  userAgent?: string;
  isActive: boolean;
}

export interface MarketplaceProduct {
  id: number;
  productId: number;
  marketplace: string;
  marketplaceProductId?: string;
  marketplaceBarcode?: string;
  status: 'pending' | 'approved' | 'rejected' | 'on_sale';
  price: number;
  salePrice: number;
  commissionRate?: number;
  listingData?: Record<string, unknown>;
  errorMessage?: string;
  lastSyncedAt?: string;
  product?: { name: string; barcode: string; images?: string[] };
}

export interface MarketplaceCategory {
  id: number;
  marketplace: string;
  marketplaceCategoryId: number;
  categoryName: string;
  parentId?: number;
  attributes?: Record<string, unknown>;
  children?: MarketplaceCategory[];
  lastSyncedAt?: string;
}

export interface MarketplaceCategoryMapping {
  id: number;
  localCategoryId: number;
  marketplaceCategoryId: number;
  marketplace: string;
  category?: { id: number; name: string };
  marketplaceCategory?: { id: number; categoryName: string; marketplaceCategoryId: number };
}

export interface MarketplaceBrandMapping {
  id: number;
  localBrandId: number;
  marketplace: string;
  marketplaceBrandId: number;
  marketplaceBrandName: string;
  brand?: { id: number; name: string };
}

// ─── Trendyol Product Variants ──────────────────────────────
export interface TrendyolProductVariant {
  id: number;
  barcode: string | null;
  sku: string | null;
  price: number;
  stockQuantity: number;
  values: Array<{
    typeName: string;
    value: string;
  }>;
}

// ─── Trendyol Wizard ────────────────────────────────────────
export interface TrendyolAttributeValue {
  id: number;
  name: string;
}

export interface TrendyolCategoryAttribute {
  attribute?: { id: number; name: string };
  id?: number;
  name?: string;
  required?: boolean;
  allowCustom?: boolean;
  slicer?: boolean;
  varianter?: boolean;
  attributeValues?: TrendyolAttributeValue[];
  autoMatched: boolean;
  autoMatchSource: string | null;
  existingValue: string | null;
}

export interface PrepareSendProduct {
  id: number;
  name: string;
  barcode: string | null;
  mainImage: string | null;
  stockQuantity: number;
  existingAttributes: { attribute_name: string; attribute_value: string }[];
  variantTypes: string[];
}

export interface PrepareSendCategoryGroup {
  localCategoryId: number;
  localCategoryName: string;
  marketplaceCategoryId: number | null;
  marketplaceCategoryName: string | null;
  productIds: number[];
  products: PrepareSendProduct[];
  categoryAttributes: TrendyolCategoryAttribute[];
}

export interface PrepareSendResponse {
  categoryGroups: PrepareSendCategoryGroup[];
  zeroStockProductIds: number[];
}

// ─── Hepsiburada Wizard ─────────────────────────────────────
export interface HBCategoryAttribute {
  id: string;
  name: string;
  mandatory: boolean;
  multiValue: boolean;
  type: 'enum' | 'text' | 'numeric';
  values?: Array<{ id: string; name: string }>;
  _group?: 'baseAttributes' | 'attributes' | 'variantAttributes';
  autoMatched?: boolean;
  autoMatchSource?: string | null;
  required?: boolean;
}

export interface HBPrepareSendCategoryGroup {
  localCategoryId: number;
  localCategoryName: string;
  marketplaceCategoryId: number | null;
  marketplaceCategoryName: string | null;
  productIds: number[];
  products: PrepareSendProduct[];
  categoryAttributes: HBCategoryAttribute[];
}

export interface HBPrepareSendResponse {
  categoryGroups: HBPrepareSendCategoryGroup[];
  zeroStockProductIds: number[];
}

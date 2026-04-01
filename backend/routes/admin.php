<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\BannerController;
use App\Http\Controllers\Admin\BrandController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\PageController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ProductVariantController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\VariantTypeController;
use App\Http\Controllers\Admin\XmlSourceController;
use App\Http\Controllers\Admin\XmlMappingController;
use App\Http\Controllers\Admin\MarketplaceCredentialController;
use App\Http\Controllers\Admin\XmlBulkOperationController;
use App\Http\Controllers\Admin\RefundController;
use App\Http\Controllers\Admin\ReviewController;
use App\Http\Controllers\Admin\TrendyolController;
use App\Http\Controllers\Admin\HepsiburadaController;
use App\Http\Controllers\Admin\CiceksepetiController;
use App\Http\Controllers\Admin\HomepageSectionController;
use App\Http\Controllers\Admin\TrustBadgeController;
use App\Http\Controllers\Admin\UploadController;
use App\Http\Controllers\Admin\XmlUpdateController;
use App\Http\Controllers\Admin\BulkProductController;
use Illuminate\Support\Facades\Route;

// Auth (no middleware - login endpoint)
Route::withoutMiddleware('auth:sanctum')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
});

// Authenticated admin routes
Route::post('/auth/logout', [AuthController::class, 'logout']);
Route::get('/auth/me', [AuthController::class, 'me']);

// Dashboard
Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

// Reviews
Route::get('/reviews', [ReviewController::class, 'index']);
Route::patch('/reviews/{review}/approve', [ReviewController::class, 'approve']);
Route::patch('/reviews/{review}/reject', [ReviewController::class, 'reject']);
Route::delete('/reviews/{review}', [ReviewController::class, 'destroy']);

// Orders
Route::get('/orders', [OrderController::class, 'index']);
Route::get('/orders/{order}', [OrderController::class, 'show']);
Route::put('/orders/{order}/status', [OrderController::class, 'updateStatus']);
Route::put('/orders/{order}/approve-payment', [OrderController::class, 'approvePayment']);

// Refunds
Route::get('/refunds', [RefundController::class, 'index']);
Route::get('/refunds/{refundRequest}', [RefundController::class, 'show']);
Route::put('/refunds/{refundRequest}/approve', [RefundController::class, 'approve']);
Route::put('/refunds/{refundRequest}/reject', [RefundController::class, 'reject']);

// Categories
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/tree', [CategoryController::class, 'index']);
Route::post('/categories', [CategoryController::class, 'store']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);
Route::put('/categories/{id}', [CategoryController::class, 'update']);
Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
Route::put('/categories/reorder', [CategoryController::class, 'reorder']);
Route::post('/categories/merge', [CategoryController::class, 'merge']);
Route::post('/categories/merge-preview', [CategoryController::class, 'mergePreview']);

// Brands
Route::apiResource('brands', BrandController::class);

// Products
Route::post('/products/bulk-price', [ProductController::class, 'bulkPrice']);
Route::apiResource('products', ProductController::class);

// Product Variants
Route::get('/products/{productId}/variants', [ProductVariantController::class, 'index']);
Route::post('/products/{productId}/variants', [ProductVariantController::class, 'store']);
Route::post('/products/{productId}/variants/generate', [ProductVariantController::class, 'generate']);
Route::put('/products/{productId}/variants/bulk-update', [ProductVariantController::class, 'bulkUpdate']);
Route::put('/products/{productId}/variants/{variantId}', [ProductVariantController::class, 'update']);
Route::delete('/products/{productId}/variants/{variantId}', [ProductVariantController::class, 'destroy']);

// Bulk Product Operations
Route::prefix('bulk-products')->group(function () {
    Route::get('/', [BulkProductController::class, 'index']);
    Route::post('/barcode-suffix', [BulkProductController::class, 'barcodeSuffix']);
    Route::post('/barcode-prefix', [BulkProductController::class, 'barcodePrefix']);
    Route::post('/sku-suffix', [BulkProductController::class, 'skuSuffix']);
    Route::post('/sku-prefix', [BulkProductController::class, 'skuPrefix']);
    Route::post('/name-modify', [BulkProductController::class, 'nameModify']);
    Route::post('/preview', [BulkProductController::class, 'preview']);
});

// Variant Types & Options
Route::apiResource('variant-types', VariantTypeController::class);
Route::post('/variant-types/{variantTypeId}/options', [VariantTypeController::class, 'storeOption']);
Route::put('/variant-types/{variantTypeId}/options/{optionId}', [VariantTypeController::class, 'updateOption']);
Route::delete('/variant-types/{variantTypeId}/options/{optionId}', [VariantTypeController::class, 'destroyOption']);

// File Upload
Route::post('/upload/image', [UploadController::class, 'image']);

// Banners
Route::apiResource('banners', BannerController::class);

// Trust Badges
Route::apiResource('trust-badges', TrustBadgeController::class);

// Homepage Sections
Route::apiResource('homepage-sections', HomepageSectionController::class);
Route::put('/homepage-sections-reorder', [HomepageSectionController::class, 'reorder']);

// Pages
Route::apiResource('pages', PageController::class);

// XML Updates
Route::get('/xml-updates', [XmlUpdateController::class, 'index']);

// XML Sources
Route::apiResource('xml-sources', XmlSourceController::class);
Route::post('/xml-sources/{id}/upload', [XmlSourceController::class, 'uploadFile']);
Route::post('/xml-sources/{id}/import', [XmlSourceController::class, 'import']);
Route::post('/xml-sources/{id}/preview/prepare', [XmlSourceController::class, 'preparePreview']);
Route::get('/xml-sources/{id}/preview', [XmlSourceController::class, 'preview']);
Route::get('/xml-sources/{id}/import-progress', [XmlSourceController::class, 'importProgress']);
Route::get('/xml-sources/{id}/logs', [XmlSourceController::class, 'logs']);
Route::put('/xml-sources/{id}/mapping', [XmlSourceController::class, 'updateMapping']);
Route::post('/xml-sources/{id}/detect-fields', [XmlSourceController::class, 'detectFields']);

// XML Category Mappings
Route::get('/xml-sources/{sourceId}/category-mappings', [XmlMappingController::class, 'categoryMappings']);
Route::post('/xml-sources/{sourceId}/category-mappings', [XmlMappingController::class, 'storeCategoryMapping']);
Route::post('/xml-sources/{sourceId}/category-mappings/batch', [XmlMappingController::class, 'batchCategoryMappings']);
Route::delete('/xml-sources/{sourceId}/category-mappings/{mappingId}', [XmlMappingController::class, 'destroyCategoryMapping']);

// XML Brand Mappings
Route::get('/xml-sources/{sourceId}/brand-mappings', [XmlMappingController::class, 'brandMappings']);
Route::post('/xml-sources/{sourceId}/brand-mappings', [XmlMappingController::class, 'storeBrandMapping']);
Route::post('/xml-sources/{sourceId}/brand-mappings/batch', [XmlMappingController::class, 'batchBrandMappings']);
Route::delete('/xml-sources/{sourceId}/brand-mappings/{mappingId}', [XmlMappingController::class, 'destroyBrandMapping']);

// XML Price Rules
Route::get('/xml-sources/{sourceId}/price-rules', [XmlMappingController::class, 'priceRules']);
Route::post('/xml-sources/{sourceId}/price-rules', [XmlMappingController::class, 'storePriceRule']);
Route::put('/xml-sources/{sourceId}/price-rules/{ruleId}', [XmlMappingController::class, 'updatePriceRule']);
Route::delete('/xml-sources/{sourceId}/price-rules/{ruleId}', [XmlMappingController::class, 'destroyPriceRule']);
Route::get('/xml-sources/{sourceId}/price-preview', [XmlMappingController::class, 'previewPrices']);

// XML Barcode Settings
Route::put('/xml-sources/{sourceId}/barcode-settings', [XmlMappingController::class, 'updateBarcodeSettings']);

// XML Products Tracking & Bulk Operations
Route::get('/xml-sources/{sourceId}/xml-products', [XmlBulkOperationController::class, 'xmlProducts']);
Route::get('/xml-sources/{sourceId}/xml-products/comparison', [XmlBulkOperationController::class, 'comparison']);
Route::post('/xml-sources/{sourceId}/bulk/barcode-suffix', [XmlBulkOperationController::class, 'barcodeSuffix']);
Route::post('/xml-sources/{sourceId}/bulk/sku-suffix', [XmlBulkOperationController::class, 'skuSuffix']);
Route::post('/xml-sources/{sourceId}/bulk/name-modify', [XmlBulkOperationController::class, 'nameModify']);
Route::post('/xml-sources/{sourceId}/bulk/price-adjust', [XmlBulkOperationController::class, 'priceAdjust']);
Route::post('/xml-sources/{sourceId}/bulk/preview', [XmlBulkOperationController::class, 'preview']);
Route::get('/xml-sources/{sourceId}/bulk/history', [XmlBulkOperationController::class, 'history']);
Route::post('/xml-sources/{sourceId}/bulk/{logId}/revert', [XmlBulkOperationController::class, 'revert']);

// Settings
Route::get('/settings', [SettingController::class, 'index']);
Route::put('/settings', [SettingController::class, 'update']);

// Marketplace Credentials
Route::get('/marketplace/{marketplace}/credentials', [MarketplaceCredentialController::class, 'index']);
Route::post('/marketplace/{marketplace}/credentials', [MarketplaceCredentialController::class, 'store']);
Route::put('/marketplace/{marketplace}/credentials', [MarketplaceCredentialController::class, 'update']);
Route::post('/marketplace/{marketplace}/test-connection', [MarketplaceCredentialController::class, 'testConnection']);

// Trendyol
Route::prefix('trendyol')->group(function () {
    Route::get('/settings', [TrendyolController::class, 'getSettings']);
    Route::put('/settings', [TrendyolController::class, 'updateSettings']);
    Route::post('/reset-statuses', [TrendyolController::class, 'resetStatuses']);
    Route::post('/sync-categories', [TrendyolController::class, 'syncCategories']);
    Route::get('/categories', [TrendyolController::class, 'categories']);
    Route::get('/categories/search-picker', [TrendyolController::class, 'searchCategoriesForPicker']);
    Route::get('/categories/{categoryId}/attributes', [TrendyolController::class, 'categoryAttributes']);
    Route::get('/category-mappings', [TrendyolController::class, 'categoryMappings']);
    Route::get('/category-mappings-with-path', [TrendyolController::class, 'categoryMappingsWithPath']);
    Route::put('/category-mappings', [TrendyolController::class, 'updateCategoryMapping']);
    Route::get('/auto-match-categories', [TrendyolController::class, 'autoMatchCategories']);
    Route::post('/batch-category-mappings', [TrendyolController::class, 'batchSaveCategoryMappings']);
    Route::post('/sync-brands', [TrendyolController::class, 'syncBrands']);
    Route::get('/brands', [TrendyolController::class, 'brands']);
    Route::get('/brands/search', [TrendyolController::class, 'searchBrand']);
    Route::put('/brand-mappings', [TrendyolController::class, 'updateBrandMapping']);
    Route::get('/auto-match-brands', [TrendyolController::class, 'autoMatchBrands']);
    Route::post('/batch-brand-mappings', [TrendyolController::class, 'batchSaveBrandMappings']);
    Route::post('/bulk-map-all-brands', [TrendyolController::class, 'bulkMapAllBrands']);
    Route::post('/sync-cargo-companies', [TrendyolController::class, 'syncCargoCompanies']);
    Route::get('/cargo-companies', [TrendyolController::class, 'cargoCompanies']);
    Route::put('/cargo-companies/default', [TrendyolController::class, 'setDefaultCargoCompany']);
    Route::get('/local-products', [TrendyolController::class, 'localProducts']);
    Route::get('/local-product-ids', [TrendyolController::class, 'localProductIds']);
    Route::get('/products', [TrendyolController::class, 'products']);
    Route::post('/products/prepare-send', [TrendyolController::class, 'prepareSend']);
    Route::post('/products/save-attributes', [TrendyolController::class, 'saveProductAttributes']);
    Route::post('/products/save-category-attributes', [TrendyolController::class, 'saveCategoryAttributes']);
    Route::post('/products/send', [TrendyolController::class, 'sendProducts']);
    Route::get('/products/send-progress/{batchId}', [TrendyolController::class, 'sendProgress']);
    Route::put('/products/update', [TrendyolController::class, 'updateProducts']);
    Route::post('/products/price-stock', [TrendyolController::class, 'updatePriceStock']);
    Route::post('/products/bulk-price-preview', [TrendyolController::class, 'bulkPricePreview']);
    Route::get('/batch/{batchRequestId}', [TrendyolController::class, 'batchStatus']);
    Route::get('/trendyol-products', [TrendyolController::class, 'trendyolProducts']);
    Route::post('/import-products', [TrendyolController::class, 'importProducts']);
    Route::post('/stock-sync', [TrendyolController::class, 'syncStock']);
    Route::get('/stock-sync-results', [TrendyolController::class, 'stockSyncResults']);
    Route::post('/stock-batch/{batchRequestId}/check', [TrendyolController::class, 'checkStockBatch']);
    Route::get('/batch-results', [TrendyolController::class, 'batchResults']);
    Route::post('/batch/{batchRequestId}/check', [TrendyolController::class, 'checkBatchFromTrendyol']);
});

// Customers
Route::apiResource('customers', CustomerController::class)->only(['index', 'show', 'update']);

// Blog Posts
Route::apiResource('blog-posts', \App\Http\Controllers\Admin\BlogPostController::class);

// Hepsiburada
Route::prefix('hepsiburada')->group(function () {
    Route::get('/settings', [HepsiburadaController::class, 'getSettings']);
    Route::put('/settings', [HepsiburadaController::class, 'updateSettings']);
    Route::post('/sync-categories', [HepsiburadaController::class, 'syncCategories']);
    Route::get('/categories', [HepsiburadaController::class, 'categories']);
    Route::get('/categories/{categoryId}/attributes', [HepsiburadaController::class, 'categoryAttributes']);
    Route::get('/categories/{categoryId}/attributes/{attributeId}/values', [HepsiburadaController::class, 'attributeValues']);
    Route::get('/categories/search-picker', [HepsiburadaController::class, 'searchCategoriesForPicker']);
    Route::get('/category-mappings', [HepsiburadaController::class, 'categoryMappings']);
    Route::get('/category-mappings-with-path', [HepsiburadaController::class, 'categoryMappingsWithPath']);
    Route::put('/category-mappings', [HepsiburadaController::class, 'updateCategoryMapping']);
    Route::post('/batch-category-mappings', [HepsiburadaController::class, 'batchSaveCategoryMappings']);
    Route::get('/auto-match-categories', [HepsiburadaController::class, 'autoMatchCategories']);
    Route::get('/local-products', [HepsiburadaController::class, 'localProducts']);
    Route::get('/local-product-ids', [HepsiburadaController::class, 'localProductIds']);
    Route::get('/products', [HepsiburadaController::class, 'products']);
    Route::post('/products/prepare-send', [HepsiburadaController::class, 'prepareSend']);
    Route::post('/products/save-attributes', [HepsiburadaController::class, 'saveProductAttributes']);
    Route::post('/products/save-category-attributes', [HepsiburadaController::class, 'saveCategoryAttributes']);
    Route::post('/products/bulk-price-preview', [HepsiburadaController::class, 'bulkPricePreview']);
    Route::post('/products/send', [HepsiburadaController::class, 'sendProducts']);
    Route::get('/products/send-progress/{batchId}', [HepsiburadaController::class, 'sendProgress']);
    Route::post('/products/price-stock', [HepsiburadaController::class, 'updatePriceStock']);
    Route::get('/products/status/{trackingId}', [HepsiburadaController::class, 'productStatus']);
    Route::get('/batch-results', [HepsiburadaController::class, 'batchResults']);
    Route::post('/batch/{trackingId}/check', [HepsiburadaController::class, 'checkBatchFromHB']);
    Route::get('/listings', [HepsiburadaController::class, 'listings']);
    Route::post('/stock-sync', [HepsiburadaController::class, 'syncStock']);
    Route::get('/stock-sync-results', [HepsiburadaController::class, 'stockSyncResults']);
});

// Çiçeksepeti
Route::prefix('ciceksepeti')->group(function () {
    Route::get('/settings', [CiceksepetiController::class, 'getSettings']);
    Route::put('/settings', [CiceksepetiController::class, 'updateSettings']);
    Route::post('/reset-statuses', [CiceksepetiController::class, 'resetStatuses']);
    Route::post('/sync-categories', [CiceksepetiController::class, 'syncCategories']);
    Route::get('/categories', [CiceksepetiController::class, 'categories']);
    Route::get('/categories/{categoryId}/attributes', [CiceksepetiController::class, 'categoryAttributes']);
    Route::get('/categories/search-picker', [CiceksepetiController::class, 'searchCategoriesForPicker']);
    Route::get('/category-mappings', [CiceksepetiController::class, 'categoryMappings']);
    Route::get('/category-mappings-with-path', [CiceksepetiController::class, 'categoryMappingsWithPath']);
    Route::put('/category-mappings', [CiceksepetiController::class, 'updateCategoryMapping']);
    Route::post('/batch-category-mappings', [CiceksepetiController::class, 'batchSaveCategoryMappings']);
    Route::get('/auto-match-categories', [CiceksepetiController::class, 'autoMatchCategories']);
    Route::get('/local-products', [CiceksepetiController::class, 'localProducts']);
    Route::get('/local-product-ids', [CiceksepetiController::class, 'localProductIds']);
    Route::get('/products', [CiceksepetiController::class, 'products']);
    Route::post('/products/prepare-send', [CiceksepetiController::class, 'prepareSend']);
    Route::post('/products/save-attributes', [CiceksepetiController::class, 'saveProductAttributes']);
    Route::post('/products/save-category-attributes', [CiceksepetiController::class, 'saveCategoryAttributes']);
    Route::post('/products/bulk-price-preview', [CiceksepetiController::class, 'bulkPricePreview']);
    Route::post('/products/send', [CiceksepetiController::class, 'sendProducts']);
    Route::get('/products/send-progress/{batchId}', [CiceksepetiController::class, 'sendProgress']);
    Route::post('/products/price-stock', [CiceksepetiController::class, 'updatePriceStock']);
    Route::get('/batch/{batchId}', [CiceksepetiController::class, 'batchStatus']);
    Route::get('/batch-results', [CiceksepetiController::class, 'batchResults']);
    Route::post('/batch/{batchId}/check', [CiceksepetiController::class, 'checkBatchFromCS']);
    Route::post('/stock-sync', [CiceksepetiController::class, 'syncStock']);
    Route::get('/stock-sync-results', [CiceksepetiController::class, 'stockSyncResults']);
});

<?php

use App\Http\Controllers\DeployWebhookController;
use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\TrustBadgeController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerAddressController;
use App\Http\Controllers\Api\CustomerAuthController;
use App\Http\Controllers\Api\CustomerOrderController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\PayTRController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\RefundController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\HomepageSectionController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Middleware\AuthenticateCustomer;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok', 'timestamp' => now()->toIso8601String()]));

// Deploy Webhook
Route::post('/deploy/webhook', [DeployWebhookController::class, 'handle'])
    ->withoutMiddleware('throttle:api');

// Categories
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/featured', [CategoryController::class, 'featured']);
Route::get('/categories/{slug}', [CategoryController::class, 'show']);
Route::get('/categories/{slug}/children', [CategoryController::class, 'children']);

// Products
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);

// Reviews (public - read)
Route::get('/products/{slug}/reviews', [ReviewController::class, 'index']);

// Brands
Route::get('/brands', [BrandController::class, 'index']);

// Banners
Route::get('/banners', [BannerController::class, 'index']);

// Trust Badges
Route::get('/trust-badges', [TrustBadgeController::class, 'index']);

// Settings
Route::get('/settings', [SettingController::class, 'index']);

// Pages
Route::get('/pages/{slug}', [PageController::class, 'show']);

// Homepage Sections
Route::get('/homepage/sections', [HomepageSectionController::class, 'index']);
Route::get('/homepage/random-products', [HomepageSectionController::class, 'randomProducts']);

// Search
Route::get('/search', [SearchController::class, 'search']);

// Cart
Route::get('/cart', [CartController::class, 'index']);
Route::post('/cart', [CartController::class, 'store']);
Route::put('/cart/{id}', [CartController::class, 'update']);
Route::delete('/cart/{id}', [CartController::class, 'destroy']);

// PayTR (public)
Route::post('/paytr/callback', [PayTRController::class, 'callback'])
    ->withoutMiddleware('throttle:api');
Route::get('/paytr/installments', [PayTRController::class, 'installmentRates']);

// Blog
Route::get('/blog', [\App\Http\Controllers\Api\BlogPostController::class, 'index']);
Route::get('/blog/{slug}', [\App\Http\Controllers\Api\BlogPostController::class, 'show']);

// Customer Auth (public)
Route::post('/auth/register', [CustomerAuthController::class, 'register']);
Route::post('/auth/login', [CustomerAuthController::class, 'login']);

// Customer Protected Routes
Route::middleware(AuthenticateCustomer::class)->prefix('customer')->group(function () {
    Route::post('/auth/logout', [CustomerAuthController::class, 'logout']);
    Route::get('/auth/me', [CustomerAuthController::class, 'me']);
    Route::put('/auth/profile', [CustomerAuthController::class, 'updateProfile']);
    Route::apiResource('addresses', CustomerAddressController::class);
    Route::get('/orders', [CustomerOrderController::class, 'index']);
    Route::post('/orders', [CustomerOrderController::class, 'store']);
    Route::get('/orders/{order}', [CustomerOrderController::class, 'show']);
    Route::post('/orders/{order}/receipt', [CustomerOrderController::class, 'uploadReceipt']);
    Route::post('/orders/{order}/pay', [PayTRController::class, 'processPayment']);
    Route::post('/paytr/bin-lookup', [PayTRController::class, 'binLookup']);
    Route::get('/paytr/installments', [PayTRController::class, 'installmentRates']);
    Route::get('/paytr/cards', [PayTRController::class, 'listCards']);
    Route::post('/paytr/cards/delete', [PayTRController::class, 'deleteCard']);
    Route::post('/products/{slug}/reviews', [ReviewController::class, 'store']);

    // Refunds & Cancellation
    Route::post('/orders/{order}/cancel', [RefundController::class, 'cancel']);
    Route::post('/orders/{order}/refund', [RefundController::class, 'store']);
    Route::get('/refund-requests', [RefundController::class, 'index']);

    // Favorites
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites', [FavoriteController::class, 'store']);
    Route::delete('/favorites/{productId}', [FavoriteController::class, 'destroy']);
    Route::get('/favorites/check', [FavoriteController::class, 'check']);
});

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\XmlSource;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $recentOrders = Order::with(['customer', 'items.product'])
            ->latest()
            ->take(10)
            ->get();

        return response()->json([
            'data' => [
                'totalProducts' => Product::count(),
                'activeProducts' => Product::where('is_active', true)->count(),
                'inStockProducts' => Product::where('stock_status', 'in_stock')->count(),
                'outOfStockProducts' => Product::where('stock_status', 'out_of_stock')->count(),
                'featuredProducts' => Product::where('is_featured', true)->count(),
                'totalOrders' => Order::count(),
                'pendingOrders' => Order::where('status', 'pending')->count(),
                'totalRevenue' => (float) Order::where('payment_status', 'paid')->sum('total'),
                'totalBrands' => Brand::count(),
                'totalCategories' => Category::count(),
                'totalCustomers' => Customer::count(),
                'activeXmlSources' => XmlSource::where('is_active', true)->count(),
                'recentOrders' => OrderResource::collection($recentOrders),
            ],
        ]);
    }
}

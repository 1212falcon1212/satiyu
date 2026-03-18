<?php

namespace App\Services;

use App\Http\Resources\BrandResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductListResource;
use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageSection;
use App\Models\Product;
use App\Models\TrustBadge;

class HomepageSectionService
{
    public function getActiveSections(): array
    {
        $sections = HomepageSection::active()->get();

        return $sections->map(fn (HomepageSection $section) => [
            'id' => $section->id,
            'type' => $section->type,
            'title' => $section->title,
            'subtitle' => $section->subtitle,
            'sortOrder' => $section->sort_order,
            'data' => $this->resolveData($section),
        ])->all();
    }

    public function resolveData(HomepageSection $section): array
    {
        return match ($section->type) {
            'hero_banner' => $this->resolveHeroBanner($section),
            'product_grid' => $this->resolveProductGrid($section),
            'category_showcase' => $this->resolveCategoryShowcase($section),
            'banner_group' => $this->resolveBannerGroup($section),
            'text_block' => $this->resolveTextBlock($section),
            'advantage_bar' => $this->resolveAdvantageBar($section),
            'brand_carousel' => $this->resolveBrandCarousel($section),
            'trust_badges' => $this->resolveTrustBadges($section),
            'newsletter' => $this->resolveNewsletter($section),
            'featured_categories' => $this->resolveFeaturedCategories($section),
            'category_vitrin' => $this->resolveCategoryVitrin($section),
            default => [],
        };
    }

    private function resolveHeroBanner(HomepageSection $section): array
    {
        $config = $section->config ?? [];
        $position = $config['position'] ?? 'hero';

        $banners = Banner::active()
            ->inDateRange()
            ->position($position)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Banner $b) => [
                'id' => $b->id,
                'title' => $b->title,
                'subtitle' => $b->subtitle,
                'imageUrl' => $b->image_url,
                'mobileImageUrl' => $b->mobile_image_url,
                'linkUrl' => $b->link_url,
                'buttonText' => $b->button_text,
                'titleColor' => $b->title_color ?? '#FFFFFF',
                'subtitleColor' => $b->subtitle_color ?? '#FFFFFF',
                'buttonColor' => $b->button_color ?? '#FFFFFF',
                'position' => $b->position,
                'sortOrder' => $b->sort_order,
            ])->all();

        $categories = Category::where('is_active', true)
            ->whereNull('parent_id')
            ->with(['children' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->orderBy('sort_order')
            ->get();

        return [
            'banners' => $banners,
            'categories' => CategoryResource::collection($categories)->resolve(),
        ];
    }

    private function resolveProductGrid(HomepageSection $section): array
    {
        $config = $section->config ?? [];
        $source = $config['source'] ?? 'featured';
        $limit = $config['limit'] ?? 10;
        $columns = $config['columns'] ?? 5;
        $href = $config['href'] ?? null;
        $mode = $config['mode'] ?? 'grid';

        $query = Product::where('is_active', true)
            ->with(['images', 'brand', 'category', 'reviews']);

        switch ($source) {
            case 'manual':
                $ids = $config['product_ids'] ?? [];
                if (empty($ids)) return ['products' => [], 'columns' => $columns, 'href' => $href, 'mode' => $mode];
                $query->whereIn('id', $ids);
                break;
            case 'category':
                $categoryId = $config['category_id'] ?? null;
                if (!$categoryId) return ['products' => [], 'columns' => $columns, 'href' => $href, 'mode' => $mode];
                $childIds = Category::where('parent_id', $categoryId)->pluck('id')->push($categoryId);
                $query->whereIn('category_id', $childIds);
                break;
            case 'bestseller':
                $query->where('is_bestseller', true);
                break;
            case 'discounted':
                $query->whereNotNull('compare_price')
                    ->whereColumn('compare_price', '>', 'price');
                break;
            case 'new':
                $query->where('is_new', true)->orderByDesc('created_at');
                break;
            case 'featured':
            default:
                $query->where('show_on_homepage', true);
                break;
        }

        $products = $query->limit($limit)->get();

        return [
            'products' => ProductListResource::collection($products)->resolve(),
            'columns' => $columns,
            'href' => $href,
            'mode' => $mode,
        ];
    }

    private function resolveCategoryShowcase(HomepageSection $section): array
    {
        $config = $section->config ?? [];
        $categoryId = $config['category_id'] ?? null;

        if (!$categoryId) return ['category' => null, 'children' => [], 'bannerImage' => null];

        $category = Category::with(['children' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->find($categoryId);

        if (!$category) return ['category' => null, 'children' => [], 'bannerImage' => null];

        return [
            'category' => CategoryResource::make($category)->resolve(),
            'children' => CategoryResource::collection($category->children)->resolve(),
            'bannerImage' => $config['banner_image'] ?? $category->banner_image_url,
        ];
    }

    private function resolveBannerGroup(HomepageSection $section): array
    {
        $config = $section->config ?? [];
        $position = $config['position'] ?? null;
        $bannerIds = $config['banner_ids'] ?? [];
        $layout = $config['layout'] ?? 'triple';

        $query = Banner::active()->inDateRange()->orderBy('sort_order');

        if (!empty($bannerIds)) {
            $query->whereIn('id', $bannerIds);
        } elseif ($position) {
            $query->position($position);
        }

        $banners = $query->get()->map(fn (Banner $b) => [
            'id' => $b->id,
            'title' => $b->title,
            'subtitle' => $b->subtitle,
            'imageUrl' => $b->image_url,
            'mobileImageUrl' => $b->mobile_image_url,
            'linkUrl' => $b->link_url,
            'buttonText' => $b->button_text,
            'position' => $b->position,
            'sortOrder' => $b->sort_order,
        ])->all();

        return [
            'banners' => $banners,
            'layout' => $layout,
        ];
    }

    private function resolveTextBlock(HomepageSection $section): array
    {
        $config = $section->config ?? [];

        return [
            'content' => $config['content'] ?? '',
            'expandable' => $config['expandable'] ?? false,
        ];
    }

    private function resolveAdvantageBar(HomepageSection $section): array
    {
        $config = $section->config ?? [];

        return [
            'items' => $config['items'] ?? null,
        ];
    }

    private function resolveBrandCarousel(HomepageSection $section): array
    {
        $brands = Brand::where('is_active', true)
            ->orderBy('name')
            ->get();

        return [
            'brands' => BrandResource::collection($brands)->resolve(),
        ];
    }

    private function resolveTrustBadges(HomepageSection $section): array
    {
        $badges = TrustBadge::active()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (TrustBadge $b) => [
                'id' => $b->id,
                'icon' => $b->icon,
                'title' => $b->title,
                'description' => $b->description,
                'sortOrder' => $b->sort_order,
                'isActive' => $b->is_active,
            ])->all();

        return [
            'badges' => $badges,
        ];
    }

    private function resolveNewsletter(HomepageSection $section): array
    {
        $config = $section->config ?? [];

        return [
            'title' => $config['title'] ?? null,
            'subtitle' => $config['subtitle'] ?? null,
        ];
    }

    private function resolveFeaturedCategories(HomepageSection $section): array
    {
        $categories = Category::where('is_featured', true)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return [
            'categories' => CategoryResource::collection($categories)->resolve(),
        ];
    }

    private function resolveCategoryVitrin(HomepageSection $section): array
    {
        $categories = Category::where('is_active', true)
            ->whereNotNull('homepage_product_ids')
            ->whereJsonLength('homepage_product_ids', '>', 0)
            ->orderBy('sort_order')
            ->get();

        $result = [];

        foreach ($categories as $category) {
            $productIds = $category->homepage_product_ids ?? [];
            if (empty($productIds)) continue;

            $products = Product::whereIn('id', $productIds)
                ->where('is_active', true)
                ->with(['images', 'brand', 'category', 'reviews'])
                ->get()
                ->sortBy(fn ($p) => array_search($p->id, $productIds));

            $result[] = [
                'category' => CategoryResource::make($category)->resolve(),
                'products' => ProductListResource::collection($products)->resolve(),
            ];
        }

        return [
            'sections' => $result,
        ];
    }
}

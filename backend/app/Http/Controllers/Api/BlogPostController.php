<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;

class BlogPostController extends Controller
{
    public function index(): JsonResponse
    {
        $posts = BlogPost::published()
            ->orderByDesc('published_at')
            ->paginate(request()->input('per_page', 12));

        return response()->json([
            'data' => $posts->getCollection()->map(fn (BlogPost $p) => [
                'id' => $p->id,
                'title' => $p->title,
                'slug' => $p->slug,
                'excerpt' => $p->excerpt,
                'featuredImage' => $p->featured_image,
                'author' => $p->author,
                'publishedAt' => $p->published_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $post = BlogPost::published()->where('slug', $slug)->firstOrFail();

        return response()->json([
            'data' => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'excerpt' => $post->excerpt,
                'content' => $post->content,
                'featuredImage' => $post->featured_image,
                'author' => $post->author,
                'publishedAt' => $post->published_at?->toIso8601String(),
                'metaTitle' => $post->meta_title,
                'metaDescription' => $post->meta_description,
            ],
        ]);
    }
}

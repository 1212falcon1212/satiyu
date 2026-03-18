<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class BlogPostController extends Controller
{
    public function index(): JsonResponse
    {
        $posts = BlogPost::orderByDesc('created_at')->get();
        return response()->json([
            'data' => $posts->map(fn (BlogPost $p) => $this->transform($p)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:blog_posts,slug'],
            'excerpt' => ['nullable', 'string'],
            'content' => ['nullable', 'string'],
            'featured_image' => ['nullable', 'string', 'max:500'],
            'author' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'published_at' => ['nullable', 'date'],
        ]);

        $post = BlogPost::create($validated);

        return response()->json([
            'data' => $this->transform($post),
        ], Response::HTTP_CREATED);
    }

    public function show(int $id): JsonResponse
    {
        $post = BlogPost::findOrFail($id);
        return response()->json([
            'data' => $this->transform($post),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $post = BlogPost::findOrFail($id);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('blog_posts', 'slug')->ignore($id)],
            'excerpt' => ['nullable', 'string'],
            'content' => ['nullable', 'string'],
            'featured_image' => ['nullable', 'string', 'max:500'],
            'author' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'published_at' => ['nullable', 'date'],
        ]);

        $post->update($validated);

        return response()->json([
            'data' => $this->transform($post->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        BlogPost::findOrFail($id)->delete();
        return response()->json(['data' => ['message' => 'Blog post deleted.']]);
    }

    private function transform(BlogPost $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'slug' => $post->slug,
            'excerpt' => $post->excerpt,
            'content' => $post->content,
            'featuredImage' => $post->featured_image,
            'author' => $post->author,
            'isActive' => $post->is_active,
            'metaTitle' => $post->meta_title,
            'metaDescription' => $post->meta_description,
            'publishedAt' => $post->published_at?->toIso8601String(),
            'createdAt' => $post->created_at?->toIso8601String(),
            'updatedAt' => $post->updated_at?->toIso8601String(),
        ];
    }
}

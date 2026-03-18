<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePageRequest;
use App\Models\Page;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class PageController extends Controller
{
    public function index(): JsonResponse
    {
        $pages = Page::orderBy('title')->get();

        return response()->json([
            'data' => $pages->map(fn (Page $page) => $this->transformPage($page)),
        ]);
    }

    public function store(StorePageRequest $request): JsonResponse
    {
        $page = Page::create($request->validated());

        return response()->json([
            'data' => $this->transformPage($page),
        ], Response::HTTP_CREATED);
    }

    public function show(int $id): JsonResponse
    {
        $page = Page::findOrFail($id);

        return response()->json([
            'data' => $this->transformPage($page),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $page = Page::findOrFail($id);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('pages', 'slug')->ignore($id)],
            'content' => ['sometimes', 'string'],
            'is_active' => ['boolean'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
        ]);

        $page->update($validated);

        return response()->json([
            'data' => $this->transformPage($page->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $page = Page::findOrFail($id);
        $page->delete();

        return response()->json([
            'data' => [
                'message' => 'Page deleted successfully.',
            ],
        ]);
    }

    private function transformPage(Page $page): array
    {
        return [
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'content' => $page->content,
            'isActive' => $page->is_active,
            'metaTitle' => $page->meta_title,
            'metaDescription' => $page->meta_description,
            'createdAt' => $page->created_at?->toIso8601String(),
            'updatedAt' => $page->updated_at?->toIso8601String(),
        ];
    }
}

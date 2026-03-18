<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    public function image(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,gif,webp,svg', 'max:5120'],
            'folder' => ['nullable', 'string', 'max:50'],
        ]);

        $folder = $request->input('folder', 'uploads');
        $path = $request->file('image')->store($folder, 'public');

        return response()->json([
            'url' => '/storage/' . $path,
        ]);
    }
}

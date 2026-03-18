<?php

namespace App\Services;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Collection;

class BrandService
{
    public function all(): Collection
    {
        return Brand::orderBy('name')->get();
    }

    public function getById(int $id): Brand
    {
        return Brand::findOrFail($id);
    }

    public function getBySlug(string $slug): Brand
    {
        return Brand::where('slug', $slug)->firstOrFail();
    }

    public function store(array $data): Brand
    {
        return Brand::create($data);
    }

    public function update(Brand $brand, array $data): Brand
    {
        $brand->update($data);
        return $brand->fresh();
    }

    public function delete(Brand $brand): void
    {
        $brand->delete();
    }
}

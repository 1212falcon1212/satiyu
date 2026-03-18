<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Collection;

class SettingService
{
    public function get(string $key, mixed $default = null): mixed
    {
        $setting = Setting::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public function set(string $key, mixed $value, string $group = 'general', string $type = 'text'): Setting
    {
        return Setting::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'group' => $group,
                'type' => $type,
            ],
        );
    }

    public function getGroup(string $group): Collection
    {
        return Setting::where('group', $group)
            ->get()
            ->pluck('value', 'key');
    }

    public function getAll(): Collection
    {
        return Setting::all()
            ->groupBy('group')
            ->map(fn ($items) => $items->pluck('value', 'key'));
    }
}

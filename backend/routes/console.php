<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('xml:stock-sync')->dailyAt('02:00')->withoutOverlapping(30);
Schedule::command('marketplace:stock-sync')->everyFiveMinutes()->withoutOverlapping(10);

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\XmlUpdateLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class XmlUpdateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = XmlUpdateLog::query()
            ->orderBy('created_at', 'desc');

        if ($request->filled('source_id')) {
            $query->where('xml_source_id', $request->input('source_id'));
        }

        if ($request->filled('change_type')) {
            $query->where('change_type', $request->input('change_type'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('search')) {
            $query->where('product_name', 'LIKE', '%' . $request->input('search') . '%');
        }

        $logs = $query->paginate(25);

        return response()->json($logs);
    }
}

<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DeployWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $secret = config('app.deploy_webhook_secret');

        if (!$secret) {
            return response()->json(['message' => 'Webhook not configured.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        // Verify GitHub signature
        $signature = $request->header('X-Hub-Signature-256');
        if (!$signature) {
            return response()->json(['message' => 'Missing signature.'], Response::HTTP_FORBIDDEN);
        }

        $payload = $request->getContent();
        $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expected, $signature)) {
            return response()->json(['message' => 'Invalid signature.'], Response::HTTP_FORBIDDEN);
        }

        // Only process push events to main branch
        $event = $request->header('X-GitHub-Event');
        if ($event !== 'push') {
            return response()->json(['message' => 'Ignored event.']);
        }

        $ref = $request->input('ref');
        if ($ref !== 'refs/heads/main') {
            return response()->json(['message' => 'Ignored branch.']);
        }

        // Run deploy script asynchronously
        $deployScript = base_path('../deploy.sh');
        $logFile = storage_path('logs/deploy.log');
        exec("bash {$deployScript} >> {$logFile} 2>&1 &");

        return response()->json(['message' => 'Deploy triggered.']);
    }
}

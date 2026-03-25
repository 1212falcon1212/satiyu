<?php

$secret = getenv('DEPLOY_WEBHOOK_SECRET') ?: 'satiyu-deploy-2026';
$logFile = '/tmp/deploy.log';

// Verify GitHub signature
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expected, $signature)) {
    http_response_code(403);
    exit('Invalid signature');
}

// Only deploy on push to main
$data = json_decode($payload, true);
if (($data['ref'] ?? '') !== 'refs/heads/main') {
    exit('Not main branch, skipping');
}

// Trigger deploy in background
file_put_contents($logFile, date('Y-m-d H:i:s') . " Deploy triggered\n", FILE_APPEND);
exec('nohup sudo bash /opt/deploy-satiyu.sh >> ' . $logFile . ' 2>&1 &');

echo 'Deploy started';

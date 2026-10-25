<?php

declare(strict_types=1);

// Router for PHP's built-in server: serves the app, the PDFs of one Mac folder,
// and the Let's Encrypt root certificate the iPad 2 needs.

$root = dirname(__DIR__);
$pdfDir = getenv('PDF_DIR') ?: '';
$path = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

/** @return list<array{name: string, size: int}> */
function listPdfs(string $dir): array
{
    $items = [];
    foreach (glob($dir.'/*.{pdf,PDF}', GLOB_BRACE) ?: [] as $file) {
        $items[] = ['name' => basename($file), 'size' => (int) filesize($file)];
    }
    usort($items, static fn (array $a, array $b): int => strnatcasecmp($a['name'], $b['name']));

    return $items;
}

function send(string $file, string $type): void
{
    header('Content-Type: '.$type);
    header('Content-Length: '.filesize($file));
    header('Cache-Control: no-cache');
    readfile($file);
}

if ('/pdfs.json' === $path) {
    if ('' === $pdfDir || !is_dir($pdfDir)) {
        http_response_code(404);

        return true;
    }
    header('Content-Type: application/json');
    header('Cache-Control: no-cache');
    echo json_encode(listPdfs($pdfDir), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    return true;
}

if (str_starts_with($path, '/pdfs/')) {
    $file = $pdfDir.'/'.basename(substr($path, 6));
    if ('' === $pdfDir || !is_file($file) || 0 !== strcasecmp(pathinfo($file, PATHINFO_EXTENSION), 'pdf')) {
        http_response_code(404);

        return true;
    }
    send($file, 'application/pdf');

    return true;
}

if ('/isrgrootx1.der' === $path) {
    send($root.'/certs/isrgrootx1.der', 'application/x-x509-ca-cert');

    return true;
}

if ('/app.appcache' === $path) {
    send($root.'/app.appcache', 'text/cache-manifest');

    return true;
}

return false;

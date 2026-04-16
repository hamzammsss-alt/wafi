$enc1256 = [System.Text.Encoding]::GetEncoding(1256)
$utf8 = [System.Text.Encoding]::UTF8
$files = Get-ChildItem -Path .\pages -Recurse -Include *.tsx,*.ts -File
$changed = 0

foreach ($f in $files) {
    $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    if ($text -notmatch '[\u0637\u0638]') { continue }

    $new = [regex]::Replace($text, '[\u0600-\u06FF][\u0600-\u06FF\s\p{P}\d]*', {
        param($m)
        $v = $m.Value
        if ($v -notmatch '[\u0637\u0638]') { return $v }

        try {
            $bytes = $enc1256.GetBytes($v)
            $decoded = $utf8.GetString($bytes)
            if ($decoded -match '[\u0600-\u06FF]' -and $decoded -notmatch '[\u0637\u0638][\u0627\u0644]') {
                return $decoded
            }
            return $v
        } catch {
            return $v
        }
    })

    if ($new -ne $text) {
        [System.IO.File]::WriteAllText($f.FullName, $new, [System.Text.Encoding]::UTF8)
        $changed++
    }
}

Write-Output "fixed_files=$changed"

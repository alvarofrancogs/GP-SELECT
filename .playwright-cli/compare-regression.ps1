Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
public static class ScreenshotPixels {
    public static int[] Compare(byte[] before, byte[] after, int width) {
        int count = 0, minX = width, minY = int.MaxValue, maxX = -1, maxY = -1;
        for (int i = 0; i < before.Length; i += 4) {
            if (before[i] == after[i] && before[i+1] == after[i+1] && before[i+2] == after[i+2] && before[i+3] == after[i+3]) continue;
            int x = (i / 4) % width, y = (i / 4) / width;
            count++;
            minX = System.Math.Min(minX, x); maxX = System.Math.Max(maxX, x);
            minY = System.Math.Min(minY, y); maxY = System.Math.Max(maxY, y);
        }
        return new int[] { count, minX, minY, maxX, maxY };
    }
}
'@

function Read-Pixels([string]$Path) {
    $bitmap = [System.Drawing.Bitmap]::new($Path)
    try {
        $rectangle = [System.Drawing.Rectangle]::new(0, 0, $bitmap.Width, $bitmap.Height)
        $bits = $bitmap.LockBits($rectangle, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $bytes = [byte[]]::new([Math]::Abs($bits.Stride) * $bitmap.Height)
            [System.Runtime.InteropServices.Marshal]::Copy($bits.Scan0, $bytes, 0, $bytes.Length)
            return @{ Pixels = $bytes; Width = $bitmap.Width; Height = $bitmap.Height }
        } finally { $bitmap.UnlockBits($bits) }
    } finally { $bitmap.Dispose() }
}

$results = foreach ($file in Get-ChildItem 'frontend/docs/qa-phase3/before/*.png') {
    $before = Read-Pixels $file.FullName
    $afterPath = Join-Path (Get-Location) "frontend/docs/qa-phase3/after/$($file.Name)"
    $after = Read-Pixels $afterPath
    if ($before.Width -ne $after.Width -or $before.Height -ne $after.Height) { throw "Dimensions differ: $($file.Name)" }
    $difference = [ScreenshotPixels]::Compare($before.Pixels, $after.Pixels, $before.Width)
    [pscustomobject]@{ Image = $file.Name; ChangedPixels = $difference[0]; Bounds = $difference[1..4] }
}
$results | ConvertTo-Json -Depth 3

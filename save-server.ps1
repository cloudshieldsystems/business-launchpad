# One-shot helper: POST /save?name=<whitelisted> with a base64 body writes binary to docs\icons\,
# or POST /save (no name) writes text body to build\app.compiled.js
param([int]$Port = 5174)

$root = $PSScriptRoot
$buildDir = Join-Path $root 'build'
$iconDir = Join-Path $root 'docs\icons'
foreach ($d in @($buildDir, $iconDir)) { if (-not (Test-Path $d)) { New-Item -ItemType Directory $d | Out-Null } }

$allowed = @('icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png')

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Save endpoint on http://localhost:$Port/save"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $ctx.Response.Headers.Add('Access-Control-Allow-Origin', '*')
  if ($ctx.Request.HttpMethod -eq 'POST' -and $ctx.Request.Url.LocalPath -eq '/save') {
    $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream, [System.Text.Encoding]::UTF8)
    $body = $reader.ReadToEnd()
    $name = $ctx.Request.QueryString['name']
    if ($name -and $allowed -contains $name) {
      $bytes = [Convert]::FromBase64String($body)
      [System.IO.File]::WriteAllBytes((Join-Path $iconDir $name), $bytes)
      $out = "saved $name " + $bytes.Length + " bytes"
    } elseif (-not $name) {
      [System.IO.File]::WriteAllText((Join-Path $buildDir 'app.compiled.js'), $body, (New-Object System.Text.UTF8Encoding($false)))
      $out = 'saved app.compiled.js ' + $body.Length
    } else {
      $ctx.Response.StatusCode = 400
      $out = 'name not allowed'
    }
    $msg = [System.Text.Encoding]::UTF8.GetBytes($out)
    $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}

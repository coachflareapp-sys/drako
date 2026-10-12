$ErrorActionPreference = 'Stop'
$ErrorActionPreference = 'Continue'
$keyOutput = & supabase projects api-keys --project-ref xbhjqejqbqovwamztdcn --output json 2>$null
$ErrorActionPreference = 'Stop'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo obtener acceso al proyecto.' }
$projectKeys = ($keyOutput -join "`n") | ConvertFrom-Json
$serviceEntry = $projectKeys | Where-Object { $_.name -eq 'service_role' } | Select-Object -First 1
$publicEntry = $projectKeys | Where-Object { $_.name -eq 'anon' } | Select-Object -First 1
if (-not $serviceEntry -or -not $publicEntry) { throw 'Claves no disponibles.' }
$headers = @{ apikey=$serviceEntry.api_key; Authorization=('Bearer '+$serviceEntry.api_key) }
$baseUrl = 'https://xbhjqejqbqovwamztdcn.supabase.co'
$existing = Invoke-RestMethod -Uri "$baseUrl/auth/v1/admin/users?page=1&per_page=100" -Headers $headers
$accounts = @('cegarve@hotmail.com','drakotransportapp@gmail.com','aitrezsg@gmail.com')
foreach ($email in $accounts) {
 if ($existing.users | Where-Object { $_.email -eq $email }) { Write-Output "Cuenta conservada: $email"; continue }
 $randomBytes = New-Object byte[] 48
 $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
 try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
 $randomPassword = [Convert]::ToBase64String($randomBytes) + 'aA1!'
 $payload = @{email=$email;password=$randomPassword;email_confirm=$true} | ConvertTo-Json
 $created = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/v1/admin/users" -Headers $headers -ContentType 'application/json' -Body $payload
 if (-not $created.id) { throw 'No se pudo verificar la creación de la cuenta.' }
 Write-Output "Cuenta preparada: $email (contraseña aleatoria; establecer acceso mediante recuperación)"
 $randomPassword=$null; $payload=$null
}
$publicConfig = @{url=$baseUrl;anonKey=$publicEntry.api_key} | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot '..\config.js'),"export const supabaseConfig = $publicConfig;`n",[System.Text.UTF8Encoding]::new($false))
Write-Output 'Configuración pública de la aplicación generada. Ninguna clave administrativa se ha guardado.'
$profiles = Invoke-RestMethod -Uri "$baseUrl/rest/v1/profiles?select=full_name,role,notify_trips" -Headers $headers
$profiles | Select-Object full_name,role,notify_trips

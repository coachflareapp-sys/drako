$ErrorActionPreference='Continue'
$keyOutput=& supabase projects api-keys --project-ref xbhjqejqbqovwamztdcn --output json 2>$null
$ErrorActionPreference='Stop'
if($LASTEXITCODE -ne 0){throw 'No se pudo obtener acceso.'}
$keys=($keyOutput -join "`n")|ConvertFrom-Json
$secret=($keys|Where-Object name -eq 'service_role'|Select-Object -First 1).api_key
$headers=@{apikey=$secret;Authorization=('Bearer '+$secret)}
$html='<!doctype html><html lang="es"><meta charset="utf-8"><title>Accesos privados DRAKO</title><body style="font-family:system-ui;max-width:800px;margin:40px auto;padding:20px"><h1>Establecer contraseñas de DRAKO</h1><p>Enlaces privados de un solo uso. No compartir públicamente. Si vencen, ejecutar nuevamente scripts/create-test-access.ps1.</p><ul>'
foreach($email in @('cegarve@hotmail.com','drakotransportapp@gmail.com','aitrezsg@gmail.com')){
 $result=Invoke-RestMethod -Method Post -Uri 'https://xbhjqejqbqovwamztdcn.supabase.co/auth/v1/admin/generate_link' -Headers $headers -ContentType 'application/json' -Body (@{type='recovery';email=$email}|ConvertTo-Json)
 $hash=$result.hashed_token;if(-not $hash){$hash=$result.properties.hashed_token}
 if(-not $hash){throw 'No se pudo generar enlace de acceso.'}
 $url='https://drakotransport.app/#activar='+[uri]::EscapeDataString($hash)
 $html+='<li style="margin:20px 0"><a href="'+$url+'" target="_blank" rel="noreferrer">Establecer contraseña: '+$email+'</a></li>'
}
$html+='</ul><p>Después de guardar una contraseña, abre el portal de conductor o administración según la cuenta. No se han enviado correos.</p></body></html>'
$privatePath=Join-Path $PSScriptRoot '..\.private'
New-Item -ItemType Directory -Path $privatePath -Force|Out-Null
[System.IO.File]::WriteAllText((Join-Path $privatePath 'accesos.html'),$html,[System.Text.UTF8Encoding]::new($false))
Write-Output 'Enlaces privados guardados en .private/accesos.html. No contienen claves administrativas y no se incluyen en el despliegue ni en Git.'

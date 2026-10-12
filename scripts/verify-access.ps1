$ErrorActionPreference='Continue'
$keyOutput=& supabase projects api-keys --project-ref xbhjqejqbqovwamztdcn --output json 2>$null
$ErrorActionPreference='Stop'
if($LASTEXITCODE -ne 0){throw 'No se pudo obtener acceso al proyecto.'}
$keys=($keyOutput -join "`n")|ConvertFrom-Json
$secret=($keys|Where-Object name -eq 'service_role'|Select-Object -First 1).api_key
$publicKey=($keys|Where-Object name -eq 'anon'|Select-Object -First 1).api_key
$base='https://xbhjqejqbqovwamztdcn.supabase.co'
$adminHeaders=@{apikey=$secret;Authorization=('Bearer '+$secret)}
$expected=@{'cegarve@hotmail.com'='driver';'drakotransportapp@gmail.com'='business_admin';'aitrezsg@gmail.com'='technical_admin'}
foreach($email in $expected.Keys){
 $link=Invoke-RestMethod -Method Post -Uri "$base/auth/v1/admin/generate_link" -Headers $adminHeaders -ContentType 'application/json' -Body (@{type='magiclink';email=$email}|ConvertTo-Json)
 $hash=$link.hashed_token
 if(-not $hash){$hash=$link.properties.hashed_token}
 if(-not $hash){throw 'No se pudo generar una sesión de verificación.'}
 $session=Invoke-RestMethod -Method Post -Uri "$base/auth/v1/verify" -Headers @{apikey=$publicKey} -ContentType 'application/json' -Body (@{type='magiclink';token_hash=$hash}|ConvertTo-Json)
 $headers=@{apikey=$publicKey;Authorization=('Bearer '+$session.access_token)}
 try{
  $profile=Invoke-RestMethod -Uri "$base/rest/v1/profiles?id=eq.$($session.user.id)&select=id,role,notify_trips" -Headers $headers
  if($profile[0].role -ne $expected[$email]){throw "Rol incorrecto: $email"}
  if($expected[$email] -eq 'technical_admin' -and $profile[0].notify_trips){throw 'AITREZ tiene avisos activados.'}
  $drivers=Invoke-RestMethod -Uri "$base/rest/v1/drivers?select=id" -Headers $headers
  $hours=Invoke-RestMethod -Uri "$base/rest/v1/working_hours?select=weekday,start_time,end_time,end_day_offset" -Headers $headers
  if($drivers.Count -ne 1 -or $hours.Count -ne 5){throw 'Conductor u horario inicial incorrecto.'}
  Write-Output "PASS: $email — rol, lectura de agenda y horario inicial"
  $denied=$false
  $body=if($expected[$email] -eq 'driver'){@{p_driver_id=[guid]::NewGuid().ToString();p_hours=@()}}else{@{p_driver_id=$drivers[0].id;p_hours=@(@{weekday=1;start_time='20:00';end_time='07:00';end_day_offset=0})}}
  try{Invoke-RestMethod -Method Post -Uri "$base/rest/v1/rpc/replace_working_hours" -Headers $headers -ContentType 'application/json' -Body ($body|ConvertTo-Json -Depth 5)|Out-Null}catch{if([int]$_.Exception.Response.StatusCode -in @(400,403)){$denied=$true}else{throw}}
  if(-not $denied){throw 'La operación inválida no fue rechazada.'}
  Write-Output 'PASS: operación no autorizada o intervalo inválido rechazado'
 }finally{Invoke-RestMethod -Method Post -Uri "$base/auth/v1/logout" -Headers $headers|Out-Null}
}
$denied=$false
try{Invoke-RestMethod -Uri "$base/rest/v1/profiles?select=id" -Headers @{apikey=$publicKey;Authorization=('Bearer '+$publicKey)}|Out-Null}catch{if([int]$_.Exception.Response.StatusCode -in @(401,403)){$denied=$true}else{throw}}
if(-not $denied){throw 'Los perfiles son accesibles sin iniciar sesión.'}
Write-Output 'PASS: acceso anónimo a perfiles bloqueado'

$ErrorActionPreference='Continue'
$keyOutput=& supabase projects api-keys --project-ref xbhjqejqbqovwamztdcn --output json 2>$null
$ErrorActionPreference='Stop'
if($LASTEXITCODE -ne 0){throw 'No se pudo obtener acceso.'}
$keys=($keyOutput -join "`n")|ConvertFrom-Json
$secret=($keys|Where-Object name -eq 'service_role'|Select-Object -First 1).api_key
$publicKey=($keys|Where-Object name -eq 'anon'|Select-Object -First 1).api_key
$base='https://xbhjqejqbqovwamztdcn.supabase.co'
$admin=@{apikey=$secret;Authorization=('Bearer '+$secret)}
$public=@{apikey=$publicKey;Authorization=('Bearer '+$publicKey)}
function Rpc($name,$body,$headers){Invoke-RestMethod -Method Post -Uri "$base/rest/v1/rpc/$name" -Headers $headers -ContentType 'application/json' -Body ($body|ConvertTo-Json -Depth 8)}
$requests=@();$driverHeaders=$null
try{
 $link=Invoke-RestMethod -Method Post -Uri "$base/auth/v1/admin/generate_link" -Headers $admin -ContentType 'application/json' -Body (@{type='magiclink';email='cegarve@hotmail.com'}|ConvertTo-Json)
 $hash=$link.hashed_token;if(-not $hash){$hash=$link.properties.hashed_token}
 $session=Invoke-RestMethod -Method Post -Uri "$base/auth/v1/verify" -Headers @{apikey=$publicKey} -ContentType 'application/json' -Body (@{type='magiclink';token_hash=$hash}|ConvertTo-Json)
 $driverHeaders=@{apikey=$publicKey;Authorization=('Bearer '+$session.access_token)}
 $date=[DateTime]::UtcNow.AddDays(1).Date;while($date.DayOfWeek -notin @([DayOfWeek]::Monday,[DayOfWeek]::Tuesday,[DayOfWeek]::Wednesday,[DayOfWeek]::Thursday)){$date=$date.AddDays(1)}
 $token=([guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N'))
 $request=[guid]::NewGuid().ToString();$requests+=$request
 $data=@{first_name='PRUEBA AUTOMATICA';last_name='Eliminar';phone='+573000000000';origin='Origen de prueba Cali';destination='Destino de prueba Cali';stops=@('Parada de prueba');passengers=2;pets=$true;luggage=$true;luggage_details='Una maleta';pickup_at=($date.ToString('yyyy-MM-dd')+'T10:00:00-05:00');minutes=30;km=12;consent=$true;payment_method='nequi'}
 $submitted=Rpc 'submit_test_booking' @{p_request_id=$request;p_token=$token;p_data=$data} $public
 if(-not $submitted.ok){if(-not $submitted.alternatives.Count){throw 'No hay intervalo de prueba disponible.'};$data.pickup_at=$submitted.alternatives[0];$submitted=Rpc 'submit_test_booking' @{p_request_id=$request;p_token=$token;p_data=$data} $public}
 if(-not $submitted.ok){throw 'No se pudo crear solicitud.'}
 $reference=$submitted.reference
 $booking=Rpc 'get_test_booking' @{p_reference=$reference;p_token=$token} $public
 if($booking.status -ne 'pending_driver' -or $booking.assigned_vehicle -or $booking.price_cop -ne 24000 -or -not $booking.created_at){throw 'Estado, privacidad, precio o fecha de creación incorrectos.'}
 Write-Output 'PASS: solicitud guardada, precio en servidor, fecha automática y vehículo oculto antes de confirmar'
 $repeated=Rpc 'submit_test_booking' @{p_request_id=$request;p_token=$token;p_data=$data} $public
 if($repeated.reference -ne $reference){throw 'Fallo de idempotencia.'}
 Write-Output 'PASS: reintento no duplica la reserva'
 $secondRequest=[guid]::NewGuid().ToString();$requests+=$secondRequest
 $conflict=Rpc 'submit_test_booking' @{p_request_id=$secondRequest;p_token=$token;p_data=$data} $public
 if($conflict.ok -or $conflict.alternatives.Count -eq 0){throw 'Conflicto no detectado o sin alternativas.'}
 Write-Output 'PASS: horario bloqueado y alternativas ofrecidas'
 $blocked=$false;try{Rpc 'get_test_booking' @{p_reference=$reference;p_token=('a'*64)} $public|Out-Null}catch{$blocked=$true}
 if(-not $blocked){throw 'El token incorrecto obtuvo acceso.'}
 Write-Output 'PASS: enlace incorrecto no revela información'
 $blocked=$false;try{Rpc 'change_test_booking' @{p_id=$booking.id;p_status='confirmed'} $public|Out-Null}catch{$blocked=$true}
 if(-not $blocked){throw 'Un invitado pudo confirmar el viaje.'}
 Write-Output 'PASS: confirmación anónima bloqueada'
 Rpc 'change_test_booking' @{p_id=$booking.id;p_status='confirmed'} $driverHeaders|Out-Null
 $confirmed=Rpc 'get_test_booking' @{p_reference=$reference;p_token=$token} $public
 if($confirmed.status -ne 'confirmed' -or $confirmed.assigned_vehicle.plate -ne 'IZN897'){throw 'Fallo de confirmación o vehículo.'}
 Write-Output 'PASS: conductor confirma y pasajero ve vehículo asignado'
 Rpc 'cancel_test_booking' @{p_reference=$reference;p_token=$token} $public|Out-Null
 $cancelled=Rpc 'get_test_booking' @{p_reference=$reference;p_token=$token} $public
 if($cancelled.status -ne 'cancelled'){throw 'Fallo de cancelación.'}
 $secondToken=([guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N'))
 $new=Rpc 'submit_test_booking' @{p_request_id=$secondRequest;p_token=$secondToken;p_data=$data} $public
 if(-not $new.ok){throw 'La cancelación no liberó el horario.'}
 Write-Output 'PASS: cancelar libera el horario para otra solicitud'
}finally{
 foreach($requestId in $requests){
  $rows=Invoke-RestMethod -Uri "$base/rest/v1/bookings?request_id=eq.$requestId&is_test=eq.true&select=id" -Headers $admin
  foreach($row in $rows){
   foreach($table in @('calendar_slots','guest_access','notification_outbox')){Invoke-RestMethod -Method Delete -Uri "$base/rest/v1/${table}?booking_id=eq.$($row.id)" -Headers $admin|Out-Null}
   Invoke-RestMethod -Method Delete -Uri "$base/rest/v1/audit_events?record_id=eq.$($row.id)" -Headers $admin|Out-Null
   Invoke-RestMethod -Method Delete -Uri "$base/rest/v1/bookings?id=eq.$($row.id)&is_test=eq.true" -Headers $admin|Out-Null
  }
 }
 if($driverHeaders){Invoke-RestMethod -Method Post -Uri "$base/auth/v1/logout?scope=local" -Headers $driverHeaders|Out-Null}
 Write-Output 'Datos de verificación eliminados.'
}

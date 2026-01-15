# Script para configurar Task Scheduler de Windows
# Programa la ejecucion de alertas semanales todos los domingos a las 8:00 AM

# Configuracion
$TaskName = "CafeQuindio-Alertas-Semanales-OT"
$TaskDescription = "Envio automatico de alertas semanales de OTs pendientes a tecnicos"
$ScriptPath = "$PSScriptRoot\send_weekly_alerts.py"
$PythonPath = (Join-Path (Split-Path $PSScriptRoot -Parent) ".venv\Scripts\python.exe")
$LogsDir = "$PSScriptRoot\logs"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   CONFIGURACION DE ALERTAS SEMANALES - TASK SCHEDULER" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que el script de Python existe
if (-not (Test-Path $ScriptPath)) {
    Write-Host "Error: No se encuentra el script Python en: $ScriptPath" -ForegroundColor Red
    exit 1
}

# Verificar que Python existe
if (-not (Test-Path $PythonPath)) {
    Write-Host "Error: No se encuentra Python en: $PythonPath" -ForegroundColor Red
    Write-Host "Asegurate de tener el entorno virtual activado en .venv" -ForegroundColor Yellow
    exit 1
}

# Crear directorio de logs si no existe
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir | Out-Null
    Write-Host "Directorio de logs creado: $LogsDir" -ForegroundColor Green
}

Write-Host "Configuracion de la tarea:" -ForegroundColor Yellow
Write-Host "   - Nombre: $TaskName" -ForegroundColor White
Write-Host "   - Script: $ScriptPath" -ForegroundColor White
Write-Host "   - Python: $PythonPath" -ForegroundColor White
Write-Host "   - Frecuencia: Todos los domingos a las 8:00 AM" -ForegroundColor White
Write-Host ""

# Preguntar confirmacion
$confirm = Read-Host "Deseas crear/actualizar esta tarea programada? (S/N)"
if ($confirm -ne 'S' -and $confirm -ne 's') {
    Write-Host "Operacion cancelada por el usuario" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Creando tarea programada..." -ForegroundColor Cyan

try {
    # Eliminar tarea existente si existe
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "Eliminando tarea existente..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    
    # Configurar accion (ejecutar Python script)
    $action = New-ScheduledTaskAction -Execute $PythonPath -Argument $ScriptPath -WorkingDirectory $PSScriptRoot
    
    # Configurar trigger (domingos a las 8:00 AM)
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 8:00AM
    
    # Configurar settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
    
    # Configurar principal (usuario actual)
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Highest
    
    # Registrar tarea
    Register-ScheduledTask -TaskName $TaskName -Description $TaskDescription -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
    
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host "   TAREA PROGRAMADA CREADA EXITOSAMENTE" -ForegroundColor Green
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Programacion:" -ForegroundColor Cyan
    Write-Host "   - Ejecuta todos los domingos a las 8:00 AM" -ForegroundColor White
    Write-Host "   - Limite de ejecucion: 1 hora" -ForegroundColor White
    Write-Host "   - Se ejecuta aunque este en bateria" -ForegroundColor White
    Write-Host ""
    Write-Host "Logs:" -ForegroundColor Cyan
    Write-Host "   - Ubicacion: $LogsDir" -ForegroundColor White
    Write-Host "   - Archivo: weekly_alerts_YYYYMMDD.log" -ForegroundColor White
    Write-Host ""
    Write-Host "Comandos utiles:" -ForegroundColor Cyan
    Write-Host "   - Ver estado: Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host "   - Ejecutar ahora: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host "   - Ejecutar modo prueba: python send_weekly_alerts.py --test" -ForegroundColor White
    Write-Host "   - Deshabilitar: Disable-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host "   - Eliminar: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false" -ForegroundColor White
    Write-Host ""
    
    # Preguntar si quiere ejecutar prueba
    Write-Host "======================================================" -ForegroundColor Yellow
    $testNow = Read-Host "Deseas ejecutar una prueba ahora (modo --test)? (S/N)"
    if ($testNow -eq 'S' -or $testNow -eq 's') {
        Write-Host ""
        Write-Host "Ejecutando en modo de prueba (sin enviar emails)..." -ForegroundColor Cyan
        Write-Host ""
        & $PythonPath $ScriptPath --test
        Write-Host ""
        Write-Host "Prueba completada. Revisa el output arriba." -ForegroundColor Green
    }

} catch {
    Write-Host ""
    Write-Host "Error al crear la tarea programada:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles soluciones:" -ForegroundColor Yellow
    Write-Host "   - Ejecuta PowerShell como Administrador" -ForegroundColor White
    Write-Host "   - Verifica que Task Scheduler este habilitado" -ForegroundColor White
    Write-Host "   - Revisa los permisos de ejecucion de PowerShell" -ForegroundColor White
    exit 1
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# INICIAR BACKEND FASTAPI EN LOCAL
# ============================================
# Este script inicia el backend en localhost:8000
# Conectado a la base de datos de produccion
# ============================================

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   INICIANDO BACKEND FASTAPI (LOCAL)" -ForegroundColor White
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL Backend:       http://localhost:8000" -ForegroundColor Green
Write-Host "Documentacion:     http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Base de Datos:     AWS RDS (Produccion)" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE: Estas conectado a la BD de produccion" -ForegroundColor Yellow
Write-Host "Solo para pruebas. NO modifiques datos criticos." -ForegroundColor Yellow
Write-Host ""
Write-Host "Para detener el servidor: Ctrl + C" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar uvicorn con recarga automatica
python -m uvicorn app.fastapi_app:app --reload --host 0.0.0.0 --port 8000

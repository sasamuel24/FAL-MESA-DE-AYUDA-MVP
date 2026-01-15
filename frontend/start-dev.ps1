# ============================================
# INICIAR FRONTEND NEXT.JS EN LOCAL
# ============================================
# Este script inicia el frontend en localhost:3000
# Conectado al backend local (localhost:8000)
# ============================================

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   INICIANDO FRONTEND NEXT.JS (LOCAL)" -ForegroundColor White
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL Frontend:      http://localhost:3000" -ForegroundColor Green
Write-Host "Backend API:       http://localhost:8000/api/v1" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE: Asegurate de tener el backend corriendo" -ForegroundColor Yellow
Write-Host "Usa: cd backend && .\start-dev.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para detener el servidor: Ctrl + C" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar Next.js en modo desarrollo
npm run dev

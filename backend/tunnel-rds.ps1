# Script para crear tunel SSH a RDS a traves de EC2
# Ejecutar: .\tunnel-rds.ps1

Write-Host "Creando tunel SSH a RDS..." -ForegroundColor Cyan

# Configuracion
$EC2_IP = "18.118.105.218"
$KEY_FILE = "..\key-mesadeayuda.pem"
$RDS_HOST = "cafequindio-mesadeayuda-db.chgqoo4oaal4.us-east-2.rds.amazonaws.com"
$LOCAL_PORT = "5433"
$RDS_PORT = "5432"

Write-Host "EC2: $EC2_IP" -ForegroundColor Yellow
Write-Host "RDS: $RDS_HOST" -ForegroundColor Yellow
Write-Host "Puerto local: $LOCAL_PORT" -ForegroundColor Yellow

# Crear tunel SSH
ssh -i $KEY_FILE -L ${LOCAL_PORT}:${RDS_HOST}:${RDS_PORT} ubuntu@${EC2_IP} -N

# Despues de ejecutar este script, usa en .env:
# DATABASE_URL=postgresql://postgres:CQhelpdesk.@localhost:5433/postgres?client_encoding=utf8

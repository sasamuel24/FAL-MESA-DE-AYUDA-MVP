# 🍮 Café Quindío - Sistema de Gestión

## 📖 Descripción
Sistema integral de gestión para Café Quindío con backend automático y deployment continuo. Incluye:
- ✅ Gestión de solicitudes (B2C)
- ✅ Sistema de órdenes de trabajo (OTs)
- ✅ Panel de administración
- ✅ Gestión de técnicos y usuarios
- ✅ Firmas digitales de conformidad
- ✅ Reportes y notificaciones

## 🏗️ Arquitectura
- **Backend**: Flask + PostgreSQL
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT

## 🚀 Instalación y Configuración

### Backend
```bash
cd D:\CafeQuindio\backend
pip install -r requirements/development.txt
python wsgi.py
```

### Frontend
```bash
cd D:\CafeQuindio\frontend
npm install
npm run dev
```

## 🌐 URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Base de datos**: localhost:5432

## 📁 Estructura del Proyecto
```
CafeQuindio/
├── backend/          # API Flask
├── frontend/         # Aplicación Next.js
└── docs/            # Documentación
```

## 🔧 Variables de Entorno
Ver archivo `.env` en la carpeta backend para configuración de base de datos y servicios.
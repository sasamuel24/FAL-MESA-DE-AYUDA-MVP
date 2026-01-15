"""
Script para envío automatizado de alertas semanales de OTs pendientes
Ejecutar todos los domingos mediante Task Scheduler o cron

Uso:
    python send_weekly_alerts.py [--test]

Opciones:
    --test: Modo de prueba (solo muestra estadísticas sin enviar emails)
"""
import sys
import os
import logging
from datetime import datetime
from pathlib import Path

# Agregar directorio raíz al path para imports
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.database import get_db
from app.services.weekly_alerts_service import WeeklyAlertsService

# Configurar logging
log_dir = backend_dir / 'logs'
log_dir.mkdir(exist_ok=True)

log_file = log_dir / f'weekly_alerts_{datetime.now().strftime("%Y%m%d")}.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


def main():
    """Función principal del script"""
    
    # Verificar modo de prueba
    test_mode = '--test' in sys.argv
    
    logger.info("=" * 80)
    logger.info("🔔 SISTEMA DE ALERTAS SEMANALES DE OTs PENDIENTES")
    logger.info("=" * 80)
    logger.info(f"📅 Fecha de ejecución: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info(f"🔧 Modo: {'PRUEBA (sin enviar emails)' if test_mode else 'PRODUCCIÓN'}")
    logger.info("=" * 80)
    
    try:
        # Obtener sesión de BD
        db = next(get_db())
        
        # Crear servicio de alertas
        alerts_service = WeeklyAlertsService(db)
        
        if test_mode:
            # Modo de prueba: solo obtener estadísticas
            print("\n[TEST] Ejecutando en modo de prueba...")
            logger.info("🧪 Ejecutando en modo de prueba...")
            
            ots_por_tecnico = alerts_service.get_pending_ots_by_technician()
            
            if not ots_por_tecnico:
                print("\n[TEST] No hay OTs pendientes en este momento")
                logger.info("✅ No hay OTs pendientes en este momento")
                return 0
            
            # Mostrar estadísticas
            total_tecnicos = len(ots_por_tecnico)
            total_ots = sum(len(ots) for ots in ots_por_tecnico.values())
            total_urgentes = sum(
                len([ot for ot in ots if ot.get('es_urgente', False)])
                for ots in ots_por_tecnico.values()
            )
            
            print("\n" + "=" * 80)
            print("ESTADISTICAS DE OTs PENDIENTES:")
            print("=" * 80)
            print(f"Tecnicos con OTs: {total_tecnicos}")
            print(f"Total OTs pendientes: {total_ots}")
            print(f"OTs urgentes: {total_urgentes}")
            print("=" * 80)
            
            logger.info("=" * 80)
            logger.info("📊 ESTADÍSTICAS DE OTs PENDIENTES:")
            logger.info("=" * 80)
            logger.info(f"👥 Técnicos con OTs: {total_tecnicos}")
            logger.info(f"📋 Total OTs pendientes: {total_ots}")
            logger.info(f"🔴 OTs urgentes: {total_urgentes}")
            logger.info("=" * 80)
            
            print("\nDetalle por tecnico:")
            logger.info("\n📋 Detalle por técnico:")
            for tecnico, ots in sorted(ots_por_tecnico.items(), key=lambda x: len(x[1]), reverse=True):
                urgentes = len([ot for ot in ots if ot.get('es_urgente', False)])
                user = alerts_service.get_technician_user(tecnico)
                email = user.email if user else 'Sin email'
                area = user.area if user and user.area else 'Sin área'
                print(f"  - {tecnico} ({email}) - Área: {area}: {len(ots)} OTs ({urgentes} urgentes)")
                logger.info(f"  • {tecnico} ({email}) - Área: {area}: {len(ots)} OTs ({urgentes} urgentes)")
            
            print("\n[TEST] Modo de prueba completado. No se enviaron emails.\n")
            logger.info("\n✅ Modo de prueba completado. No se enviaron emails.")
            return 0
        
        else:
            # Modo producción: ejecutar alertas
            logger.info("🚀 Ejecutando envío de alertas semanales...")
            
            result = alerts_service.execute_weekly_alerts()
            
            # Mostrar resultados
            logger.info("=" * 80)
            logger.info("📊 RESULTADOS DE LA EJECUCIÓN:")
            logger.info("=" * 80)
            logger.info(f"✅ Técnicos alertados: {result['tecnicos_alertados']}")
            
            if result['tecnicos_fallidos'] > 0:
                logger.warning(f"⚠️ Técnicos con fallo: {result['tecnicos_fallidos']}")
            
            logger.info(f"📋 Total OTs procesadas: {result['total_ots']}")
            logger.info(f"📧 Resumen consolidado enviado: {'Sí' if result['resumen_enviado'] else 'No'}")
            logger.info(f"⏱️ Tiempo de ejecución: {result['execution_time_seconds']:.2f}s")
            logger.info("=" * 80)
            
            if result['success']:
                logger.info("✅ Proceso completado exitosamente")
                return 0
            else:
                logger.error("❌ El proceso finalizó con errores")
                return 1
    
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"❌ ERROR CRÍTICO: {e}")
        logger.error("=" * 80)
        import traceback
        logger.error(traceback.format_exc())
        return 1
    
    finally:
        # Cerrar sesión de BD
        try:
            db.close()
        except:
            pass


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

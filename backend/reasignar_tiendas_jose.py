"""
Script para reasignar solicitudes de tiendas de José Luis que están asignadas a Jeisson
Ejecutar desde el directorio backend: python reasignar_tiendas_jose.py
"""
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import B2CSolicitudes, WorkOrder
from app.database import get_db
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

# Configuración de IDs de usuarios
JEISSON_ID = 4  # tecnicotiendascentro@cafequindio.com.co
JOSE_ID = 43     # josealan0808@gmail.com

# Tiendas que deben ir a José Luis
TIENDAS_JOSE = [
    "PLAZA IMPERIAL",
    "TITAN PLAZA",
    "USAQUEN",
    "EL DORADO",
    "UNICENTRO",
    "PLAZA CLARO",
    "BAVARIA",
    "EDEN",
    "NUESTRO BOGOTA",
    "SANTA FE"
]

def normalizar_tienda(tienda: str) -> str:
    """Normaliza el nombre de la tienda"""
    if not tienda:
        return ""
    return tienda.strip().upper()

def reasignar_solicitudes():
    """
    Reasigna solicitudes de zona CENTRO con tiendas de José Luis
    que actualmente están asignadas a Jeisson
    """
    # Crear sesión de base de datos
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        print("❌ Error: DATABASE_URL no está configurada")
        return
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("\n" + "="*80)
        print("🔄 REASIGNACIÓN DE SOLICITUDES - Tiendas de José Luis")
        print("="*80)
        print(f"\n📋 Tiendas a procesar: {len(TIENDAS_JOSE)}")
        for tienda in TIENDAS_JOSE:
            print(f"   - {tienda}")
        
        print(f"\n👤 De: Jeisson Cruz (ID: {JEISSON_ID})")
        print(f"👤 A:  José Luis (ID: {JOSE_ID})")
        print("\n" + "-"*80)
        
        # Buscar solicitudes B2C
        solicitudes_procesadas = 0
        ots_procesadas = 0
        
        for tienda in TIENDAS_JOSE:
            # Normalizar nombre de tienda para búsqueda
            tienda_normalizada = normalizar_tienda(tienda)
            
            # Buscar solicitudes B2C de zona CENTRO con esta tienda, asignadas a Jeisson
            solicitudes = db.query(B2CSolicitudes).filter(
                B2CSolicitudes.zona.ilike('%CENTRO%'),
                B2CSolicitudes.tienda.ilike(f'%{tienda}%'),
                B2CSolicitudes.asignado_a == JEISSON_ID
            ).all()
            
            if solicitudes:
                print(f"\n🏪 Tienda: {tienda}")
                print(f"   📄 Solicitudes encontradas: {len(solicitudes)}")
                
                for solicitud in solicitudes:
                    print(f"      • Solicitud ID {solicitud.id} (Folio: {solicitud.id}) - {solicitud.asunto[:50]}...")
                    
                    # Reasignar solicitud a José
                    solicitud.asignado_a = JOSE_ID
                    solicitudes_procesadas += 1
                    
                    # Buscar OT relacionada y reasignarla también
                    ot = db.query(WorkOrder).filter(
                        WorkOrder.solicitud_id == solicitud.id,
                        WorkOrder.tecnico_asignado_id == JEISSON_ID
                    ).first()
                    
                    if ot:
                        ot.tecnico_asignado_id = JOSE_ID
                        ots_procesadas += 1
                        print(f"         ✅ OT #{ot.folio} también reasignada")
        
        # Confirmar cambios
        if solicitudes_procesadas > 0:
            print("\n" + "="*80)
            print("📊 RESUMEN DE CAMBIOS")
            print("="*80)
            print(f"   📄 Solicitudes B2C reasignadas: {solicitudes_procesadas}")
            print(f"   🔧 OTs reasignadas: {ots_procesadas}")
            
            respuesta = input("\n¿Confirmar cambios? (SI/NO): ").strip().upper()
            
            if respuesta == "SI":
                db.commit()
                print("\n✅ Cambios guardados exitosamente")
                print(f"   {solicitudes_procesadas} solicitudes reasignadas a José Luis")
                print(f"   {ots_procesadas} OTs reasignadas a José Luis")
            else:
                db.rollback()
                print("\n❌ Cambios cancelados - No se guardó nada")
        else:
            print("\n✅ No se encontraron solicitudes para reasignar")
            print("   Todas las tiendas de José ya están correctamente asignadas")
        
        print("\n" + "="*80)
        
    except Exception as e:
        print(f"\n❌ Error durante la reasignación: {e}")
        db.rollback()
    finally:
        db.close()

def verificar_estado():
    """
    Verifica el estado actual de las asignaciones sin hacer cambios
    """
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        print("❌ Error: DATABASE_URL no está configurada")
        return
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("\n" + "="*80)
        print("🔍 VERIFICACIÓN DE ESTADO - Tiendas de José Luis")
        print("="*80)
        
        total_jose = 0
        total_jeisson = 0
        total_otros = 0
        
        for tienda in TIENDAS_JOSE:
            # Buscar solicitudes de esta tienda en zona CENTRO
            solicitudes = db.query(B2CSolicitudes).filter(
                B2CSolicitudes.zona.ilike('%CENTRO%'),
                B2CSolicitudes.tienda.ilike(f'%{tienda}%')
            ).all()
            
            if solicitudes:
                jose = sum(1 for s in solicitudes if s.asignado_a == JOSE_ID)
                jeisson = sum(1 for s in solicitudes if s.asignado_a == JEISSON_ID)
                otros = len(solicitudes) - jose - jeisson
                
                total_jose += jose
                total_jeisson += jeisson
                total_otros += otros
                
                if jeisson > 0 or otros > 0:
                    print(f"\n🏪 {tienda}:")
                    print(f"   ✅ José Luis: {jose}")
                    if jeisson > 0:
                        print(f"   ⚠️  Jeisson: {jeisson} (DEBEN REASIGNARSE)")
                    if otros > 0:
                        print(f"   ℹ️  Otros: {otros}")
        
        print("\n" + "="*80)
        print("📊 RESUMEN GENERAL")
        print("="*80)
        print(f"   ✅ Asignadas a José Luis: {total_jose}")
        if total_jeisson > 0:
            print(f"   ⚠️  Asignadas a Jeisson (deben cambiar): {total_jeisson}")
        if total_otros > 0:
            print(f"   ℹ️  Asignadas a otros: {total_otros}")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error durante la verificación: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("\n🔧 Script de Reasignación de Tiendas")
    print("1. Verificar estado actual")
    print("2. Reasignar solicitudes")
    print("3. Salir")
    
    opcion = input("\nSeleccione una opción (1-3): ").strip()
    
    if opcion == "1":
        verificar_estado()
    elif opcion == "2":
        verificar_estado()
        print("\n")
        confirmacion = input("¿Proceder con la reasignación? (SI/NO): ").strip().upper()
        if confirmacion == "SI":
            reasignar_solicitudes()
        else:
            print("\n❌ Operación cancelada")
    elif opcion == "3":
        print("\n👋 Saliendo...")
    else:
        print("\n❌ Opción inválida")

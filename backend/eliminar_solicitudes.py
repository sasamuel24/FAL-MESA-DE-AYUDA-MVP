#!/usr/bin/env python3
"""
Script para eliminar solicitudes específicas por ID
"""

import sys
import os
from datetime import datetime

# Agregar el directorio de la aplicación al path
sys.path.append('/home/ubuntu/CAFE-QUINDIO-MESA-DE-AYUDA/backend')

from app.database import SessionLocal
from app.models import B2CSolicitudes, OTSolicitud

def eliminar_solicitudes_por_id(ids_a_eliminar):
    """
    Elimina solicitudes específicas por sus IDs
    IMPORTANTE: También elimina las OTs asociadas para evitar violación de foreign key
    
    Args:
        ids_a_eliminar (list): Lista de IDs de solicitudes a eliminar
    """
    db = SessionLocal()
    try:
        print("=" * 60)
        print("🗑️  ELIMINANDO SOLICITUDES Y OTS ASOCIADAS")
        print("=" * 60)
        print(f"⏰ Fecha y hora: {datetime.now()}")
        print(f"🎯 IDs de solicitudes a eliminar: {ids_a_eliminar}")
        print()

        solicitudes_eliminadas = 0
        ots_eliminadas = 0
        no_encontradas = 0

        for solicitud_id in ids_a_eliminar:
            print(f"🔍 Buscando solicitud ID {solicitud_id}...")
            
            # Buscar la solicitud
            solicitud = db.query(B2CSolicitudes).filter(
                B2CSolicitudes.id == solicitud_id
            ).first()
            
            if solicitud:
                print(f"   📋 Encontrada: {solicitud.asunto} (Categoría: {solicitud.categoria})")
                print(f"   📅 Creada: {solicitud.fecha_creacion}")
                print(f"   📧 Cliente: {solicitud.nombre} ({solicitud.correo})")
                
                # PASO 1: Buscar y eliminar OTs asociadas a esta solicitud
                ots_asociadas = db.query(OTSolicitud).filter(
                    OTSolicitud.solicitud_id == solicitud_id,
                    OTSolicitud.tipo_solicitud == 'B2C'
                ).all()
                
                if ots_asociadas:
                    print(f"   🔗 Encontradas {len(ots_asociadas)} OT(s) asociada(s):")
                    for ot in ots_asociadas:
                        print(f"      • OT Folio: {ot.folio} | Técnico: {ot.tecnico_asignado} | Etapa: {ot.etapa}")
                        db.delete(ot)
                        ots_eliminadas += 1
                    print(f"   ✅ {len(ots_asociadas)} OT(s) marcada(s) para eliminación")
                else:
                    print(f"   ℹ️  No hay OTs asociadas a esta solicitud")
                
                # PASO 2: Ahora eliminar la solicitud
                db.delete(solicitud)
                solicitudes_eliminadas += 1
                print(f"   ✅ Solicitud ID {solicitud_id} marcada para eliminación")
            else:
                no_encontradas += 1
                print(f"   ❌ Solicitud ID {solicitud_id} no encontrada")
            
            print()

        # Confirmar eliminación
        if solicitudes_eliminadas > 0 or ots_eliminadas > 0:
            print("💾 Aplicando eliminaciones en la base de datos...")
            db.commit()
            print("✅ Eliminaciones aplicadas exitosamente")
        else:
            print("ℹ️  No hay solicitudes que eliminar")

        # Resumen
        print()
        print("=" * 60)
        print("📊 RESUMEN DE ELIMINACIÓN")
        print("=" * 60)
        print(f"🎯 IDs solicitados: {len(ids_a_eliminar)}")
        print(f"✅ Solicitudes eliminadas: {solicitudes_eliminadas}")
        print(f"🔗 OTs eliminadas: {ots_eliminadas}")
        print(f"❌ Solicitudes no encontradas: {no_encontradas}")
        
        if solicitudes_eliminadas > 0:
            print(f"\n🎉 ¡Eliminación completada!")
            print(f"   • {solicitudes_eliminadas} solicitud(es) eliminada(s)")
            print(f"   • {ots_eliminadas} OT(s) eliminada(s)")
        else:
            print(f"\n⚠️  No se eliminó ninguna solicitud.")

    except Exception as e:
        print(f"❌ Error crítico durante la eliminación: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # IDs específicos a eliminar
    ids_a_eliminar = [289,286]
    
    # Confirmación de seguridad
    print("⚠️  ADVERTENCIA: Está a punto de eliminar las siguientes solicitudes:")
    for id_solicitud in ids_a_eliminar:
        print(f"   - Solicitud ID {id_solicitud}")
    print()
    
    # En producción, puedes comentar esta línea si quieres eliminación automática
    confirmacion = input("¿Está seguro que desea continuar? (escriba 'SI' para confirmar): ")
    
    if confirmacion.upper() == 'SI':
        eliminar_solicitudes_por_id(ids_a_eliminar)
    else:
        print("❌ Operación cancelada por el usuario")
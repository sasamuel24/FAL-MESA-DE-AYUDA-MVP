"""
Generador PDF simplificado basado en plantilla Excel
Usa el sistema de nombres de rango pero genera el PDF directamente desde Excel
"""
import openpyxl
from pathlib import Path
import logging
from io import BytesIO
from datetime import datetime
from typing import Dict, Any, Optional
import tempfile
import shutil

from .excel_template_manager import ExcelTemplateManager

logger = logging.getLogger(__name__)

class ExcelSimplePDFGenerator:
    """
    Generador simplificado que:
    1. Usa el sistema de nombres de rango de ExcelTemplateManager
    2. Genera el archivo Excel con datos
    3. Retorna el Excel como buffer (en preparación para PDF)
    """
    
    def __init__(self, template_path: str):
        self.template_path = Path(template_path)
        self.template_manager = ExcelTemplateManager(template_path)
        self.archivo_excel_datos = None
    
    def generar_pdf_desde_excel(self, datos_ot: Dict[str, Any], folio: int) -> BytesIO:
        """
        Procesar plantilla Excel con datos y preparar para PDF
        """
        try:
            logger.info(f"Generando documento para OT {folio} usando metodologia Excel")
            
            # 1. Procesar plantilla Excel con datos reales
            self.archivo_excel_datos = self.template_manager.procesar_plantilla_completa(datos_ot)
            
            # 2. Leer el archivo Excel procesado y convertir a BytesIO
            excel_buffer = BytesIO()
            
            with open(self.archivo_excel_datos, 'rb') as f:
                excel_buffer.write(f.read())
            
            excel_buffer.seek(0)
            
            logger.info(f"Documento Excel generado exitosamente para OT {folio}")
            logger.info(f"Archivo Excel temporal: {self.archivo_excel_datos}")
            
            return excel_buffer
            
        except Exception as e:
            logger.error(f"Error generando documento Excel para OT {folio}: {str(e)}")
            raise
    
    def cleanup_temp_files(self):
        """Limpiar archivos temporales generados"""
        try:
            if self.archivo_excel_datos and self.archivo_excel_datos.exists():
                # Mantener el archivo por ahora para debugging
                logger.info(f"📁 Archivo temporal mantenido: {self.archivo_excel_datos}")
        except Exception as e:
            logger.warning(f"Error limpiando archivos temporales: {e}")


def main():
    """Función de prueba"""
    template_path = "d:/CafeQuindio/backend/app/templates/FO-MT-006 Orden de trabajo de mantenimiento v1.xlsx"
    
    logging.basicConfig(level=logging.INFO)
    
    try:
        generator = ExcelSimplePDFGenerator(template_path)
        
        datos_ot = {
            'folio': 1927,
            'titulo': 'Mantenimiento Sistema de Molienda - Test Metodología',
            'fecha_creacion': '2025-10-09',
            'estado': 'En Proceso',
            'categoria': 'Mantenimiento Preventivo',
            'subcategoria': 'Equipos de Producción',
            'ubicacion': 'Planta Principal',
            'ciudad': 'Armenia, Quindío',
            'prioridad': 'Alta',
            'tipo_solicitud': 'Programado',
            'tipo_mantenimiento': 'Preventivo',
            'tiempo_estimado': '4',
            'etapa': 'Ejecución',
            'tecnico_asignado': 'Juan Pérez',
            'fecha_visita': '2025-10-10',
            'solicitante': 'María García',
            'contacto_solicitante': 'maria.garcia@cafequindio.com'
        }
        
        # Generar documento Excel
        excel_buffer = generator.generar_pdf_desde_excel(datos_ot, 1927)
        
        # Guardar resultado
        output_path = Path("d:/CafeQuindio/backend/app/templates") / f"OT_1927_Metodologia_Simple_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        with open(output_path, 'wb') as f:
            f.write(excel_buffer.getvalue())
        
        print(f"Documento Excel con metodologia generado: {output_path}")
        print(f"📊 Tamaño: {output_path.stat().st_size} bytes")
        
        # Limpiar archivos temporales
        generator.cleanup_temp_files()
        
    except Exception as e:
        print(f"Error: {e}")
        raise


if __name__ == "__main__":
    main()
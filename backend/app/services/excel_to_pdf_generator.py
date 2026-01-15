"""
Generador PDF integrado con el sistema de plantillas Excel
Combina el sistema de nombres de rango con la generación PDF usando ReportLab
"""
import openpyxl
from pathlib import Path
import logging
from io import BytesIO
from datetime import datetime
from typing import Dict, Any, Optional

# Importar librerías para PDF
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib import colors
    from reportlab.lib.units import inch, cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
except ImportError:
    print("ReportLab no esta instalado. Instalar con: pip install reportlab")

from .excel_template_manager import ExcelTemplateManager

logger = logging.getLogger(__name__)

class ExcelToPDFGenerator:
    """
    Generador que combina:
    1. Sistema de plantillas Excel con nombres de rango
    2. Generación PDF con ReportLab preservando el formato exacto
    """
    
    def __init__(self, template_path: str):
        self.template_path = Path(template_path)
        self.template_manager = ExcelTemplateManager(template_path)
        
        # Configurar estilos PDF
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
        # Variables de trabajo
        self.plantilla_procesada = None
        self.archivo_excel_datos = None
    
    def _setup_custom_styles(self):
        """Configurar estilos personalizados para PDF"""
        # Estilo para título principal
        self.styles.add(ParagraphStyle(
            name='TituloOT',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2E86AB'),
            fontName='Helvetica-Bold'
        ))
        
        # Estilo para encabezados de sección
        self.styles.add(ParagraphStyle(
            name='SeccionHeader',
            parent=self.styles['Heading2'],
            fontSize=12,
            spaceBefore=15,
            spaceAfter=10,
            alignment=TA_LEFT,
            textColor=colors.HexColor('#2E86AB'),
            fontName='Helvetica-Bold',
            backColor=colors.HexColor('#F0F8FF'),
            leftIndent=10,
            rightIndent=10,
            topPadding=5,
            bottomPadding=5
        ))
    
    def generar_pdf_desde_excel(self, datos_ot: Dict[str, Any], folio: int) -> BytesIO:
        """
        Proceso completo: Excel con datos -> PDF de alta fidelidad
        """
        try:
            logger.info(f"Generando PDF para OT {folio} usando metodologia Excel completa")
            
            # 1. Procesar plantilla Excel con datos reales
            self._procesar_plantilla_excel(datos_ot)
            
            # 2. Leer datos desde Excel procesado
            datos_desde_excel = self._leer_datos_desde_excel()
            
            # 3. Generar PDF replicando estructura Excel
            pdf_buffer = self._generar_pdf_desde_estructura_excel(datos_desde_excel, folio)
            
            logger.info(f"PDF generado exitosamente para OT {folio}")
            return pdf_buffer
            
        except Exception as e:
            logger.error(f"Error generando PDF para OT {folio}: {str(e)}")
            raise
    
    def _procesar_plantilla_excel(self, datos_ot: Dict[str, Any]):
        """Usar el ExcelTemplateManager para procesar la plantilla"""
        logger.info("Procesando plantilla Excel con datos...")
        
        # Procesar plantilla completa usando el sistema de nombres de rango
        self.archivo_excel_datos = self.template_manager.procesar_plantilla_completa(datos_ot)
        
        logger.info(f"Plantilla procesada: {self.archivo_excel_datos}")
    
    def _leer_datos_desde_excel(self) -> Dict[str, Any]:
        """Leer todos los datos desde el Excel ya procesado"""
        logger.info("Leyendo datos desde Excel procesado...")
        
        workbook = openpyxl.load_workbook(self.archivo_excel_datos)
        sheet = workbook.active
        
        datos_excel = {}
        
        # Leer usando los nombres de rango definidos
        for nombre_rango, config in self.template_manager.nombres_rango.items():
            try:
                celda = sheet[config['celda']]
                valor = celda.value if celda.value is not None else ''
                
                # Usar el campo original como clave
                campo_original = config['campo_original']
                datos_excel[campo_original] = valor
                
                logger.debug(f"Leido: {campo_original} = {valor} (desde {config['celda']})")
                
            except Exception as e:
                logger.warning(f"Error leyendo {nombre_rango}: {e}")
        
        workbook.close()
        
        logger.info(f"Datos leidos desde Excel: {len(datos_excel)} campos")
        return datos_excel
    
    def _generar_pdf_desde_estructura_excel(self, datos_excel: Dict[str, Any], folio: int) -> BytesIO:
        """
        Generar PDF replicando EXACTAMENTE la estructura visual de Excel
        """
        logger.info("Generando PDF con estructura visual identica a Excel...")
        
        # Crear buffer para el PDF
        pdf_buffer = BytesIO()
        
        # Crear documento PDF con dimensiones exactas
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1.5*cm,
            bottomMargin=1.5*cm
        )
        
        # Elementos del PDF
        elements = []
        
        # SECCIÓN 1: ENCABEZADO PRINCIPAL (replicando Excel filas 1-3)
        elements.extend(self._crear_encabezado_principal(datos_excel, folio))
        
        # SECCIÓN 2: INFORMACIÓN BÁSICA (replicando Excel filas 5-7)
        elements.extend(self._crear_seccion_info_basica(datos_excel))
        
        # SECCIÓN 3: INFORMACIÓN DE LA OT (replicando Excel fila 9)
        elements.extend(self._crear_seccion_info_ot())
        
        # SECCIÓN 4: DETALLES DE LA OT (replicando Excel filas 11-15)
        elements.extend(self._crear_seccion_detalles_ot(datos_excel))
        
        # SECCIÓN 5: ASIGNACIÓN (replicando Excel filas 17, 19-20)
        elements.extend(self._crear_seccion_asignacion(datos_excel))
        
        # SECCIÓN 6: DESCRIPCIÓN (replicando Excel filas 22, 24-27)
        elements.extend(self._crear_seccion_descripcion(datos_excel))
        
        # SECCIÓN 7: ÁREAS ADICIONALES (Imagen, Notas, Archivos, Firmas)
        elements.extend(self._crear_secciones_adicionales())
        
        # Generar el PDF
        doc.build(elements)
        
        return pdf_buffer
    
    def _crear_encabezado_principal(self, datos_excel: Dict[str, Any], folio: int) -> list:
        """Replicar encabezado principal (filas 1-3 Excel)"""
        elements = []
        
        # Tabla que replica la estructura Excel C1:H3
        encabezado_data = [
            ['', 'ORDEN DE TRABAJO DE MANTENIMIENTO', '', 'CÓDIGO:', datos_excel.get('CÓDIGO', f'FO-MT-006-{folio}')],
            ['', '', '', 'VERSIÓN:', datos_excel.get('VERSIÓN', '1.0')],
            ['', '', '', 'FECHA:', datos_excel.get('FECHA', datetime.now().strftime('%Y-%m-%d'))]
        ]
        
        encabezado_table = Table(encabezado_data, colWidths=[2*cm, 6*cm, 2*cm, 2*cm, 3*cm])
        encabezado_table.setStyle(TableStyle([
            # Título principal (replicando fusión C1:F3)
            ('SPAN', (1, 0), (2, 2)),
            ('ALIGN', (1, 0), (1, 2), 'CENTER'),
            ('VALIGN', (1, 0), (1, 2), 'MIDDLE'),
            ('FONTNAME', (1, 0), (1, 2), 'Helvetica-Bold'),
            ('FONTSIZE', (1, 0), (1, 2), 14),
            
            # Código, versión y fecha (replicando G1:H3)
            ('FONTNAME', (3, 0), (4, 2), 'Helvetica-Bold'),
            ('FONTSIZE', (3, 0), (4, 2), 10),
            ('ALIGN', (3, 0), (3, 2), 'RIGHT'),
            ('ALIGN', (4, 0), (4, 2), 'LEFT'),
            
            # Bordes y colores exactos
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (3, 0), (4, 2), colors.lightgrey),
        ]))
        
        elements.append(encabezado_table)
        elements.append(Spacer(1, 15))
        
        return elements
    
    def _crear_seccion_info_basica(self, datos_excel: Dict[str, Any]) -> list:
        """Replicar información básica (filas 5-7 Excel)"""
        elements = []
        
        info_basica_data = [
            ['Título:', datos_excel.get('Título', ''), '', '', 'ID:', datos_excel.get('ID', '')],
            ['', '', '', '', '', ''],
            ['Fecha:', datos_excel.get('Fecha', ''), '', 'Estado:', datos_excel.get('Estado', ''), '']
        ]
        
        info_basica_table = Table(info_basica_data, colWidths=[2*cm, 4*cm, 1*cm, 1.5*cm, 2*cm, 2.5*cm])
        info_basica_table.setStyle(TableStyle([
            # Replicar fusiones Excel
            ('SPAN', (1, 0), (3, 0)),  # Título
            ('SPAN', (4, 0), (5, 0)),  # ID
            ('SPAN', (1, 1), (5, 1)),  # Fila vacía
            ('SPAN', (1, 2), (2, 2)),  # Fecha
            ('SPAN', (4, 2), (5, 2)),  # Estado
            
            # Estilos
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (3, 2), (3, 2), 'Helvetica-Bold'),
            ('FONTNAME', (4, 0), (4, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(info_basica_table)
        elements.append(Spacer(1, 10))
        
        return elements
    
    def _crear_seccion_info_ot(self) -> list:
        """Replicar sección 'Información de la OT' (fila 9 Excel)"""
        elements = []
        
        info_ot_header = Table([['Información de la OT:']], colWidths=[17*cm])
        info_ot_header.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 12),
            ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(info_ot_header)
        elements.append(Spacer(1, 5))
        
        return elements
    
    def _crear_seccion_detalles_ot(self, datos_excel: Dict[str, Any]) -> list:
        """Replicar detalles OT (filas 11-15 Excel)"""
        elements = []
        
        detalles_data = [
            ['Categoría:', datos_excel.get('Categoría', ''), '', 'Subcategoría:', datos_excel.get('Subcategoría', ''), ''],
            ['Zona / Planta / Tienda:', datos_excel.get('Zona / Planta / Tienda', ''), '', 'Ciudad:', datos_excel.get('Ciudad', ''), ''],
            ['Prioridad:', datos_excel.get('Prioridad', ''), '', 'Tipo de Solicitud:', datos_excel.get('Tipo de Solicitud', ''), ''],
            ['Tipo de Mantenimiento:', datos_excel.get('Tipo de Mantenimiento', ''), '', 'Tiempo estimado (h):', datos_excel.get('Tiempo estimado (h)', ''), ''],
            ['Etapa:', datos_excel.get('Etapa', ''), '', '', '', '']
        ]
        
        detalles_table = Table(detalles_data, colWidths=[3*cm, 3.5*cm, 0.5*cm, 3*cm, 3.5*cm, 3.5*cm])
        detalles_table.setStyle(TableStyle([
            # Replicar fusiones Excel
            ('SPAN', (1, 0), (2, 0)),  ('SPAN', (4, 0), (5, 0)),
            ('SPAN', (1, 1), (2, 1)),  ('SPAN', (4, 1), (5, 1)),
            ('SPAN', (1, 2), (2, 2)),  ('SPAN', (4, 2), (5, 2)),
            ('SPAN', (1, 3), (2, 3)),  ('SPAN', (4, 3), (5, 3)),
            ('SPAN', (1, 4), (5, 4)),
            
            # Estilos
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(detalles_table)
        elements.append(Spacer(1, 10))
        
        return elements
    
    def _crear_seccion_asignacion(self, datos_excel: Dict[str, Any]) -> list:
        """Replicar sección Asignación (filas 17, 19-20 Excel)"""
        elements = []
        
        # Header Asignación
        asignacion_header = Table([['Asignación']], colWidths=[17*cm])
        asignacion_header.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 12),
            ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(asignacion_header)
        elements.append(Spacer(1, 5))
        
        # Datos de asignación
        asignacion_data = [
            ['Técnico asignado:', datos_excel.get('Técnico asignado', ''), '', 'Fecha de visita:', datos_excel.get('Fecha de visita', ''), ''],
            ['Solicitante:', datos_excel.get('Solicitante', ''), '', 'Contacto solicitante:', datos_excel.get('Contacto solicitante', ''), '']
        ]
        
        asignacion_table = Table(asignacion_data, colWidths=[3*cm, 3.5*cm, 0.5*cm, 3*cm, 3.5*cm, 3.5*cm])
        asignacion_table.setStyle(TableStyle([
            ('SPAN', (1, 0), (2, 0)),  ('SPAN', (4, 0), (5, 0)),
            ('SPAN', (1, 1), (2, 1)),  ('SPAN', (4, 1), (5, 1)),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(asignacion_table)
        elements.append(Spacer(1, 10))
        
        return elements
    
    def _crear_seccion_descripcion(self, datos_excel: Dict[str, Any]) -> list:
        """Replicar sección Descripción (filas 22, 24-27 Excel)"""
        elements = []
        
        # Header Descripción
        descripcion_header = Table([['Descripción']], colWidths=[17*cm])
        descripcion_header.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 12),
            ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(descripcion_header)
        elements.append(Spacer(1, 5))
        
        # Área de descripción (grande como en Excel A24:H27)
        descripcion_texto = datos_excel.get('descripcion', '[Espacio para descripción detallada del trabajo a realizar]')
        descripcion_area = Table([[descripcion_texto]], colWidths=[17*cm], rowHeights=[4*cm])
        descripcion_area.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica'),
            ('FONTSIZE', (0, 0), (0, 0), 10),
            ('VALIGN', (0, 0), (0, 0), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('TOPPADDING', (0, 0), (0, 0), 10),
            ('LEFTPADDING', (0, 0), (0, 0), 10),
        ]))
        
        elements.append(descripcion_area)
        elements.append(Spacer(1, 10))
        
        return elements
    
    def _crear_secciones_adicionales(self) -> list:
        """Replicar secciones adicionales (Imagen, Notas, Archivos, Firmas)"""
        elements = []
        
        # Imagen Original de la Solicitud
        elements.extend(self._crear_seccion_simple("Imagen Original de la Solicitud", 2*cm))
        
        # Notas del Técnico
        elements.extend(self._crear_seccion_simple("Notas del Técnico", 3*cm))
        
        # Archivos Adjuntos
        elements.extend(self._crear_seccion_simple("Archivos Adjuntos", 2*cm))
        
        # Firmas de Conformidad
        elements.extend(self._crear_seccion_firmas())
        
        return elements
    
    def _crear_seccion_simple(self, titulo: str, altura: float) -> list:
        """Crear sección simple con header y área"""
        elements = []
        
        # Header
        header = Table([[titulo]], colWidths=[17*cm])
        header.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 12),
            ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(header)
        elements.append(Spacer(1, 5))
        
        # Área
        area = Table([[f'[Espacio para {titulo.lower()}]']], colWidths=[17*cm], rowHeights=[altura])
        area.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica'),
            ('FONTSIZE', (0, 0), (0, 0), 10),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.grey),
        ]))
        elements.append(area)
        elements.append(Spacer(1, 10))
        
        return elements
    
    def _crear_seccion_firmas(self) -> list:
        """Replicar sección de firmas (filas 44-50 Excel)"""
        elements = []
        
        # Header
        firmas_header = Table([['Firmas de Conformidad']], colWidths=[17*cm])
        firmas_header.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 12),
            ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(firmas_header)
        elements.append(Spacer(1, 5))
        
        # Tabla de firmas replicando Excel
        firmas_data = [
            ['Nombre del Técnico', '', '', 'Nombre del Cliente', ''],
            ['', '', '', '', ''],
            ['', '', '', '', ''],
            ['Firma del Técnico', '', '', 'Firma del Cliente', '']
        ]
        
        tabla_firmas = Table(firmas_data, colWidths=[4*cm, 4*cm, 1*cm, 4*cm, 4*cm], rowHeights=[1*cm, 2*cm, 2*cm, 1*cm])
        tabla_firmas.setStyle(TableStyle([
            # Replicar fusiones Excel
            ('SPAN', (0, 0), (1, 0)),  ('SPAN', (3, 0), (4, 0)),
            ('SPAN', (0, 1), (1, 2)),  ('SPAN', (3, 1), (4, 2)),
            ('SPAN', (0, 3), (1, 3)),  ('SPAN', (3, 3), (4, 3)),
            
            # Estilos
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 0), (4, 0), colors.HexColor('#F0F8FF')),
            ('BACKGROUND', (0, 3), (4, 3), colors.HexColor('#F0F8FF')),
        ]))
        
        elements.append(tabla_firmas)
        
        return elements


def main():
    """Función de prueba del generador integrado"""
    template_path = "d:/CafeQuindio/backend/app/templates/FO-MT-006 Orden de trabajo de mantenimiento v1.xlsx"
    
    logging.basicConfig(level=logging.INFO)
    
    try:
        generator = ExcelToPDFGenerator(template_path)
        
        datos_ot = {
            'folio': 1927,
            'titulo': 'Mantenimiento Sistema de Molienda - Equipos Café',
            'fecha_creacion': '2025-10-09',
            'estado': 'En Proceso',
            'categoria': 'Mantenimiento Preventivo',
            'subcategoria': 'Equipos de Producción',
            'ubicacion': 'Planta Principal - Área Molienda',
            'ciudad': 'Armenia, Quindío',
            'prioridad': 'Alta',
            'tipo_solicitud': 'Programado',
            'tipo_mantenimiento': 'Preventivo',
            'tiempo_estimado': '4',
            'etapa': 'Ejecución',
            'tecnico_asignado': 'Juan Pérez Martínez',
            'fecha_visita': '2025-10-10',
            'solicitante': 'María García López',
            'contacto_solicitante': 'maria.garcia@cafequindio.com'
        }
        
        # Generar PDF integrado
        pdf_buffer = generator.generar_pdf_desde_excel(datos_ot, 1927)
        
        # Guardar PDF
        pdf_path = Path("d:/CafeQuindio/backend/app/templates") / f"OT_1927_Integrado_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        with open(pdf_path, 'wb') as f:
            f.write(pdf_buffer.getvalue())
        
        print(f"PDF integrado generado: {pdf_path}")
        
    except Exception as e:
        print(f"Error: {e}")
        raise


if __name__ == "__main__":
    main()
"""
Servicio para generar PDFs basados en templates Excel
Utiliza el template FO-MT-006 para generar órdenes de trabajo
"""
import openpyxl
from openpyxl.drawing import image as xl_image
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
    print("⚠️ ReportLab no está instalado. Instalar con: pip install reportlab")

logger = logging.getLogger(__name__)

class ExcelPDFGenerator:
    """
    Generador de PDFs basado en template Excel
    """
    
    def __init__(self):
        self.template_path = Path("app/templates/FO-MT-006 Orden de trabajo de mantenimiento v1.xlsx")
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Configurar estilos personalizados para el PDF"""
        # Estilo para título principal
        self.styles.add(ParagraphStyle(
            name='TituloOT',
            parent=self.styles['Title'],
            fontSize=18,
            textColor=colors.HexColor('#00B0B2'),
            alignment=TA_CENTER,
            spaceAfter=20
        ))
        
        # Estilo para encabezados de sección
        self.styles.add(ParagraphStyle(
            name='SeccionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#333333'),
            backgroundColor=colors.HexColor('#F0F8FF'),
            leftIndent=10,
            spaceAfter=10,
            spaceBefore=10
        ))
        
        # Estilo para campos
        self.styles.add(ParagraphStyle(
            name='Campo',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            leftIndent=5
        ))
    
    def generar_pdf_desde_template(self, datos_ot: Dict[str, Any], folio: int) -> BytesIO:
        """
        Generar PDF replicando exactamente la plantilla Excel FO-MT-006
        """
        try:
            logger.info(f"🔥 Generando PDF para OT {folio} usando template Excel FO-MT-006")
            
            # Crear buffer para el PDF
            pdf_buffer = BytesIO()
            
            # Crear documento PDF con márgenes específicos para replicar Excel
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
            
            # 1. ENCABEZADO PRINCIPAL (Filas 1-3) - Replicando celdas fusionadas A1:B3 y C1:F3
            encabezado_data = [
                ['', 'ORDEN DE TRABAJO DE MANTENIMIENTO', '', 'CÓDIGO:', f'FO-MT-006-{folio}'],
                ['', '', '', 'VERSIÓN:', '1.0'],
                ['', '', '', 'FECHA:', datetime.now().strftime('%Y-%m-%d')]
            ]
            
            encabezado_table = Table(encabezado_data, colWidths=[2*cm, 6*cm, 2*cm, 2*cm, 3*cm])
            encabezado_table.setStyle(TableStyle([
                # Título principal
                ('SPAN', (1, 0), (2, 2)),  # Fusionar celdas para título
                ('ALIGN', (1, 0), (1, 2), 'CENTER'),
                ('VALIGN', (1, 0), (1, 2), 'MIDDLE'),
                ('FONTNAME', (1, 0), (1, 2), 'Helvetica-Bold'),
                ('FONTSIZE', (1, 0), (1, 2), 14),
                
                # Código, versión y fecha
                ('FONTNAME', (3, 0), (4, 2), 'Helvetica-Bold'),
                ('FONTSIZE', (3, 0), (4, 2), 10),
                ('ALIGN', (3, 0), (3, 2), 'RIGHT'),
                ('ALIGN', (4, 0), (4, 2), 'LEFT'),
                
                # Bordes
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('BACKGROUND', (3, 0), (4, 2), colors.lightgrey),
            ]))
            
            elements.append(encabezado_table)
            elements.append(Spacer(1, 15))
            
            # 2. INFORMACIÓN BÁSICA (Filas 5-7) - Título, ID, Fecha, Estado
            info_basica_data = [
                ['Título:', datos_ot.get('titulo', 'Sin título'), '', '', 'ID:', str(folio)],
                ['', '', '', '', '', ''],
                ['Fecha:', datos_ot.get('fecha_creacion', 'No especificada'), '', 'Estado:', datos_ot.get('estado', 'Pendiente'), '']
            ]
            
            info_basica_table = Table(info_basica_data, colWidths=[2*cm, 4*cm, 1*cm, 1.5*cm, 2*cm, 2.5*cm])
            info_basica_table.setStyle(TableStyle([
                # Fusionar celdas como en Excel
                ('SPAN', (1, 0), (3, 0)),  # Título span
                ('SPAN', (4, 0), (5, 0)),  # ID span
                ('SPAN', (1, 1), (5, 1)),  # Fila vacía
                ('SPAN', (1, 2), (2, 2)),  # Fecha span
                ('SPAN', (4, 2), (5, 2)),  # Estado span
                
                # Estilos
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (3, 2), (3, 2), 'Helvetica-Bold'),
                ('FONTNAME', (4, 0), (4, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                
                # Bordes
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            
            elements.append(info_basica_table)
            elements.append(Spacer(1, 10))
            
            # 3. INFORMACIÓN DE LA OT (Fila 9) - Sección header
            info_ot_header = Table([['Información de la OT:']], colWidths=[17*cm])
            info_ot_header.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (0, 0), 12),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(info_ot_header)
            elements.append(Spacer(1, 5))
            
            # 4. DETALLES DE LA OT (Filas 11-15)
            detalles_data = [
                ['Categoría:', datos_ot.get('categoria', 'No especificada'), '', 'Subcategoría:', datos_ot.get('subcategoria', 'No especificada'), ''],
                ['Zona / Planta / Tienda:', datos_ot.get('ubicacion', 'No especificada'), '', 'Ciudad:', datos_ot.get('ciudad', 'No especificada'), ''],
                ['Prioridad:', datos_ot.get('prioridad', 'Media'), '', 'Tipo de Solicitud:', datos_ot.get('tipo_solicitud', 'No especificado'), ''],
                ['Tipo de Mantenimiento:', datos_ot.get('tipo_mantenimiento', 'No especificado'), '', 'Tiempo estimado (h):', datos_ot.get('tiempo_estimado', 'No especificado'), ''],
                ['Etapa:', datos_ot.get('etapa', 'Pendiente'), '', '', '', '']
            ]
            
            detalles_table = Table(detalles_data, colWidths=[3*cm, 3.5*cm, 0.5*cm, 3*cm, 3.5*cm, 3.5*cm])
            detalles_table.setStyle(TableStyle([
                # Fusionar celdas para campos que ocupan más espacio
                ('SPAN', (1, 0), (2, 0)),  # Categoría
                ('SPAN', (4, 0), (5, 0)),  # Subcategoría
                ('SPAN', (1, 1), (2, 1)),  # Zona
                ('SPAN', (4, 1), (5, 1)),  # Ciudad
                ('SPAN', (1, 2), (2, 2)),  # Prioridad
                ('SPAN', (4, 2), (5, 2)),  # Tipo solicitud
                ('SPAN', (1, 3), (2, 3)),  # Tipo mantenimiento
                ('SPAN', (4, 3), (5, 3)),  # Tiempo estimado
                ('SPAN', (1, 4), (5, 4)),  # Etapa
                
                # Estilos
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (3, 0), (3, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                
                # Bordes
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            
            elements.append(detalles_table)
            elements.append(Spacer(1, 10))
            
            # 5. ASIGNACIÓN (Fila 17) - Sección header
            asignacion_header = Table([['Asignación']], colWidths=[17*cm])
            asignacion_header.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (0, 0), 12),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(asignacion_header)
            elements.append(Spacer(1, 5))
            
            # 6. DETALLES DE ASIGNACIÓN (Filas 19-20)
            asignacion_data = [
                ['Técnico asignado:', datos_ot.get('tecnico_asignado', 'Sin asignar'), '', 'Fecha de visita:', datos_ot.get('fecha_visita', 'Por programar'), ''],
                ['Solicitante:', datos_ot.get('solicitante', 'No especificado'), '', 'Contacto solicitante:', datos_ot.get('contacto_solicitante', 'Sin contacto'), '']
            ]
            
            asignacion_table = Table(asignacion_data, colWidths=[3*cm, 3.5*cm, 0.5*cm, 3*cm, 3.5*cm, 3.5*cm])
            asignacion_table.setStyle(TableStyle([
                # Fusionar celdas
                ('SPAN', (1, 0), (2, 0)),  # Técnico asignado
                ('SPAN', (4, 0), (5, 0)),  # Fecha de visita
                ('SPAN', (1, 1), (2, 1)),  # Solicitante
                ('SPAN', (4, 1), (5, 1)),  # Contacto
                
                # Estilos
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (3, 0), (3, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                
                # Bordes
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            
            elements.append(asignacion_table)
            elements.append(Spacer(1, 10))
            
            # 7. DESCRIPCIÓN (Fila 22) - Sección header
            descripcion_header = Table([['Descripción']], colWidths=[17*cm])
            descripcion_header.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (0, 0), 12),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(descripcion_header)
            elements.append(Spacer(1, 5))
            
            # 8. ÁREA DE DESCRIPCIÓN (Filas 24-27) - Espacio fusionado grande
            descripcion_text = datos_ot.get('descripcion', 'Sin descripción disponible')
            descripcion_area = Table([[descripcion_text]], colWidths=[17*cm], rowHeights=[4*cm])
            descripcion_area.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica'),
                ('FONTSIZE', (0, 0), (0, 0), 10),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('VALIGN', (0, 0), (0, 0), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('TOPPADDING', (0, 0), (0, 0), 10),
                ('LEFTPADDING', (0, 0), (0, 0), 10),
            ]))
            elements.append(descripcion_area)
            elements.append(Spacer(1, 10))
            
            # 9. IMAGEN ORIGINAL DE LA SOLICITUD (Fila 29)
            imagen_header = Table([['Imagen Original de la Solicitud']], colWidths=[17*cm])
            imagen_header.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (0, 0), 12),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(imagen_header)
            elements.append(Spacer(1, 5))
            
            # Espacio para imagen (Fila 31)
            imagen_area = Table([['[Espacio para imagen original]']], colWidths=[17*cm], rowHeights=[2*cm])
            imagen_area.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica'),
                ('FONTSIZE', (0, 0), (0, 0), 10),
                ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('TEXTCOLOR', (0, 0), (0, 0), colors.grey),
            ]))
            elements.append(imagen_area)
            elements.append(Spacer(1, 10))
            
            # 10. NOTAS DEL TÉCNICO (Fila 33)
            notas_header = Table([['Notas del Técnico']], colWidths=[17*cm])
            notas_header.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (0, 0), 12),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(notas_header)
            elements.append(Spacer(1, 5))
            
            # Área de notas (Filas 35-37)
            notas_area = Table([['[Espacio para notas del técnico]']], colWidths=[17*cm], rowHeights=[3*cm])
            notas_area.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica'),
                ('FONTSIZE', (0, 0), (0, 0), 10),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('VALIGN', (0, 0), (0, 0), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('TOPPADDING', (0, 0), (0, 0), 10),
                ('LEFTPADDING', (0, 0), (0, 0), 10),
            ]))
            elements.append(notas_area)
            elements.append(Spacer(1, 10))
            
            # 11. ARCHIVOS ADJUNTOS (Fila 39)
            archivos_header = Table([['Archivos Adjuntos']], colWidths=[17*cm])
            archivos_header.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (0, 0), 12),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(archivos_header)
            elements.append(Spacer(1, 5))
            
            # Área de archivos (Filas 41-42)
            archivos_area = Table([['[Lista de archivos adjuntos]']], colWidths=[17*cm], rowHeights=[2*cm])
            archivos_area.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica'),
                ('FONTSIZE', (0, 0), (0, 0), 10),
                ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('TEXTCOLOR', (0, 0), (0, 0), colors.grey),
            ]))
            elements.append(archivos_area)
            elements.append(Spacer(1, 10))
            
            # 12. FIRMAS DE CONFORMIDAD (Filas 44-50)
            firmas_header = Table([['Firmas de Conformidad']], colWidths=[17*cm])
            firmas_header.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (0, 0), 12),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(firmas_header)
            elements.append(Spacer(1, 5))
            
            # Tabla de firmas (replicando estructura Excel)
            firmas_data = [
                ['Nombre del Técnico', '', '', 'Nombre del Cliente', ''],
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['Firma del Técnico', '', '', 'Firma del Cliente', '']
            ]
            
            tabla_firmas = Table(firmas_data, colWidths=[4*cm, 4*cm, 1*cm, 4*cm, 4*cm], rowHeights=[1*cm, 2*cm, 2*cm, 1*cm])
            tabla_firmas.setStyle(TableStyle([
                # Fusionar celdas según Excel
                ('SPAN', (0, 0), (1, 0)),  # Nombre del Técnico
                ('SPAN', (3, 0), (4, 0)),  # Nombre del Cliente
                ('SPAN', (0, 1), (1, 2)),  # Área firma técnico
                ('SPAN', (3, 1), (4, 2)),  # Área firma cliente
                ('SPAN', (0, 3), (1, 3)),  # Firma del Técnico
                ('SPAN', (3, 3), (4, 3)),  # Firma del Cliente
                
                # Estilos
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ROWBACKGROUNDS', (0, 0), (-1, 0), [colors.HexColor('#F0F8FF')]),
                ('ROWBACKGROUNDS', (0, 3), (-1, 3), [colors.HexColor('#F0F8FF')])
            ]))
            
            elements.append(tabla_firmas)
            
            # Generar el PDF
            doc.build(elements)
            
            logger.info(f"✅ PDF generado exitosamente para OT {folio}")
            return pdf_buffer
            
        except Exception as e:
            logger.error(f"❌ Error generando PDF para OT {folio}: {str(e)}")
            raise
    
    def _get_table_style(self):
        """Estilo estándar para tablas"""
        return TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F0F8FF')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ])
    
    def cargar_template_excel(self) -> Optional[openpyxl.Workbook]:
        """
        Cargar el template Excel (para referencia futura si se necesita)
        """
        try:
            if not self.template_path.exists():
                logger.warning(f"⚠️ Template Excel no encontrado: {self.template_path}")
                return None
            
            workbook = openpyxl.load_workbook(self.template_path)
            logger.info(f"📊 Template Excel cargado: {self.template_path}")
            return workbook
            
        except Exception as e:
            logger.error(f"❌ Error cargando template Excel: {str(e)}")
            return None
"""
Servicio para generar PDFs de órdenes de trabajo con diseño profesional
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from datetime import datetime
import io
import os

class PDFGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Configurar estilos personalizados para el PDF"""
        # Estilo para el título principal
        self.styles.add(ParagraphStyle(
            name='MainTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2E86AB'),
            fontName='Helvetica-Bold'
        ))
        
        # Estilo para subtítulos
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            spaceBefore=15,
            alignment=TA_LEFT,
            textColor=colors.HexColor('#1A5B7A'),
            fontName='Helvetica-Bold',
            borderWidth=1,
            borderColor=colors.HexColor('#E8F4F8'),
            backColor=colors.HexColor('#F0F8FF'),
            leftIndent=10,
            rightIndent=10,
            topPadding=5,
            bottomPadding=5
        ))
        
        # Estilo para información general
        self.styles.add(ParagraphStyle(
            name='InfoText',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_LEFT,
            fontName='Helvetica',
            spaceAfter=6
        ))
        
        # Estilo para valores importantes
        self.styles.add(ParagraphStyle(
            name='ValueText',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#2E86AB'),
            spaceAfter=6
        ))

    def create_header(self, canvas, doc, title="REPORTE DE ÓRDENES DE TRABAJO"):
        """Crear encabezado del documento"""
        canvas.saveState()
        
        # Fondo del header
        canvas.setFillColor(colors.HexColor('#2E86AB'))
        canvas.rect(0, doc.height + doc.topMargin - 80, doc.width + doc.leftMargin + doc.rightMargin, 80, fill=True)
        
        # Logo (si existe)
        logo_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'frontend', 'public', 'images', 'logo.png')
        if os.path.exists(logo_path):
            try:
                canvas.drawImage(logo_path, doc.leftMargin, doc.height + doc.topMargin - 70, width=60, height=50, preserveAspectRatio=True)
            except:
                pass
        
        # Título del documento
        canvas.setFillColor(colors.white)
        canvas.setFont('Helvetica-Bold', 16)
        canvas.drawString(doc.leftMargin + 80, doc.height + doc.topMargin - 35, title)
        
        # Fecha de generación
        canvas.setFont('Helvetica', 10)
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")
        canvas.drawString(doc.leftMargin + 80, doc.height + doc.topMargin - 55, f"Generado el: {fecha_actual}")
        
        canvas.restoreState()

    def create_footer(self, canvas, doc):
        """Crear pie de página del documento"""
        canvas.saveState()
        
        # Línea decorativa
        canvas.setStrokeColor(colors.HexColor('#2E86AB'))
        canvas.setLineWidth(2)
        canvas.line(doc.leftMargin, 50, doc.width + doc.leftMargin, 50)
        
        # Información del pie de página
        canvas.setFillColor(colors.HexColor('#666666'))
        canvas.setFont('Helvetica', 8)
        canvas.drawString(doc.leftMargin, 35, "Sistema de Gestión de Mantenimiento - Café Quindío")
        
        # Número de página
        canvas.drawRightString(doc.width + doc.leftMargin, 35, f"Página {doc.page}")
        
        canvas.restoreState()

    def generate_ots_report(self, ots_data, filtros=None):
        """Generar reporte PDF de órdenes de trabajo"""
        buffer = io.BytesIO()
        
        # Configurar el documento
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=3*cm,
            bottomMargin=2.5*cm
        )
        
        # Lista para almacenar los elementos del PDF
        story = []
        
        # Título principal
        titulo = Paragraph("REPORTE DE ÓRDENES DE TRABAJO", self.styles['MainTitle'])
        story.append(titulo)
        story.append(Spacer(1, 20))
        
        # Información de filtros aplicados
        if filtros:
            filtros_info = self.create_filters_section(filtros)
            story.extend(filtros_info)
        
        # Estadísticas generales
        estadisticas = self.create_statistics_section(ots_data)
        story.extend(estadisticas)
        
        # Tabla de órdenes de trabajo
        tabla_ots = self.create_ots_table(ots_data)
        story.append(tabla_ots)
        
        # Generar el PDF con header y footer personalizados
        def add_page_decorations(canvas, doc):
            self.create_header(canvas, doc)
            self.create_footer(canvas, doc)
        
        doc.build(story, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
        
        # Retornar el buffer
        buffer.seek(0)
        return buffer

    def create_filters_section(self, filtros):
        """Crear sección de filtros aplicados"""
        elements = []
        
        # Título de la sección
        titulo_filtros = Paragraph("FILTROS APLICADOS", self.styles['SectionTitle'])
        elements.append(titulo_filtros)
        
        # Crear tabla de filtros
        data_filtros = []
        
        if filtros.get('fecha_desde') or filtros.get('fecha_hasta'):
            fecha_texto = f"Desde: {filtros.get('fecha_desde', 'No especificado')} - Hasta: {filtros.get('fecha_hasta', 'No especificado')}"
            data_filtros.append(['Rango de Fechas:', fecha_texto])
        
        if filtros.get('busqueda'):
            data_filtros.append(['Término de Búsqueda:', filtros.get('busqueda')])
        
        if filtros.get('etapa'):
            data_filtros.append(['Etapa:', filtros.get('etapa')])
        
        if filtros.get('tecnico'):
            data_filtros.append(['Técnico:', filtros.get('tecnico')])
        
        if data_filtros:
            tabla_filtros = Table(data_filtros, colWidths=[4*cm, 12*cm])
            tabla_filtros.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F0F8FF')),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2E86AB')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E8F4F8')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(tabla_filtros)
        else:
            elements.append(Paragraph("No se aplicaron filtros específicos", self.styles['InfoText']))
        
        elements.append(Spacer(1, 20))
        return elements

    def create_statistics_section(self, ots_data):
        """Crear sección de estadísticas"""
        elements = []
        
        # Título de la sección
        titulo_stats = Paragraph("RESUMEN ESTADÍSTICO", self.styles['SectionTitle'])
        elements.append(titulo_stats)
        
        # Calcular estadísticas
        total_ots = len(ots_data)
        
        # Contar por etapas
        etapas_count = {}
        categorias_count = {}
        tecnicos_count = {}
        
        for ot in ots_data:
            # Contar etapas
            etapa = ot.get('etapa', 'Sin etapa')
            etapas_count[etapa] = etapas_count.get(etapa, 0) + 1
            
            # Contar categorías
            categoria = ot.get('categoria', 'Sin categoría')
            categorias_count[categoria] = categorias_count.get(categoria, 0) + 1
            
            # Contar técnicos
            tecnico = ot.get('tecnico_asignado', 'Sin asignar')
            tecnicos_count[tecnico] = tecnicos_count.get(tecnico, 0) + 1
        
        # Crear tabla de estadísticas generales
        data_stats = [
            ['Total de Órdenes de Trabajo:', str(total_ots)],
            ['Etapas Diferentes:', str(len(etapas_count))],
            ['Categorías Diferentes:', str(len(categorias_count))],
            ['Técnicos Asignados:', str(len(tecnicos_count))]
        ]
        
        tabla_stats = Table(data_stats, colWidths=[8*cm, 4*cm])
        tabla_stats.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F0F8FF')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2E86AB')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E8F4F8')),
            ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#E8F4F8')),
        ]))
        
        elements.append(tabla_stats)
        elements.append(Spacer(1, 20))
        
        return elements

    def create_ots_table(self, ots_data):
        """Crear tabla principal de órdenes de trabajo"""
        # Encabezados de la tabla
        headers = [
            'Folio', 'Fecha', 'Asunto', 'Categoría', 
            'Ciudad', 'Tienda', 'Técnico', 'Etapa'
        ]
        
        # Preparar datos de la tabla
        data = [headers]
        
        for ot in ots_data:
            fila = [
                str(ot.get('folio', '')),
                str(ot.get('fecha', ot.get('fecha_creacion', ''))),
                str(ot.get('asunto', ''))[:30] + '...' if len(str(ot.get('asunto', ''))) > 30 else str(ot.get('asunto', '')),
                str(ot.get('categoria', '')),
                str(ot.get('ciudad', '')),
                str(ot.get('tienda', ''))[:20] + '...' if len(str(ot.get('tienda', ''))) > 20 else str(ot.get('tienda', '')),
                str(ot.get('tecnico_asignado', ''))[:15] + '...' if len(str(ot.get('tecnico_asignado', ''))) > 15 else str(ot.get('tecnico_asignado', '')),
                str(ot.get('etapa', ''))
            ]
            data.append(fila)
        
        # Configurar anchos de columna
        col_widths = [1.5*cm, 2*cm, 4*cm, 2*cm, 2*cm, 3*cm, 2.5*cm, 2.5*cm]
        
        # Crear tabla
        tabla = Table(data, colWidths=col_widths, repeatRows=1)
        
        # Aplicar estilos a la tabla
        tabla.setStyle(TableStyle([
            # Estilo del encabezado
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E86AB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            
            # Estilo del contenido
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Bordes
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
            
            # Alternancia de colores en filas
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')]),
            
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        return tabla

    def generate_single_ot_report(self, ot_data):
        """Generar reporte PDF de una sola orden de trabajo"""
        buffer = io.BytesIO()
        
        # Configurar el documento
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=3*cm,
            bottomMargin=2.5*cm
        )
        
        story = []
        
        # Título principal
        titulo = Paragraph(f"ORDEN DE TRABAJO - {ot_data.get('folio', 'N/A')}", self.styles['MainTitle'])
        story.append(titulo)
        story.append(Spacer(1, 30))
        
        # Información general
        story.extend(self.create_ot_info_section(ot_data))
        
        # Información técnica
        story.extend(self.create_ot_technical_section(ot_data))
        
        # Historial (si existe)
        if ot_data.get('historial'):
            story.extend(self.create_ot_history_section(ot_data.get('historial')))
        
        # Generar el PDF
        def add_page_decorations(canvas, doc):
            self.create_header(canvas, doc, f"ORDEN DE TRABAJO - {ot_data.get('folio', 'N/A')}")
            self.create_footer(canvas, doc)
        
        doc.build(story, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
        
        buffer.seek(0)
        return buffer

    def create_ot_info_section(self, ot_data):
        """Crear sección de información general de la OT"""
        elements = []
        
        # Información básica
        titulo_info = Paragraph("INFORMACIÓN GENERAL", self.styles['SectionTitle'])
        elements.append(titulo_info)
        
        data_info = [
            ['Folio:', ot_data.get('folio', 'N/A')],
            ['Fecha de Creación:', ot_data.get('fecha_creacion', 'N/A')],
            ['Asunto:', ot_data.get('asunto', 'N/A')],
            ['Prioridad:', ot_data.get('prioridad', 'N/A')],
            ['Etapa Actual:', ot_data.get('etapa', 'N/A')],
        ]
        
        tabla_info = Table(data_info, colWidths=[4*cm, 12*cm])
        tabla_info.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F0F8FF')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2E86AB')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E8F4F8')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(tabla_info)
        elements.append(Spacer(1, 20))
        
        return elements

    def create_ot_technical_section(self, ot_data):
        """Crear sección técnica de la OT"""
        elements = []
        
        # Información técnica
        titulo_tecnico = Paragraph("INFORMACIÓN TÉCNICA", self.styles['SectionTitle'])
        elements.append(titulo_tecnico)
        
        data_tecnico = [
            ['Categoría:', ot_data.get('categoria', 'N/A')],
            ['Subcategoría:', ot_data.get('subcategoria', 'N/A')],
            ['Zona:', ot_data.get('zona', 'N/A')],
            ['Ciudad:', ot_data.get('ciudad', 'N/A')],
            ['Tienda:', ot_data.get('tienda', 'N/A')],
            ['Técnico Asignado:', ot_data.get('tecnico_asignado', 'N/A')],
        ]
        
        tabla_tecnico = Table(data_tecnico, colWidths=[4*cm, 12*cm])
        tabla_tecnico.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F0F8FF')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2E86AB')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E8F4F8')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(tabla_tecnico)
        elements.append(Spacer(1, 20))
        
        # Descripción del trabajo
        if ot_data.get('notas_adicionales') or ot_data.get('descripcion'):
            titulo_desc = Paragraph("DESCRIPCIÓN DEL TRABAJO", self.styles['SectionTitle'])
            elements.append(titulo_desc)
            
            descripcion = ot_data.get('notas_adicionales') or ot_data.get('descripcion', 'No se proporcionó descripción')
            desc_paragraph = Paragraph(descripcion, self.styles['InfoText'])
            elements.append(desc_paragraph)
            elements.append(Spacer(1, 20))
        
        return elements

    def create_ot_history_section(self, historial):
        """Crear sección de historial de la OT"""
        elements = []
        
        titulo_historial = Paragraph("HISTORIAL DE CAMBIOS", self.styles['SectionTitle'])
        elements.append(titulo_historial)
        
        if historial:
            headers = ['Fecha', 'Etapa Anterior', 'Etapa Nueva', 'Usuario', 'Observaciones']
            data = [headers]
            
            for cambio in historial:
                fila = [
                    cambio.get('fecha', 'N/A'),
                    cambio.get('etapa_anterior', 'N/A'),
                    cambio.get('etapa_nueva', 'N/A'),
                    cambio.get('usuario', 'N/A'),
                    cambio.get('observaciones', 'N/A')
                ]
                data.append(fila)
            
            tabla_historial = Table(data, colWidths=[3*cm, 3*cm, 3*cm, 3*cm, 4*cm])
            tabla_historial.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E86AB')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            
            elements.append(tabla_historial)
        else:
            elements.append(Paragraph("No hay historial de cambios disponible", self.styles['InfoText']))
        
        return elements

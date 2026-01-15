"""
Router B2C para FastAPI
Manejo de solicitudes B2C con archivos, validaciones y respuestas
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, and_
from typing import Optional
from datetime import datetime
import logging

from app.database import get_db
from app.models import B2CSolicitudes, User, Categoria
from app.services.email_service import send_b2c_email
from app.core.security import get_current_user
from app.services.s3_service import s3_service
from app.services.ot_automatica_service import crear_ot_automatica, debe_crear_ot_automatica
from app.schemas import B2CSolicitudResponse, B2CCancelRequest
from app.utils.model_utils import b2c_solicitud_to_dict, paginated_response
from app.utils.id_generator import obtener_siguiente_id_solicitud, generar_folio_por_tipo

# Configurar logging
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["B2C Solicitudes"],
    responses={404: {"description": "Not found"}}
)

# Extensiones permitidas para archivos
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}

def allowed_file(filename: str) -> bool:
    """Verificar si el archivo tiene una extensión permitida"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Endpoint de debug para verificar funcionalidad
@router.get("/test")
async def test_b2c_router():
    """Endpoint de prueba para verificar que el router B2C funciona"""
    return {
        "message": "B2C Router funcionando correctamente",
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            "GET /solicitudes/b2c/test - Este endpoint",
            "POST /solicitudes/b2c - Crear solicitud",
            "GET /solicitudes/b2c/id/{solicitud_id} - Obtener solicitud por ID",
            "GET /solicitudes/b2c/list - Listar solicitudes",
            "PUT /solicitudes/b2c/{solicitud_id}/cancel - Cancelar solicitud"
        ]
    }

@router.post("", status_code=201)
async def crear_solicitud_b2c(
    nombre: str = Form(...),
    correo: str = Form(...),
    asunto: str = Form(...),
    descripcion: str = Form(...),
    telefono: Optional[str] = Form(""),
    zona: Optional[str] = Form(""),
    ciudad: Optional[str] = Form(""),
    tienda: Optional[str] = Form(""),
    categoria: Optional[str] = Form(""),
    subcategoria: Optional[str] = Form(""),
    # Campos específicos para Planta San Pedro
    planta: Optional[str] = Form(""),
    activo: Optional[str] = Form(""),
    tipo_formulario: Optional[str] = Form("b2c"),
    cantidad_archivos: Optional[str] = Form("0"),
    archivo: Optional[UploadFile] = File(None),
    # Archivos múltiples para Planta San Pedro
    archivo_0: Optional[UploadFile] = File(None),
    archivo_1: Optional[UploadFile] = File(None),
    archivo_2: Optional[UploadFile] = File(None),
    archivo_3: Optional[UploadFile] = File(None),
    archivo_4: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Crear nueva solicitud B2C
    Recibe datos del formulario B2C y los guarda en la tabla b2c_solicitudes
    """
    try:
        # Validar campos obligatorios
        nombre = nombre.strip() if nombre else ""
        correo = correo.strip() if correo else ""
        asunto = asunto.strip() if asunto else ""
        descripcion = descripcion.strip() if descripcion else ""
        
        if not nombre or not correo or not asunto or not descripcion:
            logger.warning(f"❌ Campos obligatorios faltantes para solicitud B2C")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Complete todos los campos obligatorios: nombre, correo, asunto y descripción"
            )
        
        # Determinar tipo de formulario y manejar campos específicos
        is_planta_san_pedro = tipo_formulario == "planta_san_pedro"
        
        # Para formularios de Planta San Pedro, validar que se tenga planta O categoría+subcategoría
        if is_planta_san_pedro:
            tiene_planta = planta and planta.strip()
            tiene_categoria_completa = categoria and categoria.strip() and subcategoria and subcategoria.strip()
            
            if not tiene_planta and not tiene_categoria_completa:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debe seleccionar una planta O completar categoría + subcategoría para solicitudes de Planta San Pedro"
                )
        
        # Manejar archivos (B2C: archivo único, Planta San Pedro: múltiples archivos)
        archivo_nombre, archivo_url, archivo_s3_key = None, None, None
        archivos_urls = []
        
        if is_planta_san_pedro:
            # Manejar múltiples archivos para Planta San Pedro
            archivos_a_procesar = []
            for i, archivo_field in enumerate([archivo_0, archivo_1, archivo_2, archivo_3, archivo_4]):
                if archivo_field and archivo_field.filename:
                    archivos_a_procesar.append((i, archivo_field))
            
            # Validar que al menos un archivo fue subido para Planta San Pedro
            if not archivos_a_procesar:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debe subir al menos un archivo para solicitudes de Planta San Pedro"
                )
            
            # Procesar cada archivo
            for index, archivo_file in archivos_a_procesar:
                if not allowed_file(archivo_file.filename):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El archivo {archivo_file.filename} no es válido. Use: png, jpg, jpeg, gif, pdf, doc, docx"
                    )
                
                # Subir archivo a S3
                upload_result = await s3_service.upload_file_async(
                    archivo_file, 
                    folder='planta_san_pedro', 
                    prefix=f'psp_{index}'
                )
                
                if upload_result['success']:
                    archivos_urls.append({
                        'nombre': upload_result['filename'],
                        'url': upload_result['url'],
                        'key': upload_result['key']
                    })
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Error subiendo archivo {archivo_file.filename}: {upload_result['error']}"
                    )
            
            # Para compatibilidad, usar el primer archivo en el campo único
            if archivos_urls:
                archivo_nombre = archivos_urls[0]['nombre']
                archivo_url = archivos_urls[0]['url']
                archivo_s3_key = archivos_urls[0]['key']
        
        else:
            # Manejar archivo único para B2C tradicional
            if archivo and archivo.filename:
                if not allowed_file(archivo.filename):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Tipo de archivo no permitido. Use: png, jpg, jpeg, gif, pdf, doc, docx"
                    )
                
                # Subir archivo a S3
                upload_result = await s3_service.upload_file_async(archivo, folder='b2c', prefix='b2c')
                
                if upload_result['success']:
                    archivo_nombre = upload_result['filename']
                    archivo_url = upload_result['url']
                    archivo_s3_key = upload_result['key']
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Error subiendo archivo: {upload_result['error']}"
                    )
        
        # Obtener el siguiente ID consecutivo global
        siguiente_id = obtener_siguiente_id_solicitud(db)
        
        # Crear nueva solicitud con ID específico
        if is_planta_san_pedro:
            # Para Planta San Pedro, manejar categoría/subcategoría de forma segura
            # (pueden ser None si el usuario seleccionó solo Planta)
            categoria_valor = categoria.strip() if categoria and categoria.strip() else "Sin especificar"
            subcategoria_valor = subcategoria.strip() if subcategoria and subcategoria.strip() else "Sin especificar"
            
            # Para Planta San Pedro, usar las columnas específicas
            nueva_solicitud = B2CSolicitudes(
                id=siguiente_id,  # Usar ID consecutivo global
                nombre=nombre,
                correo=correo,
                telefono=telefono.strip() if telefono else None,
                asunto=asunto,
                descripcion=descripcion,
                zona="Planta San Pedro",  # Campo fijo para identificar el tipo
                ciudad="N/A",  # Planta San Pedro no usa ciudad tradicional
                tienda="N/A",  # Planta San Pedro no usa tienda tradicional
                categoria=categoria_valor,
                subcategoria=subcategoria_valor,
                # Campos específicos de Planta San Pedro
                planta=planta.strip() if planta else None,
                activo=activo.strip() if activo else None,
                archivo_nombre=archivo_nombre,
                archivo_url=archivo_url,
                archivo_s3_key=archivo_s3_key,
                estado='pendiente',
                fecha_creacion=datetime.now(),
                tipo_formulario='planta_san_pedro'
            )
        else:
            # Para B2C tradicional
            nueva_solicitud = B2CSolicitudes(
                id=siguiente_id,  # Usar ID consecutivo global
                nombre=nombre,
                correo=correo,
                telefono=telefono.strip() if telefono else None,
                asunto=asunto,
                descripcion=descripcion,
                zona=zona.strip() if zona else "Sin especificar",
                ciudad=ciudad.strip() if ciudad else "Sin especificar",
                tienda=tienda.strip() if tienda else "Sin especificar",
                categoria=categoria.strip() if categoria else "Sin especificar",
                subcategoria=subcategoria.strip() if subcategoria else "Sin especificar",
                archivo_nombre=archivo_nombre,
                archivo_url=archivo_url,
                archivo_s3_key=archivo_s3_key,
                estado='pendiente',
                fecha_creacion=datetime.now(),
                tipo_formulario='b2c'
            )
        
        # Guardar en base de datos
        db.add(nueva_solicitud)
        db.commit()
        db.refresh(nueva_solicitud)
        
        # 🚀 ASIGNACIÓN AUTOMÁTICA POR CATEGORÍA Y ZONA
        from app.services.asignacion_service import asignar_solicitud_por_categoria
        
        administrador_asignado = None
        ot_creada = None
        
        try:
            # Asignar por categoría (ahora acepta zona y tienda como parámetros)
            zona_solicitud = zona if zona else None
            tienda_solicitud = tienda if tienda else None
            
            administrador_asignado = asignar_solicitud_por_categoria(
                categoria, 
                db, 
                zona=zona_solicitud,
                tienda=tienda_solicitud
            )
            
            if administrador_asignado:
                nueva_solicitud.asignado_a = administrador_asignado.id
                nueva_solicitud.estado = 'en_proceso'  # Cambiar estado cuando se asigna
                db.commit()
                logger.info(f"✅ Solicitud {nueva_solicitud.id} asignada automáticamente a {administrador_asignado.nombre} (Área: {administrador_asignado.area})")
                
                # 🔧 CREACIÓN AUTOMÁTICA DE OT (solo para zonas específicas)
                if debe_crear_ot_automatica(zona_solicitud):
                    logger.info(f"🔧 Zona '{zona_solicitud}' requiere creación automática de OT")
                    
                    try:
                        exito_ot, ot_creada, error_ot = crear_ot_automatica(
                            solicitud_id=nueva_solicitud.id,
                            tecnico_id=administrador_asignado.id,
                            db=db
                        )
                        
                        if exito_ot and ot_creada:
                            logger.info(f"✅ OT {ot_creada.folio} creada automáticamente para solicitud {nueva_solicitud.id}")
                        elif error_ot:
                            logger.error(f"❌ Error al crear OT automática: {error_ot}")
                    
                    except Exception as ot_error:
                        logger.error(f"❌ Excepción al crear OT automática: {ot_error}", exc_info=True)
                        # No fallar toda la operación por un error de OT
            else:
                # ⚠️ ASIGNACIÓN MANUAL: No se asignó automáticamente (ej: categorías TIC)
                # La solicitud queda en estado 'nueva' para asignación manual posterior
                logger.info(f"ℹ️ Solicitud {nueva_solicitud.id} requiere asignación MANUAL (categoría: {categoria})")
                # NO cambiar el estado - se queda en 'nueva' para que aparezca en panel de asignación
        
        except Exception as asign_error:
            logger.error(f"❌ Error en asignación automática: {asign_error}", exc_info=True)
            # No fallar toda la operación por un error de asignación
        
        # Generar folio usando la función utilitaria
        tipo_solicitud = "PLANTA" if is_planta_san_pedro else "B2C"
        folio_dinamico = generar_folio_por_tipo(tipo_solicitud, nueva_solicitud.id)
        
        # Enviar correo de confirmación
        email_result = {'success': False, 'message': 'Correo no enviado - configuración pendiente'}
        try:
            email_result = send_b2c_email(correo, nombre, asunto, folio_dinamico)
        except Exception as email_error:
            logger.error(f"Error en servicio de correo para {correo}: {str(email_error)}")

        # Respuesta exitosa
        message = 'Solicitud guardada exitosamente'
        if not email_result['success']:
            message += ' (Nota: hubo un problema enviando el correo de confirmación)'
        
        # Obtener información de asignación para la respuesta
        asignado_info = None
        ot_info = None
        
        if nueva_solicitud.asignado_a:
            admin_asignado = db.query(User).filter(User.id == nueva_solicitud.asignado_a).first()
            if admin_asignado:
                asignado_info = {
                    'nombre': admin_asignado.nombre,
                    'area': admin_asignado.area,
                    'email': admin_asignado.email
                }
                message += f' y asignada automáticamente al área de {admin_asignado.area}'
        
        # Si se creó OT, incluir información
        if ot_creada:
            ot_info = {
                'folio': str(ot_creada.folio),
                'etapa': ot_creada.etapa,
                'prioridad': ot_creada.prioridad,
                'tecnico_asignado': ot_creada.tecnico_asignado
            }
            message += f'. OT {ot_creada.folio} creada automáticamente'
        
        return {
            'success': True,
            'message': message,
            'data': {
                'id': nueva_solicitud.id,
                'folio': folio_dinamico,
                'email_sent': email_result['success'],
                'email_message': email_result['message'],
                'asignado_a': asignado_info,
                'ot_creada': ot_info
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al crear solicitud B2C: {type(e).__name__}: {str(e)}")
        # El rollback ya lo maneja el dependency get_db(), no hacer doble rollback
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar la solicitud: {str(e)}"
        )

@router.get("")
async def listar_solicitudes_b2c(
    page: int = 1,
    per_page: int = 0,  # 0 significa traer todas las solicitudes
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener solicitudes B2C filtradas por área del usuario
    - Usuarios del área TIC: Solo ven solicitudes asignadas a TIC
    - Usuarios del área Mantenimiento: Solo ven solicitudes asignadas a Mantenimiento  
    - Administradores: Ven todas las solicitudes
    """
    try:
        logger.info(f"🔍 Usuario {current_user.nombre} ({current_user.area}) solicitando lista de solicitudes")
        
        # Query base ordenado por fecha (más recientes primero)
        query = db.query(B2CSolicitudes).order_by(B2CSolicitudes.fecha_creacion.desc())
        
        # 🎯 FILTRADO POR ÁREA DEL USUARIO - CORREGIDO
        if current_user.area and current_user.area.upper() == "TIC":
            # Usuario del área TIC: Solicitudes asignadas a usuarios TIC + solicitudes TIC sin asignar
            logger.info("🔧 Filtrando solicitudes para área TIC (incluye sin asignar)")
            
            # Obtener categorías con código TIC
            categorias_tic = db.query(Categoria.nombre).filter(Categoria.codigo == 'TIC').all()
            nombres_cat_tic = [cat.nombre for cat in categorias_tic]
            
            # Obtener IDs de usuarios TIC
            subquery_tic_users = db.query(User.id).filter(User.area.ilike('%TIC%')).subquery()
            
            # Filtrar: (asignadas a usuarios TIC) O (categoría TIC sin asignar)
            query = query.filter(
                or_(
                    B2CSolicitudes.asignado_a.in_(subquery_tic_users),
                    and_(
                        B2CSolicitudes.categoria.in_(nombres_cat_tic),
                        B2CSolicitudes.asignado_a.is_(None)
                    )
                )
            )
                         
        elif current_user.area and current_user.area.upper() == "MANTENIMIENTO":
            # Usuario del área Mantenimiento: Solo solicitudes asignadas a usuarios de Mantenimiento
            logger.info("🔨 Filtrando solicitudes para área Mantenimiento") 
            subquery_mant_users = db.query(User.id).filter(User.area.ilike('%Mantenimiento%')).subquery()
            query = query.filter(B2CSolicitudes.asignado_a.in_(subquery_mant_users))
        else:
            # Otros usuarios (admin general): Ven todas las solicitudes
            logger.info("👑 Usuario administrador - Ver todas las solicitudes")
            pass
        
        # Obtener total de registros
        total = query.count()
        
        if per_page == 0:
            # Traer todas las solicitudes sin paginación
            solicitudes = query.all()
            pages = 1
            current_page = 1
            actual_per_page = total
        else:
            # Aplicar paginación
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 20
            
            offset = (page - 1) * per_page
            solicitudes = query.offset(offset).limit(per_page).all()
            pages = (total + per_page - 1) // per_page
            current_page = page
            actual_per_page = per_page

        # Convertir a formato JSON con URLs de FastAPI
        solicitudes_json = [b2c_solicitud_to_dict(sol, include_full_url=True, base_url="http://localhost:8001") for sol in solicitudes]
        
        logger.info(f"✅ Usuario {current_user.nombre} ({current_user.area}) - Devolviendo {total} solicitudes filtradas")
        
        return {
            'success': True,
            'data': solicitudes_json,
            'total': total,
            'page': current_page,
            'per_page': actual_per_page,
            'pages': pages,
            'showing_all': per_page == 0,
            'filtered_by_area': current_user.area
        }
        
    except Exception as e:
        logger.error(f'Error al obtener solicitudes B2C: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/folio/{folio}")
async def obtener_solicitud_por_folio(
    folio: str,
    db: Session = Depends(get_db)
):
    """
    Obtiene una solicitud B2C específica por su folio
    El folio tiene formato B2C-00001 donde 00001 es el ID
    """
    try:
        logger.info(f"🔍 Buscando solicitud B2C con folio: {folio}")
        
        solicitud = None
        
        # Extraer ID del formato folio B2C-00001
        if folio.startswith('B2C-') and len(folio) > 4:
            try:
                folio_id = int(folio[4:])  # Extraer parte numérica después de "B2C-"
                solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == folio_id).first()
                logger.info(f"🔍 Buscando B2C por ID extraído del folio: {folio_id}")
            except ValueError:
                logger.warning(f"⚠️ No se pudo extraer ID del folio: {folio}")
        else:
            # Si folio es solo numérico, buscar directamente por ID
            try:
                folio_id = int(folio)
                solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == folio_id).first()
                logger.info(f"🔍 Buscando por ID numérico: {folio_id}")
            except ValueError:
                logger.warning(f"⚠️ Folio '{folio}' no tiene formato válido (B2C-##### o numérico)")
        
        if not solicitud:
            logger.warning(f"❌ Solicitud B2C con folio {folio} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'No se encontró la solicitud con folio {folio}'
            )

        # Usar la función helper para convertir a diccionario
        solicitud_data = b2c_solicitud_to_dict(solicitud, include_full_url=True, base_url="http://localhost:8001")
        
        logger.info(f"✅ Solicitud B2C con folio {folio} encontrada exitosamente")
        return {
            'success': True,
            'data': solicitud_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'❌ Error al obtener solicitud por folio {folio}: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/id/{solicitud_id}")
async def obtener_solicitud_por_id(
    solicitud_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene una solicitud B2C específica por su ID
    Solo permite ver solicitudes del área del usuario
    """
    try:
        logger.info(f"Buscando solicitud B2C con ID: {solicitud_id}")
        solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == solicitud_id).first()
        
        if not solicitud:
            logger.warning(f"Solicitud B2C con ID {solicitud_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'No se encontró la solicitud con ID {solicitud_id}'
            )

        # 🎯 VALIDAR ACCESO POR ÁREA
        if solicitud.asignado_a:
            usuario_asignado = db.query(User).filter(User.id == solicitud.asignado_a).first()
            if usuario_asignado and current_user.area:
                # Si el usuario actual es TIC, solo puede ver solicitudes asignadas a TIC
                if current_user.area.upper() == "TIC" and not (usuario_asignado.area and "TIC" in usuario_asignado.area.upper()):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes permisos para ver esta solicitud"
                    )
                # Si el usuario actual es Mantenimiento, solo puede ver solicitudes asignadas a Mantenimiento
                elif current_user.area.upper() == "MANTENIMIENTO" and not (usuario_asignado.area and "MANTENIMIENTO" in usuario_asignado.area.upper()):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes permisos para ver esta solicitud"
                    )

        # Usar la función helper para convertir a diccionario
        solicitud_data = b2c_solicitud_to_dict(solicitud, include_full_url=True, base_url="http://localhost:8001")
        
        logger.info(f"Solicitud B2C {solicitud_id} encontrada exitosamente")
        return {
            'success': True,
            'data': solicitud_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error al obtener solicitud por ID {solicitud_id}: {str(e)}', exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/{folio_o_id}")
async def obtener_solicitud_generica(
    folio_o_id: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint genérico que maneja tanto folio (B2C-00001) como ID (18)
    Compatible con las peticiones del frontend
    """
    try:
        logger.info(f"🔍 Buscando solicitud B2C con folio_o_id: {folio_o_id}")
        
        solicitud = None
        
        # Si empieza con "B2C-", es un folio sintético
        if folio_o_id.startswith('B2C-') and len(folio_o_id) > 4:
            try:
                solicitud_id = int(folio_o_id[4:])  # Extraer ID del folio
                solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == solicitud_id).first()
                logger.info(f"🔍 Búsqueda por folio - ID extraído: {solicitud_id}")
            except ValueError:
                logger.warning(f"⚠️ No se pudo extraer ID del folio: {folio_o_id}")
        else:
            # Si es numérico, buscar directamente por ID
            try:
                solicitud_id = int(folio_o_id)
                solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == solicitud_id).first()
                logger.info(f"🔍 Búsqueda por ID: {solicitud_id}")
            except ValueError:
                logger.warning(f"⚠️ folio_o_id '{folio_o_id}' no es válido")
        
        if not solicitud:
            # Si no se encuentra en B2C, buscar en solicitudes B2B
            try:
                solicitud_id = int(folio_o_id)
                logger.info(f"🔍 No encontrada en B2C, buscando en B2B con ID: {solicitud_id}")
                
                # Importar modelo B2B aquí para evitar circular imports
                from ..models import B2BSolicitud
                
                solicitud_b2b = db.query(B2BSolicitud).options(
                    selectinload(B2BSolicitud.ciudad),
                    selectinload(B2BSolicitud.razon_social),
                    selectinload(B2BSolicitud.sucursal),
                    selectinload(B2BSolicitud.categoria),
                    selectinload(B2BSolicitud.subcategoria),
                    selectinload(B2BSolicitud.equipo)
                ).filter(B2BSolicitud.id == solicitud_id).first()
                
                if solicitud_b2b:
                    logger.info(f"✅ Solicitud B2B encontrada con ID: {solicitud_id}")
                    
                    # Convertir solicitud B2B a formato compatible con frontend
                    solicitud_data = {
                        'id': solicitud_b2b.id,
                        'nombre': solicitud_b2b.nombre,
                        'correo': solicitud_b2b.correo,
                        'telefono': solicitud_b2b.telefono,
                        'asunto': 'Solicitud B2B',  # Las B2B no tienen asunto específico
                        'descripcion': solicitud_b2b.descripcion,
                        'zona': 'Comercial B2B',
                        'ciudad': solicitud_b2b.ciudad.nombre if solicitud_b2b.ciudad else 'N/A',
                        'tienda': f"{solicitud_b2b.razon_social.nombre if solicitud_b2b.razon_social else 'N/A'} - {solicitud_b2b.sucursal.nombre if solicitud_b2b.sucursal else 'N/A'}",
                        'categoria': solicitud_b2b.categoria.nombre if solicitud_b2b.categoria else 'N/A',
                        'subcategoria': solicitud_b2b.subcategoria.nombre if solicitud_b2b.subcategoria else 'N/A',
                        'equipo': solicitud_b2b.equipo.nombre if solicitud_b2b.equipo else 'N/A',
                        'archivo_nombre': solicitud_b2b.archivo_nombre,
                        'archivo_url': solicitud_b2b.archivo_url,
                        'estado': solicitud_b2b.estado,
                        'motivo_cancelacion': solicitud_b2b.motivo_cancelacion,
                        'fecha_creacion': solicitud_b2b.fecha_creacion.isoformat() if solicitud_b2b.fecha_creacion else None,
                        'fecha_actualizacion': solicitud_b2b.fecha_actualizacion.isoformat() if solicitud_b2b.fecha_actualizacion else None,
                        'tipo_solicitud': 'B2B'  # Identificador para el frontend
                    }
                    
                    return {
                        'success': True,
                        'data': solicitud_data
                    }
                    
            except ValueError:
                pass  # folio_o_id no es numérico, continuar con error original
            
            logger.warning(f"❌ Solicitud con folio_o_id {folio_o_id} no encontrada en B2C ni B2B")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'No se encontró la solicitud con identificador {folio_o_id}'
            )

        # Usar la función helper para convertir a diccionario (B2C)
        solicitud_data = b2c_solicitud_to_dict(solicitud, include_full_url=True, base_url="http://localhost:8001")
        solicitud_data['tipo_solicitud'] = 'B2C'  # Identificador para el frontend
        
        logger.info(f"✅ Solicitud B2C con folio_o_id {folio_o_id} encontrada exitosamente")
        return {
            'success': True,
            'data': solicitud_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'❌ Error al obtener solicitud por folio_o_id {folio_o_id}: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.put("/id/{solicitud_id}/cancelar", response_model=B2CSolicitudResponse)
async def cancelar_solicitud_b2c(
    solicitud_id: int,
    cancel_data: B2CCancelRequest,
    db: Session = Depends(get_db)
):
    """
    Cancela una solicitud B2C específica y guarda el motivo de cancelación
    """
    try:
        motivo_cancelacion = cancel_data.motivo_cancelacion.strip() if cancel_data.motivo_cancelacion else ""
        if not motivo_cancelacion:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='El motivo de cancelación es obligatorio'
            )

        solicitud = db.query(B2CSolicitudes).filter(B2CSolicitudes.id == solicitud_id).first()
        
        if not solicitud:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'No se encontró la solicitud con ID {solicitud_id}'
            )

        if solicitud.estado == 'cancelada':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='La solicitud ya está cancelada'
            )
        
        if solicitud.estado == 'completada':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='No se puede cancelar una solicitud completada'
            )

        solicitud.estado = 'cancelada'
        solicitud.motivo_cancelacion = motivo_cancelacion
        solicitud.fecha_actualizacion = datetime.now()

        db.commit()
        db.refresh(solicitud)

        return {
            'success': True,
            'message': 'Solicitud cancelada exitosamente',
            'data': solicitud.to_dict(include_full_url=True, base_url="http://localhost:8001")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Rollback en caso de cualquier error
        db.rollback()
        logger.error(f'Error al cancelar solicitud B2C {solicitud_id}: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/admin/areas")
async def listar_administradores_por_areas(db: Session = Depends(get_db)):
    """
    Lista todos los administradores agrupados por área
    Útil para debugging y gestión de asignaciones
    """
    try:
        from app.services.asignacion_service import listar_administradores_por_area
        
        areas = listar_administradores_por_area(db)
        
        return {
            'success': True,
            'message': f'Se encontraron {len(areas)} áreas con administradores',
            'data': areas
        }
        
    except Exception as e:
        logger.error(f"❌ Error listando administradores por área: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener administradores"
        )

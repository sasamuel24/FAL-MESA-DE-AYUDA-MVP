"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth_context';
import { useDashboardRoute } from '@/hooks/useDashboardRoute';
import { 
  User, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  CheckCircle, 
  AlertTriangle,
  LogOut,
  ArrowLeft,
  Shield,
  Mail,
  UserCog
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

// Tipos
interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'tecnico';
  area: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface FormUsuario {
  nombre: string;
  email: string;
  rol: 'admin' | 'tecnico';
  area: string;
  password: string;
}

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_API_URL || 'https://b4phy0y28i.execute-api.us-east-2.amazonaws.com/v1';

export default function AjustesPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { dashboardRoute } = useDashboardRoute();
  const [isClient, setIsClient] = useState(false);

  // Estados de datos
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Estados de modal
  const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);

  // Estados de formulario
  const [formUsuario, setFormUsuario] = useState<FormUsuario>({
    nombre: '',
    email: '',
    rol: 'tecnico',
    area: '',
    password: ''
  });

  // Estados de UI
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [eliminandoUsuario, setEliminandoUsuario] = useState(false);
  const [usuarioGuardado, setUsuarioGuardado] = useState(false);
  const [usuarioEliminado, setUsuarioEliminado] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    setIsClient(true);
    if (user?.rol !== 'admin') {
      router.push(dashboardRoute);
      return;
    }
    cargarUsuarios();
  }, [user, router, dashboardRoute]);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando usuarios...');
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoint = `${FASTAPI_BASE_URL}/users/`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const resultado = await response.json();
        console.log('✅ Usuarios cargados:', resultado);
        
        if (resultado.success) {
          setUsuarios(resultado.data);
        } else {
          setError('Error al cargar usuarios');
        }
      } else {
        console.error('❌ Error HTTP:', response.status);
        if (response.status === 401) {
          logout();
        }
        setError('Error de conexión al cargar usuarios');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setError('Error de red al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearUsuario = () => {
    setUsuarioEditando(null);
    setFormUsuario({
      nombre: '',
      email: '',
      rol: 'tecnico',
      area: '',
      password: ''
    });
    setMostrarModalUsuario(true);
  };

  const handleEditarUsuario = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setFormUsuario({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      area: usuario.area || '',
      password: '' // No mostrar password actual
    });
    setMostrarModalUsuario(true);
  };

  const handleGuardarUsuario = async () => {
    // Validaciones básicas
    if (!formUsuario.nombre || !formUsuario.email || !formUsuario.rol) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    if (!usuarioEditando && !formUsuario.password) {
      alert('La contraseña es obligatoria para nuevos usuarios');
      return;
    }

    setGuardandoUsuario(true);

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const requestData: any = {
        nombre: formUsuario.nombre,
        email: formUsuario.email,
        rol: formUsuario.rol,
        area: formUsuario.area || null,
        activo: true
      };

      if (!usuarioEditando) {
        // Crear nuevo usuario
        requestData.password = formUsuario.password;
      }

      // Log detallado de los datos que se van a enviar
      console.log('📤 Datos a enviar:', {
        ...requestData,
        password: requestData.password ? `[${requestData.password.length} caracteres]` : 'no incluida'
      });

      const endpoint = usuarioEditando 
        ? `${FASTAPI_BASE_URL}/users/${usuarioEditando.id}`
        : `${FASTAPI_BASE_URL}/users/`;
      
      const method = usuarioEditando ? 'PUT' : 'POST';
      
      console.log('🌐 Endpoint:', endpoint);
      console.log('🔧 Método:', method);

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const resultado = await response.json();
        console.log('✅ Usuario guardado:', resultado);
        
        if (resultado.success) {
          setGuardandoUsuario(false);
          setUsuarioGuardado(true);
          
          // Recargar lista de usuarios
          setTimeout(async () => {
            await cargarUsuarios();
            setMostrarModalUsuario(false);
            setUsuarioGuardado(false);
          }, 1500);
        } else {
          throw new Error(resultado.error || 'Error al guardar usuario');
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
          console.log('❌ Error completo del servidor:', errorData);
        } catch (parseError) {
          console.log('❌ Error al parsear respuesta del servidor');
          errorData = { error: `Error del servidor: ${response.status}` };
        }
        throw new Error(errorData.error || errorData.detail?.error || `Error del servidor: ${response.status}`);
      }
    } catch (error) {
      setGuardandoUsuario(false);
      console.error('❌ Error:', error);
      alert('Error al guardar usuario: ' + (error as Error).message);
    }
  };

  const handleEliminarUsuario = async () => {
    if (!usuarioAEliminar) return;

    setEliminandoUsuario(true);

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoint = `${FASTAPI_BASE_URL}/users/${usuarioAEliminar.id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const resultado = await response.json();
        
        if (resultado.success) {
          setEliminandoUsuario(false);
          setUsuarioEliminado(true);
          
          // Recargar lista
          setTimeout(async () => {
            await cargarUsuarios();
            setMostrarModalEliminar(false);
            setUsuarioAEliminar(null);
            setUsuarioEliminado(false);
          }, 1500);
        } else {
          throw new Error(resultado.error || 'Error al eliminar usuario');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }
    } catch (error) {
      setEliminandoUsuario(false);
      console.error('❌ Error:', error);
      alert('Error al eliminar usuario: ' + (error as Error).message);
    }
  };

  const toggleEstadoUsuario = async (usuario: Usuario) => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const endpoint = `${FASTAPI_BASE_URL}/users/${usuario.id}/toggle-status`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const resultado = await response.json();
        
        if (resultado.success) {
          // Actualizar lista local
          setUsuarios(usuarios.map(u => 
            u.id === usuario.id ? { ...u, activo: !u.activo } : u
          ));
        } else {
          throw new Error(resultado.error || 'Error al cambiar estado');
        }
      } else {
        throw new Error(`Error del servidor: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al cambiar estado: ' + (error as Error).message);
    }
  };

  const formatearFecha = (fechaStr: string) => {
    try {
      return new Date(fechaStr).toLocaleDateString('es-ES');
    } catch {
      return fechaStr;
    }
  };

  const getRolBadge = (rol: string) => {
    const esAdmin = rol === 'admin';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        esAdmin 
          ? 'bg-red-100 text-red-800 border border-red-200' 
          : 'bg-blue-100 text-blue-800 border border-blue-200'
      }`}>
        {esAdmin ? (
          <>
            <Shield className="w-3 h-3 inline mr-1" />
            Admin
          </>
        ) : (
          <>
            <UserCog className="w-3 h-3 inline mr-1" />
            Técnico
          </>
        )}
      </span>
    );
  };

  const getEstadoBadge = (activo: boolean) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      activo 
        ? 'bg-green-100 text-green-800 border border-green-200' 
        : 'bg-gray-100 text-gray-800 border border-gray-200'
    }`}>
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B0B2]"></div>
      </div>
    );
  }

  if (user?.rol !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">Acceso Denegado</h1>
          <p className="text-gray-500">No tienes permisos para acceder a esta página</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-foreground bg-gray-50"
      style={{
        backgroundImage: "url('/images/cq2.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "50% 70%",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="min-h-screen bg-black/5">
        {/* Header */}
        <header
          className="shadow-lg border-b"
          style={{ backgroundColor: "#00B0B2", borderColor: "#00B0B2" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo y Navegación */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(dashboardRoute)}
                  className="focus:outline-none"
                >
                  <img
                    src="/images/logo.png"
                    alt="Logo"
                    className="h-12 w-auto object-contain cursor-pointer"
                  />
                </button>
                
                <Button
                  variant="ghost"
                  onClick={() => router.push(dashboardRoute)}
                  className="text-white hover:bg-white/20 px-3 py-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </div>

              {/* Título */}
              <div className="flex-1 text-center">
                <h1 className="text-xl font-semibold text-white">Configuración General</h1>
                <p className="text-white/80 text-sm">Panel de administración del sistema</p>
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-4">
                <div className="hidden md:block text-white text-sm">
                  <div className="font-medium">{user?.nombre}</div>
                  <div className="text-white/80">{user?.area}</div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full bg-white/20 hover:bg-white/30"
                    >
                      <User className="h-5 w-5 text-white" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56 bg-white text-gray-800 shadow-xl rounded-lg border border-gray-300 z-50"
                    style={{ backgroundColor: 'white' }}
                  >
                    <div className="px-4 py-2 border-b border-gray-200 bg-white">
                      <div className="font-medium text-gray-900">{user?.nombre}</div>
                      <div className="text-sm text-gray-500">{user?.email}</div>
                      <div className="text-sm text-gray-500 capitalize">{user?.rol}</div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600 bg-white hover:bg-gray-100 focus:bg-gray-100">
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Sección Usuarios */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header de la sección */}
            <div className="bg-gradient-to-r from-[#00B0B2] to-[#00A0A0] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Gestión de Usuarios</h2>
                    <p className="text-white/80 text-sm">Administrar usuarios del sistema</p>
                  </div>
                </div>
                <Button
                  onClick={handleCrearUsuario}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Usuario
                </Button>
              </div>
            </div>

            {/* Contenido de la tabla */}
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B0B2] mx-auto"></div>
                  <p className="text-gray-500 mt-2">Cargando usuarios...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                  <p className="text-red-600">{error}</p>
                  <Button onClick={cargarUsuarios} className="mt-4" variant="outline">
                    Reintentar
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '600px' }}>
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      width: 12px;
                      height: 12px;
                    }
                    div::-webkit-scrollbar-track {
                      background: #f3f4f6;
                      border-radius: 6px;
                    }
                    div::-webkit-scrollbar-thumb {
                      background: #9ca3af;
                      border-radius: 6px;
                      border: 2px solid #f3f4f6;
                    }
                    div::-webkit-scrollbar-thumb:hover {
                      background: #6b7280;
                    }
                  `}</style>
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900 bg-white">Usuario</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 bg-white">Rol</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 bg-white">Área</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 bg-white">Estado</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 bg-white">Fecha Creación</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-900 bg-white">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {usuarios.map((usuario) => (
                        <tr key={usuario.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className={`text-white w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                                usuario.area === 'TIC' ? 'bg-purple-600' : 'bg-[#00B0B2]'
                              }`}>
                                {usuario.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{usuario.nombre}</div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {usuario.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {getRolBadge(usuario.rol)}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-gray-900">{usuario.area || 'Sin área'}</span>
                          </td>
                          <td className="py-4 px-4">
                            {getEstadoBadge(usuario.activo)}
                          </td>
                          <td className="py-4 px-4 text-gray-500">
                            {formatearFecha(usuario.fecha_creacion)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center space-x-2">
                              <Button
                                onClick={() => handleEditarUsuario(usuario)}
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => toggleEstadoUsuario(usuario)}
                                variant="ghost"
                                size="sm"
                                className={`${
                                  usuario.activo 
                                    ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50' 
                                    : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                }`}
                              >
                                {usuario.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                onClick={() => {
                                  setUsuarioAEliminar(usuario);
                                  setMostrarModalEliminar(true);
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {usuarios.length === 0 && (
                    <div className="text-center py-8">
                      <User className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
                      <p className="mt-1 text-sm text-gray-500">Comienza agregando un nuevo usuario</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Modal Crear/Editar Usuario */}
        {mostrarModalUsuario && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100">
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-[#00B0B2] to-[#00A0A0] px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {usuarioEditando ? 'Editar Usuario' : 'Crear Usuario'}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {usuarioEditando ? 'Modificar información del usuario' : 'Agregar nuevo usuario al sistema'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMostrarModalUsuario(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Contenido del Modal */}
              {!guardandoUsuario && !usuarioGuardado && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formUsuario.nombre}
                      onChange={(e) => setFormUsuario({...formUsuario, nombre: e.target.value})}
                      placeholder="Ingrese el nombre completo"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo Electrónico <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={formUsuario.email}
                      onChange={(e) => setFormUsuario({...formUsuario, email: e.target.value})}
                      placeholder="usuario@cafequindio.com"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rol <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formUsuario.rol}
                      onChange={(e) => setFormUsuario({...formUsuario, rol: e.target.value as 'admin' | 'tecnico'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00B0B2] focus:border-[#00B0B2]"
                    >
                      <option value="tecnico">Técnico</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Área
                    </label>
                    <select
                      value={formUsuario.area}
                      onChange={(e) => setFormUsuario({...formUsuario, area: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00B0B2] focus:border-[#00B0B2]"
                    >
                      <option value="">Seleccionar área...</option>
                      <option value="TIC">TIC</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Mantenimiento Planta">Mantenimiento Planta</option>
                      <option value="Jefe de Zona">Jefe de Zona</option>
                      <option value="Gerente de Tiendas">Gerente de Tiendas</option>
                      <option value="Mercadeo">Mercadeo</option>
                    </select>
                  </div>

                  {!usuarioEditando && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña Inicial <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          type={mostrarPassword ? "text" : "password"}
                          value={formUsuario.password}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 50); // Limitar a 50 caracteres
                            setFormUsuario({...formUsuario, password: value});
                          }}
                          placeholder="Mínimo 6, máximo 50 caracteres"
                          className="w-full pr-10"
                          maxLength={50}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMostrarPassword(!mostrarPassword)}
                          className="absolute right-0 top-0 h-full px-3 py-2"
                        >
                          {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Estado de Guardando */}
              {guardandoUsuario && (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B0B2] mx-auto"></div>
                  <p className="text-gray-600 mt-4">Guardando usuario...</p>
                </div>
              )}

              {/* Estado de Éxito */}
              {usuarioGuardado && (
                <div className="p-8 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">¡Usuario Guardado!</h4>
                  <p className="text-gray-600">El usuario ha sido {usuarioEditando ? 'actualizado' : 'creado'} exitosamente</p>
                </div>
              )}

              {/* Botones del Modal */}
              {!guardandoUsuario && !usuarioGuardado && (
                <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
                  <Button
                    variant="outline"
                    onClick={() => setMostrarModalUsuario(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGuardarUsuario}
                    className="bg-gradient-to-r from-[#00B0B2] to-[#00A0A0] hover:from-[#009B9D] hover:to-[#008B8B] text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {usuarioEditando ? 'Actualizar' : 'Crear'} Usuario
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Eliminar Usuario */}
        {mostrarModalEliminar && usuarioAEliminar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Eliminar Usuario Permanentemente</h3>
                    <p className="text-white/80 text-sm">Esta acción eliminará el usuario completamente y no se puede deshacer</p>
                  </div>
                </div>
              </div>

              {/* Contenido del Modal */}
              {!eliminandoUsuario && !usuarioEliminado && (
                <div className="p-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-gray-800">
                      ¿Estás seguro de que deseas eliminar <strong>permanentemente</strong> al usuario{' '}
                      <span className="font-semibold text-red-600">"{usuarioAEliminar.nombre}"</span>?
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Email: {usuarioAEliminar.email} • Rol: {usuarioAEliminar.rol}
                    </p>
                    <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-md">
                      <p className="text-xs text-red-700 font-medium">
                        ⚠️ No se puede eliminar usuarios que tengan solicitudes asignadas. Considera desactivarlo en su lugar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Estado de Eliminando */}
              {eliminandoUsuario && (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Eliminando usuario permanentemente...</p>
                </div>
              )}

              {/* Estado de Éxito */}
              {usuarioEliminado && (
                <div className="p-8 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">¡Usuario Eliminado!</h4>
                  <p className="text-gray-600">El usuario ha sido eliminado permanentemente del sistema</p>
                </div>
              )}

              {/* Botones del Modal */}
              {!eliminandoUsuario && !usuarioEliminado && (
                <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMostrarModalEliminar(false);
                      setUsuarioAEliminar(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleEliminarUsuario}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Permanentemente
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

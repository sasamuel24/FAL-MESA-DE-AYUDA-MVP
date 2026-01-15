"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../lib/auth_context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Mail, Lock, AlertCircle, Menu, FileText, HelpCircle, Building2, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // 🔧 SANITIZAR inputs: eliminar espacios al inicio y final
      const emailTrimmed = email.trim();
      const passwordTrimmed = password.trim();

      // Basic validation
      if (!emailTrimmed || !passwordTrimmed) {
        throw new Error("Por favor, complete todos los campos")
      }

      if (!emailTrimmed.includes("@")) {
        throw new Error("Por favor, ingrese un email válido")
      }

      // Limpiar cualquier estado previo
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');

      // Usar la función login del contexto con valores sanitizados
      await login(emailTrimmed, passwordTrimmed);

      console.log("Login exitoso, redirigiendo...");

      // Pequeño delay para permitir que el auth context se actualice
      await new Promise(resolve => setTimeout(resolve, 200)); // Aumentar delay

      // Obtener datos del usuario desde localStorage para la redirección
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      // Verificar que se obtuvieron los datos correctamente
      if (!userData.rol) {
        console.error("No se pudo obtener rol del usuario");
        throw new Error("Error al obtener datos del usuario");
      }

      console.log("Datos del usuario para redirección:", userData);

      // Determinar ruta según área y rol
      let redirectPath = "/dashboard"; // Por defecto

      // Verificar áreas gerenciales PRIMERO
      const areasGerenciales = ['Jefe de Zona', 'Gerente de Tiendas', 'Mercadeo'];
      if (userData.area && areasGerenciales.includes(userData.area)) {
        console.log(`Redirigiendo a CQ Performance Dashboard para área: ${userData.area}`);
        redirectPath = "/dashboard-tickets";
      }
      // Si es admin del área TIC
      else if (userData.rol === 'admin' && userData.area && userData.area.toLowerCase().includes('tic')) {
        console.log("Redirigiendo a dashboard TIC para admin de TIC");
        redirectPath = "/dashboard-tic";
      }
      // Si pertenece al área Financiera (admin o usuario del área)
      else if (userData.area && userData.area.toLowerCase() === 'financiera') {
        console.log("Redirigiendo a dashboard Financiero para área Financiera");
        redirectPath = "/dashboard-financiero";
      }
      // Si es admin de otras áreas
      else if (userData.rol === 'admin') {
        console.log("Redirigiendo a dashboard para admin");
        redirectPath = "/dashboard";
      }
      // Si es técnico
      else if (userData.rol === 'tecnico') {
        console.log("Redirigiendo a tecnico para tecnico");
        redirectPath = "/tecnico";
      }

      console.log("Ruta final de redirección:", redirectPath);
      router.push(redirectPath);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMenuNavigation = (path: string) => {
    console.log(`Navegando a: ${path}`)
    if (path === "/solicitudes/b2c") {
      window.location.href = "/formulario-b2c"
    } else if (path === "/solicitudes/planta-produc") {
      window.location.href = "/formulario-planta-san-pedro"
    } else if (path === "/solicitudes/b2b") {
      window.location.href = "/formulario-b2b"
    } else if (path === "/solicitudes/logistica") {
      window.location.href = "/formulario-logistica"
    } else {
      // Para otras rutas futuras
      alert(`Navegando a: ${path}`)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-lg"
            style={{ backgroundColor: "#00B0B2", borderColor: "#0C6659" }}
          >
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-1 text-black drop-shadow-lg">Sistema de Mantenimiento Industrial</h1>
        <p className="text-sm text-black drop-shadow-md">Plataforma Integral de Gestión Empresarial</p>
      </div>

      <Card className="w-full shadow-xl border-border/50 relative bg-white">
        <div className="absolute top-4 right-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                style={{ borderColor: "#00B0B2" }}
              >
                <Menu className="h-4 w-4" style={{ color: "#0C6659" }} />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg" style={{ borderColor: "#00B0B2" }}>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  className="hover:bg-opacity-10 focus:bg-opacity-10 cursor-pointer"
                  style={{ "--tw-bg-opacity": "0.1" } as React.CSSProperties}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#00B0B2" + "1A")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <FileText className="mr-2 h-4 w-4" style={{ color: "#00B0B2" }} />
                  <span style={{ color: "#333231" }}>Formulario de Solicitudes</span>
                  <ChevronRight className="ml-auto h-4 w-4" style={{ color: "#00B0B2" }} />
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-white shadow-lg" style={{ borderColor: "#00B0B2" }}>
                  <DropdownMenuItem
                    onClick={() => handleMenuNavigation("/solicitudes/b2b")}
                    className="hover:bg-opacity-10 focus:bg-opacity-10 cursor-pointer"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#00B0B2" + "1A")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span style={{ color: "#333231" }}>B2B</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleMenuNavigation("/solicitudes/b2c")}
                    className="hover:bg-opacity-10 focus:bg-opacity-10 cursor-pointer"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#00B0B2" + "1A")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span style={{ color: "#333231" }}>B2C</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleMenuNavigation("/solicitudes/logistica")}
                    className="hover:bg-opacity-10 focus:bg-opacity-10 cursor-pointer"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#00B0B2" + "1A")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span style={{ color: "#333231" }}>Logística</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleMenuNavigation("/solicitudes/planta-produc")}
                    className="hover:bg-opacity-10 focus:bg-opacity-10 cursor-pointer"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#00B0B2" + "1A")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span style={{ color: "#333231" }}>Planta San Pedro</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator style={{ backgroundColor: "#00B0B2" }} />
              <DropdownMenuItem
                onClick={() => handleMenuNavigation("/ayuda")}
                className="hover:bg-opacity-10 focus:bg-opacity-10 cursor-pointer"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#00B0B2" + "1A")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <HelpCircle className="mr-2 h-4 w-4" style={{ color: "#00B0B2" }} />
                <span style={{ color: "#333231" }}>Ayuda y Soporte</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardHeader className="space-y-1 pt-6">
          <CardTitle className="text-2xl text-center font-bold" style={{ color: "#333231" }}>
            Iniciar Sesión
          </CardTitle>
          <CardDescription className="text-center" style={{ color: "#00B0B2" }}>
            Ingrese sus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: "#333231" }}>
                Correo Electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4" style={{ color: "#00B0B2" }} />
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@cafequindio.com.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  style={
                    {
                      borderColor: "#00B0B2",
                      "--tw-ring-color": "#00B0B2",
                    } as React.CSSProperties
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0C6659"
                    e.target.style.boxShadow = `0 0 0 2px #00B0B2`
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#00B0B2"
                    e.target.style.boxShadow = "none"
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: "#333231" }}>
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4" style={{ color: "#00B0B2" }} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  style={
                    {
                      borderColor: "#00B0B2",
                      "--tw-ring-color": "#00B0B2",
                    } as React.CSSProperties
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0C6659"
                    e.target.style.boxShadow = `0 0 0 2px #00B0B2`
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#00B0B2"
                    e.target.style.boxShadow = "none"
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" style={{ color: "#00B0B2" }} />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: "#00B0B2" }} />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  style={{
                    borderColor: "#00B0B2",
                    color: "#00B0B2",
                  }}
                />
                <Label htmlFor="remember" className="text-sm" style={{ color: "#333231" }}>
                  Recordarme
                </Label>
              </div>
              <Button
                type="button"
                variant="link"
                className="px-0 text-sm hover:no-underline"
                style={{ color: "#00B0B2" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#0C6659")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#00B0B2")}
              >
                ¿Olvidó su contraseña?
              </Button>
            </div>

            <Button
              type="submit"
              className="w-full text-white font-medium"
              style={{
                backgroundColor: "#00B0B2",
                borderColor: "#00B0B2",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0C6659")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#00B0B2")}
              disabled={isLoading}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}



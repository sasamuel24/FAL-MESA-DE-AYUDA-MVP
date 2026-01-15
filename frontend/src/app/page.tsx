import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/images/cq.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "50% 70%",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="w-full max-w-md">
        {/* Login form */}
        <LoginForm />

        <div className="text-center mt-8">
          <p className="text-sm text-gray-700 font-medium drop-shadow-sm">
            © 2025 Cafe Quindio. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}




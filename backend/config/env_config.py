"""
Utilidad para manejo de configuración dual (local/producción)
Permite alternar entre configuraciones sin afectar el código
"""
import os
from dotenv import load_dotenv

def load_environment_config():
    """
    Cargar configuración basada en el entorno
    Prioridad: ENVIRONMENT variable > .env.local > .env
    """
    
    # 1. Verificar si hay variable de entorno ENVIRONMENT
    environment = os.getenv('ENVIRONMENT', None)
    
    # 2. Si no hay variable, intentar cargar .env.local primero
    if environment is None and os.path.exists('.env.local'):
        load_dotenv('.env.local')
        environment = os.getenv('ENVIRONMENT', 'local')
        print(f"[CONFIG] Configuracion cargada desde .env.local (modo: {environment})")
        return environment
    
    # 3. Si no existe .env.local, cargar .env por defecto
    elif environment is None:
        load_dotenv('.env')
        environment = os.getenv('ENVIRONMENT', 'production')
        print(f"[CONFIG] Configuracion cargada desde .env (modo: {environment})")
        return environment
    
    # 4. Si ya hay variable ENVIRONMENT, cargar el archivo correspondiente
    else:
        if environment == 'local' and os.path.exists('.env.local'):
            load_dotenv('.env.local')
            print(f"[CONFIG] Configuracion forzada desde .env.local (modo: {environment})")
        else:
            load_dotenv('.env')
            print(f"[CONFIG] Configuracion cargada desde .env (modo: {environment})")
        
        return environment

def get_database_url():
    """
    Obtener la URL de base de datos según el entorno
    """
    environment = load_environment_config()
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        if environment == 'local':
            database_url = 'postgresql://postgres:Samuel22.@localhost:5432/BDCQ'
        else:
            database_url = 'postgresql://postgres:CQhelpdesk.@cafequindio-mesadeayuda-db.chgqoo4oaal4.us-east-2.rds.amazonaws.com:5432/postgres'
    
    # Mostrar información de conexión (sin credenciales)
    if 'localhost' in database_url:
        print(f"[DB] Conectando a base de datos LOCAL: localhost:5432/BDCQ")
    else:
        print(f"[DB] Conectando a base de datos RDS: ...us-east-2.rds.amazonaws.com:5432/postgres")
    
    return database_url

def is_local_environment():
    """
    Verificar si estamos en entorno local
    """
    load_environment_config()
    return os.getenv('ENVIRONMENT', 'production').lower() == 'local'

def is_production_environment():
    """
    Verificar si estamos en entorno de producción
    """
    load_environment_config()
    return os.getenv('ENVIRONMENT', 'production').lower() == 'production'

# Función de conveniencia para mostrar configuración actual
def show_current_config():
    """
    Mostrar configuración actual cargada
    """
    environment = load_environment_config()
    database_url = get_database_url()
    
    print("\n" + "="*60)
    print("[CONFIG] CONFIGURACION ACTUAL DE CAFE QUINDIO")
    print("="*60)
    print(f"[ENV] Entorno: {environment.upper()}")
    
    if 'localhost' in database_url:
        print(f"[DB] Base de datos: PostgreSQL Local (localhost:5432)")
    else:
        print(f"[DB] Base de datos: AWS RDS (us-east-2)")
    
    print(f"[FILE] Archivo de config: {'.env.local' if environment == 'local' else '.env'}")
    print("="*60)

if __name__ == "__main__":
    show_current_config()
"""
AWS S3 Service for handling image uploads and management
Compatible with both Flask (FileStorage) and FastAPI (UploadFile)
"""
import boto3
import os
import uuid
from datetime import datetime
from botocore.exceptions import ClientError
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
from typing import Optional, Dict, Any, Union, TYPE_CHECKING
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Para compatibilidad con FastAPI
if TYPE_CHECKING:
    from fastapi import UploadFile
else:
    try:
        from fastapi import UploadFile
    except ImportError:
        UploadFile = None

# Configure logging
logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        """Initialize S3 client with credentials from environment variables"""
        self._s3_client = None
        self._initialized = False
        self._mock_mode = False  # Modo local sin S3
        # Load environment variables explicitly
        load_dotenv()

    def _initialize(self):
        """Lazy initialization of S3 client"""
        if self._initialized:
            return
            
        # Load environment variables again to ensure they're available
        load_dotenv()
        
        self.aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.bucket_name = os.getenv('AWS_BUCKET_NAME')
        
        # Verificar si estamos en modo desarrollo
        environment = os.getenv('ENVIRONMENT', 'development').lower()
        
        logger.info(f"AWS credentials check - Key: {'SET' if self.aws_access_key_id else 'NOT SET'}, Secret: {'SET' if self.aws_secret_access_key else 'NOT SET'}, Bucket: {self.bucket_name}, Environment: {environment}")
        
        # En desarrollo, permitir modo mock sin credenciales AWS
        if not all([self.aws_access_key_id, self.aws_secret_access_key, self.bucket_name]):
            if environment in ['development', 'dev', 'local']:
                logger.warning("⚠️ AWS credentials not set - Running in MOCK MODE (local development)")
                self._mock_mode = True
                self._initialized = True
                # Allowed file extensions
                self.allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
                # Maximum file size (10MB)
                self.max_file_size = 10 * 1024 * 1024
                return
            else:
                raise ValueError("AWS credentials and bucket name must be set in environment variables for production")
        
        try:
            # Initialize S3 client
            self._s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key,
                region_name=self.aws_region
            )
            
            # Allowed file extensions
            self.allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
            
            # Maximum file size (10MB)
            self.max_file_size = 10 * 1024 * 1024
            
            self._initialized = True
            logger.info("✅ S3 Service successfully initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize S3 service: {str(e)}")
            raise

    @property
    def s3_client(self):
        """Get S3 client, initializing if necessary"""
        if not self._initialized:
            self._initialize()
        return self._s3_client

    def is_allowed_file(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        if not self._initialized:
            self._initialize()
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.allowed_extensions

    def generate_unique_filename(self, original_filename: str, prefix: str = '') -> str:
        """Generate a unique filename with timestamp and UUID"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        filename = secure_filename(original_filename)
        name, ext = os.path.splitext(filename)
        
        if prefix:
            return f"{prefix}_{timestamp}_{unique_id}_{name}{ext}"
        return f"{timestamp}_{unique_id}_{name}{ext}"

    def upload_file(self, file, folder: str = 'images', prefix: str = '') -> Dict[str, Any]:
        """
        Upload file to S3 bucket - For Flask FileStorage only
        
        Args:
            file: FileStorage (Flask) object
            folder: S3 folder path (default: 'images')
            prefix: Prefix for filename (e.g., 'b2c', 'ot')
            
        Returns:
            dict: Contains 'success', 'url', 'key', and optional 'error'
        """
        try:
            self._initialize()
            
            # MODO MOCK: Desarrollo local sin S3
            if self._mock_mode:
                logger.info("📝 MOCK MODE: Simulando subida de archivo (sin S3)")
                unique_filename = self.generate_unique_filename(file.filename if hasattr(file, 'filename') else 'archivo.jpg', prefix)
                mock_url = f"http://localhost:8000/mock-uploads/{folder}/{unique_filename}"
                return {
                    'success': True,
                    'url': mock_url,
                    'key': f"{folder}/{unique_filename}",
                    'filename': unique_filename,
                    'original_filename': file.filename if hasattr(file, 'filename') else 'archivo.jpg',
                    'size': 0,
                    'mock': True
                }
            
            # Validate file
            if not file or not getattr(file, 'filename', None):
                return {'success': False, 'error': 'No file provided'}
            
            if not self.is_allowed_file(file.filename):
                return {'success': False, 'error': 'File type not allowed'}
            
            # Handle file size check for Flask FileStorage only
            file.seek(0, 2)  # Seek to end of file
            file_size = file.tell()
            file.seek(0)  # Reset to beginning
            
            if file_size > self.max_file_size:
                return {'success': False, 'error': 'File size exceeds limit (10MB)'}
            
            # Generate unique filename
            unique_filename = self.generate_unique_filename(file.filename, prefix)
            s3_key = f"{folder}/{unique_filename}"
            
            # Get content type
            content_type = getattr(file, 'content_type', None) or 'image/jpeg'
            
            # Upload to S3 - Flask FileStorage only
            self.s3_client.upload_fileobj(
                file,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': content_type,
                    'CacheControl': 'max-age=86400',
                    'ACL': 'public-read',
                    'Metadata': {
                        'original_filename': file.filename,
                        'upload_date': datetime.now().isoformat(),
                    }
                }
            )
            
            # Generate public URL
            url = f"https://{self.bucket_name}.s3.{self.aws_region}.amazonaws.com/{s3_key}"
            
            logger.info(f"Successfully uploaded file to S3: {s3_key}")
            
            return {
                'success': True,
                'url': url,
                'key': s3_key,
                'filename': unique_filename,
                'original_filename': file.filename,
                'size': file_size
            }
            
        except ClientError as e:
            error_msg = f"AWS S3 error: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
        except Exception as e:
            error_msg = f"Unexpected error uploading file: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}

    def upload_file_buffer(self, file_buffer, key: str, content_type: str = 'application/octet-stream') -> Optional[str]:
        """
        Upload file buffer directly to S3
        
        Args:
            file_buffer: BytesIO buffer containing file data
            key: S3 object key (path where to store)
            content_type: MIME type of the file
            
        Returns:
            str: S3 URL if successful, None if failed
        """
        try:
            self._initialize()
            
            # Reset buffer position
            file_buffer.seek(0)
            
            # Upload to S3
            self.s3_client.upload_fileobj(
                file_buffer,
                self.bucket_name,
                key,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'public-read',
                    'CacheControl': 'max-age=86400',
                }
            )
            
            # Generate S3 URL
            s3_url = f"https://{self.bucket_name}.s3.{self.aws_region}.amazonaws.com/{key}"
            
            logger.info(f"Successfully uploaded buffer to S3: {key}")
            return s3_url
            
        except Exception as e:
            logger.error(f"Error uploading buffer to S3: {str(e)}")
            return None

    def delete_file(self, s3_key: str) -> Dict[str, Any]:
        """
        Delete file from S3 bucket
        
        Args:
            s3_key: S3 object key (path) to delete
            
        Returns:
            dict: Contains 'success' and optional 'error'
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"Successfully deleted file from S3: {s3_key}")
            return {'success': True}
            
        except ClientError as e:
            error_msg = f"AWS S3 error deleting file: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
        except Exception as e:
            error_msg = f"Unexpected error deleting file: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}

    def get_file_info(self, s3_key: str) -> Dict[str, Any]:
        """
        Get file information from S3
        
        Args:
            s3_key: S3 object key
            
        Returns:
            dict: File information or error
        """
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            
            return {
                'success': True,
                'size': response['ContentLength'],
                'last_modified': response['LastModified'],
                'content_type': response['ContentType'],
                'metadata': response.get('Metadata', {})
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return {'success': False, 'error': 'File not found'}
            error_msg = f"AWS S3 error: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
        except Exception as e:
            error_msg = f"Unexpected error getting file info: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}

    def list_files(self, folder: str = 'images', limit: int = 100) -> Dict[str, Any]:
        """
        List files in S3 bucket folder
        
        Args:
            folder: S3 folder path
            limit: Maximum number of files to return
            
        Returns:
            dict: List of files or error
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=folder,
                MaxKeys=limit
            )
            
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    url = f"https://{self.bucket_name}.s3.{self.aws_region}.amazonaws.com/{obj['Key']}"
                    files.append({
                        'key': obj['Key'],
                        'url': url,
                        'size': obj['Size'],
                        'last_modified': obj['LastModified']
                    })
            
            return {
                'success': True,
                'files': files,
                'count': len(files)
            }
            
        except ClientError as e:
            error_msg = f"AWS S3 error: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
        except Exception as e:
            error_msg = f"Unexpected error listing files: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}

    async def upload_file_async(self, file, folder: str = 'images', prefix: str = '') -> Dict[str, Any]:
        """
        Upload file to S3 bucket - For FastAPI UploadFile only
        
        Args:
            file: UploadFile (FastAPI) object
            folder: S3 folder path (default: 'images')
            prefix: Prefix for filename (e.g., 'b2c', 'ot')
            
        Returns:
            dict: Contains 'success', 'url', 'key', and optional 'error'
        """
        try:
            self._initialize()
            
            # MODO MOCK: Desarrollo local sin S3
            if self._mock_mode:
                logger.info("📝 MOCK MODE: Simulando subida de archivo async (sin S3)")
                unique_filename = self.generate_unique_filename(file.filename if hasattr(file, 'filename') else 'archivo.jpg', prefix)
                mock_url = f"http://localhost:8000/mock-uploads/{folder}/{unique_filename}"
                return {
                    'success': True,
                    'url': mock_url,
                    'key': f"{folder}/{unique_filename}",
                    'filename': unique_filename,
                    'original_filename': file.filename if hasattr(file, 'filename') else 'archivo.jpg',
                    'mock': True
                }
            
            if not file or not getattr(file, 'filename', None):
                return {'success': False, 'error': 'No file provided'}
            
            if not self.is_allowed_file(file.filename):
                return {'success': False, 'error': 'File type not allowed'}
            
            # Handle file size check for FastAPI UploadFile
            if hasattr(file, 'size') and file.size is not None:
                file_size = file.size
            else:
                content = await file.read()
                file_size = len(content)
                await file.seek(0)  # Reset to beginning
            
            if file_size > self.max_file_size:
                return {'success': False, 'error': 'File size exceeds limit (10MB)'}
            
            # Generate unique filename
            unique_filename = self.generate_unique_filename(file.filename, prefix)
            s3_key = f"{folder}/{unique_filename}"
            
            # Get content type
            content_type = getattr(file, 'content_type', None) or 'image/jpeg'
            
            # Read file content for upload
            if not hasattr(file, 'size') or file.size is None:
                # Content already read above
                pass
            else:
                content = await file.read()
            
            # Upload to S3 for FastAPI UploadFile
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=content,
                ContentType=content_type,
                CacheControl='max-age=86400',
                ACL='public-read',
                Metadata={
                    'original_filename': file.filename,
                    'upload_date': datetime.now().isoformat(),
                }
            )
            
            # Generate URL
            url = f"https://{self.bucket_name}.s3.{self.aws_region}.amazonaws.com/{s3_key}"
            
            logger.info(f"File uploaded successfully to S3: {s3_key}")
            return {
                'success': True,
                'url': url,
                'key': s3_key,
                'filename': unique_filename
            }
            
        except Exception as e:
            logger.error(f"Error uploading file to S3: {str(e)}")
            return {'success': False, 'error': f'Upload failed: {str(e)}'}

    def generate_presigned_download_url(self, s3_key: str, expiration: int = 3600) -> Dict[str, Any]:
        """
        Generate a presigned URL for downloading a file from S3
        
        Args:
            s3_key: The S3 key (path) of the file
            expiration: Time in seconds for the URL to remain valid (default: 1 hour)
            
        Returns:
            dict: Contains 'success', 'url', and optional 'error'
        """
        try:
            self._initialize()
            
            if not self._initialized:
                return {'success': False, 'error': 'S3 not properly configured'}
            
            # Generate presigned URL for download
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            
            logger.info(f"Generated presigned URL for {s3_key}")
            return {
                'success': True,
                'url': presigned_url,
                'expires_in': expiration
            }
            
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {str(e)}")
            return {'success': False, 'error': f'Failed to generate download URL: {str(e)}'}
        except Exception as e:
            logger.error(f"Unexpected error generating presigned URL: {str(e)}")
            return {'success': False, 'error': f'Unexpected error: {str(e)}'}

    def download_file_from_s3(self, s3_key: str) -> Dict[str, Any]:
        """
        Download file content from S3
        
        Args:
            s3_key: The S3 key (path) of the file
            
        Returns:
            dict: Contains 'success', 'content', 'content_type', 'filename', and optional 'error'
        """
        try:
            self._initialize()
            
            if not self._initialized:
                return {'success': False, 'error': 'S3 not properly configured'}
            
            # Get object from S3
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            
            # Extract filename from s3_key
            filename = os.path.basename(s3_key)
            
            logger.info(f"Downloaded file from S3: {s3_key}")
            return {
                'success': True,
                'content': response['Body'].read(),
                'content_type': response.get('ContentType', 'application/octet-stream'),
                'filename': filename
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.error(f"File not found in S3: {s3_key}")
                return {'success': False, 'error': 'File not found'}
            else:
                logger.error(f"Error downloading from S3: {str(e)}")
                return {'success': False, 'error': f'Download failed: {str(e)}'}
        except Exception as e:
            logger.error(f"Unexpected error downloading from S3: {str(e)}")
            return {'success': False, 'error': f'Unexpected error: {str(e)}'}

# Global instance
s3_service = S3Service()


# ========================================
# Helper function for FastAPI UploadFile
# ========================================

async def upload_file_to_s3(file, folder: str = 'images') -> str:
    """
    Simple helper function to upload FastAPI UploadFile to S3.
    
    Args:
        file: UploadFile object from FastAPI
        folder: S3 folder path (default: 'images')
    
    Returns:
        str: S3 URL of uploaded file
    
    Raises:
        Exception: If upload fails
    """
    result = await s3_service.upload_file_async(file, folder=folder, prefix='factura')
    
    if not result.get('success'):
        error_msg = result.get('error', 'Unknown error')
        logger.error(f"Failed to upload file to S3: {error_msg}")
        raise Exception(f"Upload failed: {error_msg}")
    
    return result['url']

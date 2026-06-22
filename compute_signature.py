import hashlib
import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

# 读取私钥
with open('/mnt/d/trae_projects/linkchest/private_key.pem', 'rb') as f:
    private_key = serialization.load_pem_private_key(f.read(), password=None, backend=default_backend())

# 获取公钥
public_key = private_key.public_key()

# 序列化公钥为 DER 格式
public_key_der = public_key.public_bytes(
    encoding=serialization.Encoding.DER,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

# 计算 SHA256
sha256 = hashlib.sha256(public_key_der).hexdigest().upper()
print(f"SHA256: {sha256}")

# 计算 MD5
md5 = hashlib.md5(public_key_der).hexdigest().upper()
print(f"MD5: {md5}")

# 格式化 SHA256 为带冒号的格式
sha256_formatted = ':'.join(sha256[i:i+2] for i in range(0, len(sha256), 2))
print(f"SHA256 (formatted): {sha256_formatted}")

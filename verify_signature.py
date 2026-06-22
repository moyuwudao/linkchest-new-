import hashlib

sha256_hex = 'D84BBB284EF47E80E978FA9E27BF137E5B9B5289FE126ADC14DEDE4295712783'
sha256_bytes = bytes.fromhex(sha256_hex)
md5 = hashlib.md5(sha256_bytes).hexdigest().upper()
print(f"MD5: {md5}")
print(f"备案签名: 532FD00CDFE8E47071536704767B85FD")
print(f"匹配: {md5 == '532FD00CDFE8E47071536704767B85FD'}")

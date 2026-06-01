data = open('/tmp/test-chinese.hbc', 'rb').read()

# UTF-16LE encoding
print('UTF-16LE 微:', data.count(b'\xae\x5f'))
print('UTF-16LE 信:', data.count(b'\xe1\x4f'))
print('UTF-16LE 登:', data.count(b'\x7b\x76'))
print('UTF-16LE 录:', data.count(b'\x55\x5f'))

# UTF-16BE encoding
print('UTF-16BE 微:', data.count(b'\x5f\xae'))
print('UTF-16BE 信:', data.count(b'\x4f\xe1'))

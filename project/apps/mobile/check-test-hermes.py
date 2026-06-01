data = open('/tmp/test-chinese.hbc', 'rb').read()

print('UTF-8 微:', data.count(b'\xe5\xbe\xae'))
print('UTF-8 信:', data.count(b'\xe4\xbf\xa1'))
print('Raw \\u5fae:', data.count(b'\\u5fae'))
print('Raw \\u4fe1:', data.count(b'\\u4fe1'))

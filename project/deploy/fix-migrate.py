# 本地辅助脚本：修复服务器上的迁移脚本
# 在服务器上执行: python3 /opt/linkchest/api/deploy/fix-migrate.py

with open('/opt/linkchest/api/deploy/migrate-cos-to-lighthouse.py', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'for i, (key, size) in enumerate(objects, 1):' in line:
        indent = line[:len(line) - len(line.lstrip())]
        new_lines.append(indent + 'objects = [(k, int(s), m) for k, s, m in objects]\n')
    new_lines.append(line)

with open('/opt/linkchest/api/deploy/migrate-cos-to-lighthouse.py', 'w') as f:
    f.writelines(new_lines)

print('Fixed')

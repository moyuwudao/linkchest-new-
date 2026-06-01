import subprocess
import re

# Check global bundle
apk = '/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-global/outputs/apk/global/release/linkchest-global-202606011238.apk'

# Extract bundle
subprocess.run(['unzip', '-o', apk, 'assets/index.android.bundle', '-d', '/tmp/global-apk/'], check=False, capture_output=True)

with open('/tmp/global-apk/assets/index.android.bundle', 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

pro_count = content.count('"pro":"Pro"')
super_count = content.count('"super":"Ultimate"')
tier_pro_count = content.count('tier.pro')

print(f"Global bundle:")
print(f"  'pro':'Pro' count: {pro_count}")
print(f"  'super':'Ultimate' count: {super_count}")
print(f"  tier.pro count: {tier_pro_count}")

with open('/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle', 'rb') as f:
    content = f.read()

print(f"Bundle size: {len(content)} bytes")
print(f"First 500 chars:")
print(content[:500].decode('utf-8', errors='ignore'))
print("\n...")
print(f"Last 200 chars:")
print(content[-200:].decode('utf-8', errors='ignore'))

# Check for common bundle markers
print("\nChecking for bundle markers:")
markers = [
    b'__d(',      # Metro module registration
    b'registerAsset',  # Asset registration
    b'SourceMapURL=',  # Source map URL
    b'JSCall',    # Hermes bytecode marker
    b'HBC',       # Hermes bytecode
]
for marker in markers:
    count = content.count(marker)
    print(f"  {marker.decode('utf-8', errors='ignore')!r}: {count}")

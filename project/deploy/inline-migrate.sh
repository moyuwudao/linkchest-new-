#!/bin/bash
# 直接复制下面整块到服务器终端执行（单引号包裹，bash不会解释其中内容）

python3 -c '
import os
from qcloud_cos import CosConfig, CosS3Client

conf = {}
with open("/opt/linkchest/api/deploy/cos-config.env") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            conf[k.strip()] = v.strip()

sid, skey, region = conf["COS_SECRET_ID"], conf["COS_SECRET_KEY"], conf["COS_REGION"]
client = CosS3Client(CosConfig(Region=region, SecretId=sid, SecretKey=skey, Scheme="https"))
src, dst = "linkchest-1418307522", "linkchest-xinjiapo-1418307522"

objs, marker = [], ""
while True:
    r = client.list_objects(Bucket=src, Marker=marker, MaxKeys=1000)
    for o in r.get("Contents", []):
        objs.append((o["Key"], int(o["Size"])))
    if r.get("IsTruncated") == "true":
        marker = r.get("NextMarker", "")
    else:
        break

print("Found {} objects, {:.2f} MB".format(len(objs), sum(s for _, s in objs) / 1024 / 1024))

ok = fail = 0
for i, (key, size) in enumerate(objs, 1):
    if size == 0 and key.endswith("/"):
        continue
    try:
        body = client.get_object(Bucket=src, Key=key)["Body"].get_raw_stream().read()
        client.put_object(Bucket=dst, Key=key, Body=body)
        print("[{}/{}] OK {}".format(i, len(objs), key))
        ok += 1
    except Exception as e:
        print("[{}/{}] FAIL {}: {}".format(i, len(objs), key, e))
        fail += 1

print("Done: {} ok, {} fail".format(ok, fail))
'

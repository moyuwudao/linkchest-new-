#!/bin/bash
# 列出所有表名
docker exec linkchest-db psql -U linkchest -d linkchest -c "\dt"

#!/bin/bash
# 查询后端 /tiers/me 返回的benefits
curl -s http://43.157.240.68:3001/api/tiers/me 2>&1 | head -200

#!/bin/bash
# 测试小红书抓取
ssh linkchest-cn-app "curl -sS 'http://127.0.0.1:3001/api/preview?url=https%3A%2F%2Fwww.xiaohongshu.com%2Fexplore%2F6a2a36ee0000000007011145' --max-time 60" 2>&1

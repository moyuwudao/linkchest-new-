#!/bin/bash
cd /opt/linkchest/api/project/apps/api
export XHS_COOKIE='web_session=040069b7f8a87a5d571685391f384b14e7e635;a1=19df698c641kvinowx8mlb57q0zq0ic6e1hakmjgc50000262701'
node src/test-inspect.ts 2>&1

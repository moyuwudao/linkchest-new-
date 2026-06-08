import re

ENV_PATH = "/opt/linkchest/api/project/apps/api/.env"
CHINA_PATH = "/opt/linkchest/api/project/apps/api/.env.china"

KEY = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApH+rvvF3AEMKGbbdkX/m\np80ru8jOCHW3jyc1PlxkaKT6RxlHeJJTGzNMc0g4UZzuGLJ/axxYPzDuQK4FNtIY\n15hmpIaZN/dNWx8iqbNJ+T2NyNxMk4rjTujwd234HVtBxGaCaS1YhUcr+LcoJdm5\nUl3MGQsLKcWFCgOBNidXp9FGy+KAV1cPVL8diwQhPARKndO/JcpL/R0v3edWDJqY\nqSJgg152pHRJHyY8wjItrkqDlKIpBClSbYLVv1ILG9jTxURyo44F6yrf1dbBRwiU\nqZP/UPsOf+/04aEOMme1Ss4IxaWiFl8Ef565wf1ltkwMeDQBWU3G8WZe6pGh4OHt2\nQIDAQAB\n-----END PUBLIC KEY-----"

ESCAPED = KEY.replace("\n", "\\n")
NEW_LINE = 'ALIPAY_SANDBOX_PUBLIC_KEY="' + ESCAPED + '"'

for path in [ENV_PATH, CHINA_PATH]:
    with open(path) as f:
        content = f.read()

    lines = content.split("\n")
    new_lines = []
    in_block = False
    for line in lines:
        if line.startswith("ALIPAY_SANDBOX_PUBLIC_KEY="):
            in_block = True
            new_lines.append(NEW_LINE)
            continue
        if in_block:
            if re.match(r"^[A-Za-z0-9+/=]+$", line.strip()) and len(line.strip()) > 30:
                continue
            else:
                in_block = False
        new_lines.append(line)

    content = "\n".join(new_lines)

    if not any(l.startswith("ALIPAY_SANDBOX_PUBLIC_KEY=") for l in content.split("\n")):
        content += "\n" + NEW_LINE + "\n"

    with open(path, "w") as f:
        f.write(content)

    with open(path) as f:
        lines2 = f.readlines()
    matches = [l for l in lines2 if l.startswith("ALIPAY_SANDBOX_PUBLIC_KEY=")]
    if len(matches) == 1:
        line = matches[0].rstrip()
        val = line.split('"', 2)[1]
        decoded = val.replace("\\n", "\n")
        if decoded == KEY:
            print("OK", path, len(line), "chars, decoded matches")
        else:
            print("FAIL", path, "decoded mismatch")
    else:
        print("FAIL", path, len(matches), "matches")

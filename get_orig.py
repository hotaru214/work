import subprocess, sys, json
sys.stdout.reconfigure(encoding="utf-8")
orig = subprocess.check_output(["git","show","HEAD:client/src/api/client.ts"],
    cwd=r"C:\Users\50037\Desktop\work", encoding="utf-8")
print(json.dumps(orig))
import subprocess, sys
sys.stdout.reconfigure(encoding="utf-8")
orig = subprocess.check_output(["git","show","HEAD:client/src/api/client.ts"],
    cwd=r"C:\Users\50037\Desktop\work", encoding="utf-8")
print("Size:", len(orig))
open(r"C:\Users\50037\Desktop\work\test_out.txt","w",encoding="utf-8").write(orig[:200])


# Test the API via curl (JWT from Demo flow)

1. Start a demo session and grab the JWT:

```bash
TOKEN=$(curl -sS -X POST http://localhost:9001/api/user/auth/demo/start/ \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access"])')

echo "$TOKEN" | cut -c1-20
```

2. Create a tiny PNG on disk (for a valid upload):

```bash
# 1×1 transparent PNG (portable; no ImageMagick needed)
python3 - <<'PY'
from PIL import Image; Image.new("RGBA",(1,1),(0,0,0,0)).save("tiny.png")
print("tiny.png created")
PY
```

3. Call BeeFont **with** Authorization:

```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  -F image=@tiny.png -F family=BeeHand \
  http://localhost:9001/api/beefont/jobs | jq .
```

4. Poll job status (replace SID):

```bash
SID=xxxxxxxxxxxx
curl -sS -H "Authorization: Bearer $TOKEN" \
  http://localhost:9001/api/beefont/jobs/$SID | jq .
```

That should return `status: done` plus `ttf_path/zip_path`. If `/media/` is served in dev, the links will download.
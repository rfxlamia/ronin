# Plan A — Serverless Security Hardening

> **Scope**: `serverless/demo-proxy/` + `src/lib/ai/registry.ts`
> **Issues**: 5 issues (1 CRITICAL, 1 MEDIUM-security, 3 MEDIUM/LOW)
> **Risk**: Deployment ke AWS Lambda diperlukan; tidak menyentuh desktop app

---

## Issues yang Ditangani

| # | Severity | File | Masalah |
|---|----------|------|---------|
| 1 | CRITICAL | `ratelimit.mjs:107` | TOCTOU race condition — read-then-write non-atomic |
| 2 | CRITICAL | `registry.ts:24` | Lambda URL hardcoded di bundle binary |
| 3 | MEDIUM | `ratelimit.mjs:166` | `estimateTokens(number)` → NaN → token limit mati total |
| 4 | MEDIUM | `index.mjs:208` | Body size check setelah `JSON.parse` |
| 5 | LOW | `ratelimit.mjs:60` | Sliding window memperpanjang diri sendiri, bukan reset |

---

## Step 1 — Fix TOCTOU Race (ratelimit.mjs)

**Problem**: `checkRateLimit` → `getUsage` (READ) → `checkRateLimit` → `incrementUsage` → `getUsage` lagi (READ) → `PutCommand` (overwrite). Dua Lambda concurrent bisa sama-sama read count=9, sama-sama lolos, sama-sama increment ke 10.

**Fix**: Ganti read-then-write dengan satu `UpdateCommand` atomik + `ConditionExpression`. Import `UpdateCommand` dari `@aws-sdk/lib-dynamodb`.

Hapus fungsi `getUsage` dan `incrementUsage`. Ganti `checkRateLimit` dengan pattern atomik:

```javascript
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

async function atomicCheckAndIncrement(fingerprint, window, limit) {
  const ttl = window === 'hourly'
    ? Math.floor(Date.now() / 1000) + 3600
    : Math.floor(Date.now() / 1000) + 86400;

  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { fingerprint, window },
      UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :one, #ttl = :ttl',
      ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
      ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
      ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':limit': limit, ':ttl': ttl },
      ReturnValues: 'UPDATED_NEW',
    }));
    return { allowed: true, newCount: result.Attributes.count };
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return { allowed: false };
    }
    console.error('DynamoDB atomic increment error:', err);
    return { allowed: true, newCount: 0 }; // fail open
  }
}
```

Update `checkRateLimit` untuk memanggil `atomicCheckAndIncrement` untuk hourly dan daily secara paralel (`Promise.all`), lalu compute `remaining` dari `newCount` yang dikembalikan.

> **Catatan DynamoDB schema**: `ConditionExpression` di atas berfungsi karena DynamoDB mendukung atomic counter via `ADD` atau `SET if_not_exists + ConditionExpression`. Pastikan IAM role Lambda memiliki `dynamodb:UpdateItem` permission (biasanya sudah ada jika sebelumnya ada `PutItem`).

---

## Step 2 — Fix Token Limit Check (ratelimit.mjs)

**Problem**: `exceedsTokenLimit` menghitung `totalChars` (number) lalu memanggil `estimateTokens(totalChars)`. Di dalam `estimateTokens`, `text.length` pada number adalah `undefined` → `Math.ceil(undefined / 4)` = `NaN` → `NaN > 4000` = `false`. Token limit tidak pernah aktif.

**Fix**: Inline kalkulasi di `exceedsTokenLimit`, hilangkan pemanggilan `estimateTokens`:

```javascript
export function exceedsTokenLimit(requestBody) {
  const messages = requestBody.messages || [];
  const totalChars = messages.reduce((sum, msg) =>
    sum + (typeof msg.content === 'string' ? msg.content.length : 0), 0);
  return Math.ceil(totalChars / 4) > TOKEN_LIMIT;
}
```

Fungsi `estimateTokens` bisa dibiarkan untuk dokumentasi/ekspor, tapi jangan panggil dari `exceedsTokenLimit`.

---

## Step 3 — Fix Body Size Check Order (index.mjs)

**Problem**: `JSON.parse(event.body)` di baris 196 dieksekusi sebelum pengecekan 20KB di baris 208. Payload besar di-parse ke memory sebelum ditolak.

**Fix**: Pindahkan size check ke sebelum `JSON.parse`:

```javascript
// Validate request body size BEFORE parsing
if (event.body && event.body.length > 20480) {
  metadata.statusCode = 413;
  responseStream.write(JSON.stringify({
    error: 'payload_too_large',
    message: 'Request payload exceeds 20KB limit'
  }));
  responseStream.end();
  return;
}

// Parse request body
let requestBody;
try {
  requestBody = JSON.parse(event.body || '{}');
} catch (e) {
  // ... existing error handling
}
```

---

## Step 4 — Fix Hardcoded Lambda URL (registry.ts)

**Problem**: `process.env.DEMO_LAMBDA_URL || "https://dkm5aeebsg7dggdpwoovlbzjde0ayxyh.lambda-url.ap-southeast-2.on.aws/"` — fallback URL literal ter-bundle ke binary Tauri production.

**Fix**:

1. Di `vite.config.ts`, tambahkan define untuk inject env var:
```typescript
define: {
  'import.meta.env.VITE_DEMO_LAMBDA_URL': JSON.stringify(process.env.VITE_DEMO_LAMBDA_URL ?? ''),
}
```

2. Di `registry.ts`, ganti `process.env.DEMO_LAMBDA_URL || "..."` dengan:
```typescript
baseUrl: import.meta.env.VITE_DEMO_LAMBDA_URL ?? '',
```

3. Jika `VITE_DEMO_LAMBDA_URL` kosong, demo provider tidak bisa digunakan. Tambahkan guard di tempat demo mode diaktifkan: cek `baseUrl` tidak kosong sebelum membuat request.

4. Dokumentasikan di `.env.example`:
```
VITE_DEMO_LAMBDA_URL=https://your-lambda-url.on.aws/
```

---

## Step 5 — Dokumentasikan Window Behavior (ratelimit.mjs)

**Problem**: Komentar menyebut "sliding window" tapi perilaku aktual adalah fixed window yang di-refresh setiap request (timestamp diupdate setiap increment).

**Fix**: Setelah Step 1 (atomic rewrite), window behavior akan berubah karena kita tidak lagi menyimpan `timestamp` — kita menggunakan TTL DynamoDB. Perilaku baru: fixed window berbasis TTL DynamoDB. Update komentar di file untuk mendeskripsikan perilaku yang akurat.

---

## Deployment

Setelah semua perubahan di `serverless/demo-proxy/`:
```bash
# Deploy ke AWS Lambda (sesuaikan dengan setup deployment yang ada)
cd serverless/demo-proxy
# Deploy via AWS CLI / SAM / CDK sesuai setup yang ada
```

Registry.ts change: otomatis ter-apply saat `npm run tauri build`.

---

## Testing

- Unit test `exceedsTokenLimit` dengan input number vs string
- Unit test `atomicCheckAndIncrement` dengan mock DynamoDB yang simulate `ConditionalCheckFailedException`
- Manual test: kirim 2 concurrent request ke Lambda saat count=limit-1, pastikan hanya 1 yang lolos

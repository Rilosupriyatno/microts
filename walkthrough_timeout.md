# Walkthrough - Request Timeout Handling ⏱️

**Completed:** February 4, 2026  
**Status:** ✅ Implementation Complete (0% → 100%)

---

## Summary
Berhasil mengimplementasikan perlindungan terhadap request yang menggantung (hanging requests) dan query database yang lambat untuk menjaga ketersediaan resource server.

| Mode | Duration | Description |
|------|----------|-------------|
| **Global** | 30s | Batas waktu default untuk seluruh request Express |
| **Database** | 10s | `statement_timeout` pada PostgreSQL pool |
| **Override** | Variable | Dukungan timeout khusus untuk rute tertentu |

---

## Verification Results

### Test Case: Timeout Override
Jalankan pengujian pada endpoint `/test/timeout-override` yang diset 1 detik:
```bash
curl -i http://localhost:3000/test/timeout-override
```
- **Expected Result**: Response status 503 setelah 1 detik.
- **Actual Result**: 
```json
{
  "error": {
    "code": "REQUEST_TIMEOUT",
    "message": "Request took too long to process and was terminated.",
    "status": 503
  }
}
```
✅ **Status: PASSED**

---

## How to Test
Akses endpoint simulasi:
- `http://localhost:3000/test/timeout-override` (1s timeout)
- `http://localhost:3000/test/slow` (35s operation, will trigger global 30s timeout)

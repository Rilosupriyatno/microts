# Walkthrough - Error Response Standardization 🚨

**Completed:** February 4, 2026  
**Status:** ✅ Implementation Complete (50% → 100%)

---

## Summary
Menstandarisasi seluruh error response agar client (Frontend/External Service) dapat melakukan parsing dengan cara yang seragam dan predictable.

---

## Standard Format
Setiap error akan mengembalikan struktur JSON berikut:
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable message",
    "status": 400,
    "timestamp": "2026-02-04T10:50:49Z",
    "requestId": "UUID",
    "correlationId": "UUID"
  }
}
```

---

## Verification Proof

### Test Scenarios
- ✅ **404 Not Found**: Endpoint tidak terdaftar mengembalikan code `NOT_FOUND`.
- ✅ **401 Unauthorized**: Gagal login/auth mengembalikan code `UNAUTHORIZED`.
- ✅ **400 Validation**: Input salah mengembalikan code `VALIDATION_ERROR`.
- ✅ **503 Timeout**: Request timeout mengembalikan code `REQUEST_TIMEOUT`.

---

## Technical Artifacts
- **Tool**: [`src/utils/errors.ts`](file:///Users/rilobahtiar/Development/microts/src/utils/errors.ts) (AppError class)
- **Middleware**: [`src/middleware/errorHandler.ts`](file:///Users/rilobahtiar/Development/microts/src/middleware/errorHandler.ts) (Global response formatter)

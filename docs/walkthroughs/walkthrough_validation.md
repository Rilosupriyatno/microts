# Walkthrough: Request/Response Validation (Zod)

I have implemented robust request validation using **Zod** to ensure type safety and data integrity across the authentication endpoints.

## 🚀 Cara Penggunaan (Usage Guide)

### 1. Validasi Registrasi
Kirim request `POST` ke `/auth/register` dengan body JSON. Jika data tidak sesuai (misal: password < 8 karakter), API akan mengembalikan error 400.

**Contoh Gagal (Password terlalu pendek):**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "123"}'
```

### 2. Validasi Login
Kirim request `POST` ke `/auth/login`. Jika email tidak valid secara format, Zod akan menangkapnya sebelum diproses ke database.

---

## Perubahan yang Dilakukan

### 🛡️ Zod Schemas
Didefinisikan di `src/schemas/user.schema.ts`:
- **Register**: Validasi format email dan password minimal 8 karakter.
- **Login**: Validasi field email dan password wajib diisi.
- **Refresh**: Validasi kehadiran tokens.

### ⚙️ Validation Middleware
Dibuat di `src/middleware/validate.ts`:
- Menangani validasi `body`, `query`, dan `params`.
- Mengembalikan error terstandarisasi dengan detail field yang bermasalah.

### 🔗 Route Integration
Refaktor pada `src/auth.ts`:
- Menggantikan `express-validator` dengan Zod untuk validasi yang lebih kuat dan fleksibel.

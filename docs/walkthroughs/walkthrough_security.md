# Walkthrough: Security Hardening

I have implemented several security best practices to protect the microservice from common web vulnerabilities.

## 🚀 Cara Penggunaan (Usage Guide)

### 1. Verifikasi Security Headers
Gunakan `curl` untuk melihat header HTTP yang dikembalikan oleh server. Anda akan melihat header dari Helmet seperti `X-Frame-Options` dan `X-Content-Type-Options`.

```bash
curl -I http://localhost:3000/health
```

### 2. Pengetesan Limit Payload (Body Size)
API sekarang membatasi ukuran request JSON maksimal **10kb**. Anda bisa mencoba mengirim data JSON yang sangat besar (>10kb) dan server akan merespon dengan `413 Payload Too Large`.

### 3. Verifikasi CORS
Server hanya menerima request dari origin yang diizinkan. Jika Anda mengakses dari domain yang tidak terdaftar, browser akan memblokir request tersebut (atau Anda bisa test via header `Origin` di curl).

---

## Perubahan yang Dilakukan

### 🛡️ Secure HTTP Headers (Helmet)
Terintegrasi di `src/index.ts` untuk mengatur:
- **XSS Protection**
- **Clickjacking Protection**
- **Content Type Sniffing**
- **HSTS (Strict Transport Security)**

### 🌐 Cross-Origin Resource Sharing (CORS)
Konfigurasi di `src/index.ts`:
- Hanya mengizinkan domain tertentu (white-listed origins).
- Mendukung metode: `GET`, `POST`, `PUT`, `DELETE`.

### 📦 Request Payload Limits
Limitasi pada body parser di `src/index.ts`:
- **JSON & URL-Encoded**: Maksimal **10kb**.

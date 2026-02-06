# Walkthrough: Automated Testing

I have implemented a comprehensive automated testing suite using **Bun's built-in test runner** and **Supertest**.

## 🚀 Cara Penggunaan (Usage Guide)

### 1. Menjalankan Semua Test
Gunakan perintah berikut untuk menjalankan unit, integration, dan flow tests:
```bash
bun test
```

### 2. Cek Coverage (Laporan Cakupan Kode)
Untuk melihat seberapa banyak kode yang sudah tercover oleh test:
```bash
bun test --coverage
```

### 3. Menjalankan E2E Flow Test Secara Spesifik
Jika ingin mengetes lifecycle user secara lengkap (Register -> Login -> Profile -> Refresh -> Logout):
```bash
npm run test:e2e  # atau bun test src/*.flow.test.ts
```

### 4. Load Testing (Benchmarking)
Pastikan `k6` terinstall di sistem Anda, lalu jalankan:
```bash
npm run test:load # atau k6 run scripts/load-test.js
```

---

## Perubahan yang Dilakukan

### 🧪 Unit & Integration Tests
- **Auth.test.ts**: Mengetes logika token JWT.
- **Errors.test.ts**: Mengetes standarisasi error response.
- **Auth.integration.test.ts**: Mengetes endpoint API secara individual.

### 🔄 End-to-End (E2E) Testing
- **Auth.flow.test.ts**: Automasi skenario user dari awal hingga akhir (Registration hingga Logout).

### ⚡ Load Testing
- **scripts/load-test.js**: Simulasi beban trafik dengan 20 user concurrent untuk mencari bottleneck performa.

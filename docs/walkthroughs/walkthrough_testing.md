# Walkthrough: Automated Testing

I have implemented a comprehensive automated testing suite using **Bun's built-in test runner** and **Supertest**.

## 🚀 Cara Penggunaan (Usage Guide)

### 1. Menjalankan Semua Test (Urutan: Unit -> Integration -> E2E)
Gunakan perintah berikut untuk menjalankan seluruh rangkaian test secara sekuensial:
```bash
bun run test:all
```

### 2. Menjalankan Unit Tests Saja
```bash
bun run test:unit
```

### 3. Menjalankan Integration Tests Saja
```bash
bun run test:integration
```

### 4. Cek Coverage (Laporan Cakupan Kode)
```bash
bun test --coverage
```

### 5. Menjalankan E2E Flow Test Secara Spesifik
```bash
bun run test:e2e
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

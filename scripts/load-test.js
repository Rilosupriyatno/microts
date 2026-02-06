import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 }, // ramp up to 20 users
        { duration: '1m', target: 20 },  // stay at 20 users
        { duration: '10s', target: 0 },  // scale down to 0
    ],
    thresholds: {
        http_req_duration: ['p(95)<200'], // 95% of requests must complete below 200ms
        http_req_failed: ['rate<0.01'],   // less than 1% errors
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
    // 1. Health check (GET)
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
        'health status is 200': (r) => r.status === 200,
    });

    sleep(1);

    // 2. Login simulation (POST)
    const loginPayload = JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, params);
    check(loginRes, {
        'login returns 200 or 4xx (auth fails as expected)': (r) => [200, 401, 411, 429].includes(r.status),
    });

    sleep(1);
}

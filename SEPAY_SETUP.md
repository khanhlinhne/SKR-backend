# SePay Test Setup & Payment Flow

## 1) Tao tai khoan SePay test

1. Dang ky tai khoan SePay va xac minh doanh nghiep/ca nhan.
2. Tao 1 tai khoan ngan hang test (hoac lien ket tai khoan sandbox neu SePay cung cap).
3. Trong dashboard SePay:
   - Tao API key cho moi truong test.
   - Tao webhook URL tro ve backend:
     - `POST https://<your-domain>/api/payments/sepay/webhook`
   - Dat webhook secret (dung de verify callback).

## 2) Bien moi truong can cau hinh

Them vao `.env`:

```env
SEPAY_ENABLED=true
SEPAY_API_KEY=your_sepay_api_key
SEPAY_API_BASE_URL=https://api.sepay.vn
SEPAY_CREATE_ORDER_PATH=/v1/payment-requests
SEPAY_WEBHOOK_SECRET=your_webhook_secret
SEPAY_TIMEOUT_MS=15000

# Dung khi ban chay fallback transfer (khong goi create-order API)
SEPAY_BANK_CODE=MB
SEPAY_BANK_ACCOUNT_NUMBER=0123456789
SEPAY_BANK_ACCOUNT_NAME=SKR TEST
```

Neu chua co endpoint create order tren SePay (hoac muon test nhanh), de trong
`SEPAY_API_BASE_URL` rong, backend se tra ve thong tin chuyen khoan thu cong.

## 3) API da them

- `POST /api/payments/sepay/courses/:courseId/checkout`
- `POST /api/payments/sepay/packages/:packageId/checkout`
- `GET /api/payments/orders/:orderCode`
- `POST /api/payments/sepay/webhook`

## 4) Flow thanh toan khoa hoc (course)

1. Frontend goi `POST /api/payments/sepay/courses/:courseId/checkout`.
2. Backend tao:
   - `pmt_orders` (pending)
   - `pmt_order_items` (item_type = `course`)
   - `pmt_transactions` (pending, gan `sepay_order_code`)
3. Backend goi SePay create payment request.
4. Frontend hien thi QR/payment url de user thanh toan.
5. SePay goi webhook `/api/payments/sepay/webhook`.
6. Backend doi trang thai transaction/order -> `completed`, va tao/activate
   `pmt_course_purchases` cho user.

## 5) Flow thanh toan package

1. Frontend goi `POST /api/payments/sepay/packages/:packageId/checkout`.
2. Backend lay danh sach khoa hoc trong package ma user chua so huu.
3. Tao order pending + transaction pending.
4. Tao order items voi `item_type = course_included` cho tung khoa hoc.
5. Goi SePay create payment request va tra ve QR/payment url.
6. Khi webhook thanh cong:
   - Mark order/transaction `completed`
   - Grant `pmt_course_purchases` cho tat ca khoa hoc included trong package.

## 6) Luu y trien khai

- Webhook endpoint nen dat sau reverse proxy + HTTPS.
- Nen bat rate-limit/allowlist IP cho webhook (neu co danh sach IP SePay).
- Kiem tra `SEPAY_WEBHOOK_SECRET` trong header.
- Webhook can idempotent (code hien tai da tranh xu ly lai transaction completed).

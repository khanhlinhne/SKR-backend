const axios = require("axios");
const config = require("../config");
const AppError = require("../utils/AppError");

function asObject(data) {
  return data && typeof data === "object" ? data : {};
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function resolveCreateOrderPath() {
  const rawPath = String(config.sepay.createOrderPath || "").trim();
  if (!rawPath) {
    return "";
  }

  const accountId = String(config.sepay.bankAccountId || "").trim();
  if (!rawPath.includes("{ba_id}")) {
    return rawPath;
  }

  if (!accountId) {
    throw AppError.badRequest(
      "SEPAY_CREATE_ORDER_PATH contains {ba_id}. Please set SEPAY_BANK_ACCOUNT_ID in .env"
    );
  }

  return rawPath.replaceAll("{ba_id}", encodeURIComponent(accountId));
}

const sepayService = {
  async createPaymentRequest({ orderCode, amount, description, metadata = {} }) {
    if (!config.sepay.enabled) {
      throw AppError.badRequest("SePay is not enabled. Please set SEPAY_ENABLED=true");
    }

    const payload = {
      orderCode,
      amount,
      description,
      metadata,
    };

    // Fallback mode: no create API URL, use static transfer information.
    if (!config.sepay.apiBaseUrl) {
      return {
        sepayOrderCode: orderCode,
        paymentUrl: null,
        qrCode: null,
        transferInfo: {
          bankCode: config.sepay.bankCode || "",
          accountNumber: config.sepay.bankAccountNumber || "",
          accountName: config.sepay.bankAccountName || "",
          transferContent: orderCode,
          amount,
        },
        raw: { mode: "manual_transfer", payload },
      };
    }

    const createOrderPath = resolveCreateOrderPath();
    const url = `${config.sepay.apiBaseUrl}${createOrderPath}`;
    const headers = {
      "Content-Type": "application/json",
      ...(config.sepay.apiKey ? { Authorization: `Bearer ${config.sepay.apiKey}` } : {}),
      ...(config.sepay.apiKey ? { "x-api-key": config.sepay.apiKey } : {}),
    };

    try {
      const response = await axios.post(url, payload, {
        headers,
        timeout: config.sepay.timeoutMs,
      });

      const body = asObject(response.data);
      const data = asObject(body.data);

      return {
        sepayOrderCode: pickFirst(
          data.orderCode,
          data.order_code,
          body.orderCode,
          body.order_code,
          orderCode
        ),
        sepayTransactionId: pickFirst(
          data.transactionId,
          data.transaction_id,
          body.transactionId,
          body.transaction_id
        ),
        paymentUrl: pickFirst(
          data.paymentUrl,
          data.payment_url,
          data.checkoutUrl,
          body.paymentUrl,
          body.payment_url
        ),
        qrCode: pickFirst(
          data.qrCode,
          data.qr_code,
          data.qrImage,
          body.qrCode,
          body.qr_code
        ),
        transferInfo: {
          bankCode: pickFirst(data.bankCode, data.bank_code, body.bankCode, body.bank_code),
          accountNumber: pickFirst(
            data.accountNumber,
            data.account_number,
            body.accountNumber,
            body.account_number
          ),
          accountName: pickFirst(
            data.accountName,
            data.account_name,
            body.accountName,
            body.account_name
          ),
          transferContent: pickFirst(
            data.transferContent,
            data.transfer_content,
            body.transferContent,
            body.transfer_content,
            orderCode
          ),
          amount,
        },
        raw: body,
      };
    } catch (error) {
      const gatewayData = asObject(error.response?.data);
      const gatewayMessage =
        gatewayData.message || gatewayData.error || error.message || "SePay create request failed";

      throw AppError.badGateway(gatewayMessage);
    }
  },
};

module.exports = sepayService;

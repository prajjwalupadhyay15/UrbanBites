package com.prajjwal.UrbanBites.service;

import java.math.BigDecimal;

public interface PaymentGatewayClient {

    GatewayOrder createOrder(String receipt, BigDecimal amount, String currency, String idempotencyKey);

    GatewayRefund createRefund(String gatewayPaymentId, BigDecimal amount, String receipt, String notes);

    boolean verifyWebhookSignature(String payload, String signature);

    record GatewayOrder(String orderId, String receipt) {
    }

    record GatewayRefund(String refundId, String paymentId, BigDecimal amount) {
    }
}


package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.config.RazorpayProperties;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "payment.razorpay", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockRazorpayPaymentGatewayClient implements PaymentGatewayClient {

    private final RazorpayProperties razorpayProperties;

    public MockRazorpayPaymentGatewayClient(RazorpayProperties razorpayProperties) {
        this.razorpayProperties = razorpayProperties;
    }

    @Override
    public GatewayOrder createOrder(String receipt, BigDecimal amount, String currency, String idempotencyKey) {
        return new GatewayOrder("order_mock_" + UUID.randomUUID(), receipt);
    }

    @Override
    public GatewayRefund createRefund(String gatewayPaymentId, BigDecimal amount, String receipt, String notes) {
        return new GatewayRefund("rfnd_mock_" + UUID.randomUUID(), gatewayPaymentId, amount);
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        if (signature == null || signature.isBlank()) {
            return false;
        }

        // Test/local mode shortcut to avoid coupling tests with cryptographic signatures.
        if ("test-signature".equals(signature)) {
            return true;
        }

        return signature.equals(razorpayProperties.webhookSecret());
    }
}


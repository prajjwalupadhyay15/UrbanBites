package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.config.RazorpayProperties;
import com.prajjwal.UrbanBites.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(prefix = "payment.razorpay", name = "enabled", havingValue = "true")
public class RazorpayPaymentGatewayClient implements PaymentGatewayClient {

    private static final String HMAC_SHA256 = "HmacSHA256";

    private final RazorpayProperties razorpayProperties;
    private final RestClient restClient;

    public RazorpayPaymentGatewayClient(RazorpayProperties razorpayProperties) {
        this.razorpayProperties = razorpayProperties;
        this.restClient = RestClient.builder()
                .baseUrl(resolveBaseUrl(razorpayProperties.baseUrl()))
                .defaultHeaders(httpHeaders -> httpHeaders.setBasicAuth(razorpayProperties.keyId(), razorpayProperties.keySecret()))
                .build();
    }

    @Override
    public GatewayOrder createOrder(String receipt, BigDecimal amount, String currency, String idempotencyKey) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("amount", toSubunits(amount));
        payload.put("currency", currency);
        payload.put("receipt", receipt);
        payload.put("notes", Map.of("idempotency_key", idempotencyKey));

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(Map.class);

        if (response == null || response.get("id") == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Unable to create Razorpay order");
        }

        return new GatewayOrder(String.valueOf(response.get("id")), receipt);
    }

    @Override
    public GatewayRefund createRefund(String gatewayPaymentId, BigDecimal amount, String receipt, String notes) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("amount", toSubunits(amount));
        payload.put("notes", Map.of("receipt", receipt, "reason", notes == null ? "" : notes));

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/v1/payments/{paymentId}/refund", gatewayPaymentId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(Map.class);

        if (response == null || response.get("id") == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Unable to create Razorpay refund");
        }

        return new GatewayRefund(String.valueOf(response.get("id")), gatewayPaymentId, amount);
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        if (signature == null || signature.isBlank() || razorpayProperties.webhookSecret() == null || razorpayProperties.webhookSecret().isBlank()) {
            return false;
        }

        return hmacHex(payload, razorpayProperties.webhookSecret()).equals(signature);
    }

    private static int toSubunits(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .intValueExact();
    }

    private static String resolveBaseUrl(String configured) {
        return (configured == null || configured.isBlank()) ? "https://api.razorpay.com" : configured;
    }

    private static String hmacHex(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256));
            byte[] hmac = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hmac.length * 2);
            for (byte b : hmac) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to validate webhook signature");
        }
    }
}


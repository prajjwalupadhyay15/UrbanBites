package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.response.WebhookAckResponse;
import com.prajjwal.UrbanBites.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final OrderService orderService;

    public PaymentController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<WebhookAckResponse> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature
    ) {
        String status = orderService.handleRazorpayWebhook(payload, signature);
        return ResponseEntity.ok(new WebhookAckResponse(status));
    }
}



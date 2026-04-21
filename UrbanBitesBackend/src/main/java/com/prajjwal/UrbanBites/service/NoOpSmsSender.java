package com.prajjwal.UrbanBites.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.sms", name = "enabled", havingValue = "false", matchIfMissing = true)
public class NoOpSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(NoOpSmsSender.class);

    @PostConstruct
    void onInit() {
        log.warn("SMS sending is disabled (app.sms.enabled=false). Using NoOpSmsSender.");
    }

    @Override
    public void sendOtp(String phoneNumber, String fullName, String otpCode, String expiresAt) {
        log.debug("Skipped sendOtp to {}", phoneNumber);
    }

    @Override
    public void sendTransactionalMessage(String phoneNumber, String fullName, String title, String message, String referenceLabel) {
        log.debug("Skipped sendTransactionalMessage to {}", phoneNumber);
    }
}


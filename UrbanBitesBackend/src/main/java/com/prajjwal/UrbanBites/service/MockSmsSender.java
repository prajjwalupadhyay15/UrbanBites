package com.prajjwal.UrbanBites.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.sms", name = "enabled", havingValue = "true")
public class MockSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(MockSmsSender.class);

    @Override
    public void sendOtp(String phoneNumber, String fullName, String otpCode, String expiresAt) {
        log.info("Mock SMS OTP sent. phone={}, expiresAt={}", normalize(phoneNumber), expiresAt);
    }

    @Override
    public void sendTransactionalMessage(String phoneNumber, String fullName, String title, String message, String referenceLabel) {
        log.info("Mock SMS notification sent. phone={}, title={}, reference={}", normalize(phoneNumber), title, referenceLabel);
    }

    private String normalize(String phoneNumber) {
        return phoneNumber == null ? "" : phoneNumber.trim();
    }
}


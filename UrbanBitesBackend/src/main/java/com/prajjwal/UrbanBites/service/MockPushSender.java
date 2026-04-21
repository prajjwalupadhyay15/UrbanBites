package com.prajjwal.UrbanBites.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.push", name = "enabled", havingValue = "true")
public class MockPushSender implements PushSender {

    private static final Logger log = LoggerFactory.getLogger(MockPushSender.class);

    @Override
    public void send(String recipientTokenOrUserRef, String title, String message, String referenceLabel) {
        log.info("Mock push sent. recipient={}, title={}, reference={}", normalize(recipientTokenOrUserRef), title, referenceLabel);
    }

    private String normalize(String recipientTokenOrUserRef) {
        return recipientTokenOrUserRef == null ? "" : recipientTokenOrUserRef.trim();
    }
}


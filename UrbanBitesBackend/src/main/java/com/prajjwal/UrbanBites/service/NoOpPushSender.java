package com.prajjwal.UrbanBites.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.push", name = "enabled", havingValue = "false", matchIfMissing = true)
public class NoOpPushSender implements PushSender {

    private static final Logger log = LoggerFactory.getLogger(NoOpPushSender.class);

    @PostConstruct
    void onInit() {
        log.warn("Push sending is disabled (app.push.enabled=false). Using NoOpPushSender.");
    }

    @Override
    public void send(String recipientTokenOrUserRef, String title, String message, String referenceLabel) {
        log.debug("Skipped push send to {}", recipientTokenOrUserRef);
    }
}


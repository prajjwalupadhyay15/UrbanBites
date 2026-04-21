package com.prajjwal.UrbanBites.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dispatch")
public record DispatchProperties(
        long offerTtlSeconds,
        int maxAttempts,
        long reassignmentCooldownSeconds,
        long noAgentRetryWindowSeconds,
        long noAgentRetryIntervalSeconds,
        long maxLocationAgeSeconds,
        long pickupSlaSeconds
) {
}


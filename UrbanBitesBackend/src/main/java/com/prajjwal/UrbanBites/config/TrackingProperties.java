package com.prajjwal.UrbanBites.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "tracking")
public record TrackingProperties(
        double assumedSpeedKmph,
        int maxTimelinePoints,
        double smoothingAlpha,
        double maxJumpKm,
        int minPingIntervalSeconds,
        double minEmitDistanceMeters,
        int minEmitEtaDeltaMinutes
) {
}


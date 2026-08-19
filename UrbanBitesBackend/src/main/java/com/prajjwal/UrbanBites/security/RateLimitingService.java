package com.prajjwal.UrbanBites.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class RateLimitingService {

    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> otpBuckets = new ConcurrentHashMap<>();

    private final Bandwidth loginLimit;
    private final Bandwidth otpLimit;

    public RateLimitingService(org.springframework.core.env.Environment env) {
        int loginCapacity = 10000;
        int otpCapacity = 10000;
        
        this.loginLimit = Bandwidth.classic(loginCapacity, Refill.intervally(loginCapacity, Duration.ofMinutes(1)));
        this.otpLimit = Bandwidth.classic(otpCapacity, Refill.intervally(otpCapacity, Duration.ofMinutes(1)));
    }

    public Bucket resolveLoginBucket(String ipAddress) {
        return loginBuckets.computeIfAbsent(ipAddress, k -> Bucket.builder().addLimit(loginLimit).build());
    }

    public Bucket resolveOtpBucket(String ipAddress) {
        return otpBuckets.computeIfAbsent(ipAddress, k -> Bucket.builder().addLimit(otpLimit).build());
    }
}

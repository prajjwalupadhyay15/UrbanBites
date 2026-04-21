package com.prajjwal.UrbanBites.service;

public interface SmsSender {
    void sendOtp(String phoneNumber, String fullName, String otpCode, String expiresAt);

    void sendTransactionalMessage(String phoneNumber, String fullName, String title, String message, String referenceLabel);
}


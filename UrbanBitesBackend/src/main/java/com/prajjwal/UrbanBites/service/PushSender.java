package com.prajjwal.UrbanBites.service;

public interface PushSender {
    void send(String recipientTokenOrUserRef, String title, String message, String referenceLabel);
}


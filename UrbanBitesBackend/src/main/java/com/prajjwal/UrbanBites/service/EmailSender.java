package com.prajjwal.UrbanBites.service;

public interface EmailSender {
	void sendPasswordResetOtp(String toEmail, String fullName, String otpCode, String expiresAt);

	void sendEmailVerificationOtp(String toEmail, String fullName, String otpCode, String expiresAt);

	void sendTransactionalUpdate(String toEmail, String fullName, String title, String message, String referenceLabel);

	void sendOrderConfirmation(String toEmail, String fullName, String title, String message, String referenceLabel);

	void sendOrderDelivered(String toEmail, String fullName, String title, String message, String referenceLabel);

	void sendOrderCancelled(String toEmail, String fullName, String title, String message, String referenceLabel);

	void sendPaymentReceipt(String toEmail, String fullName, String title, String message, String referenceLabel);

	void sendRefundConfirmation(String toEmail, String fullName, String title, String message, String referenceLabel);

	void sendApprovalStatusUpdate(String toEmail, String fullName, String title, String message, String referenceLabel);

	void sendWelcomeEmail(String toEmail, String fullName);

	void sendPartnerSignupEmail(String toEmail, String fullName, String partnerType);

	void sendRestaurantOnboardingStatus(String toEmail, String fullName, String restaurantName, String title, String message);

	void sendRestaurantApprovalStatus(String toEmail, String fullName, String restaurantName, boolean approved);

	void sendNewLoginAlert(String toEmail, String fullName, String ipAddress, String locationLabel, String deviceInfo, String loginAt);

	void sendUnknownLoginAlert(String toEmail, String fullName, String ipAddress, String locationLabel, String deviceInfo, String loginAt);
}


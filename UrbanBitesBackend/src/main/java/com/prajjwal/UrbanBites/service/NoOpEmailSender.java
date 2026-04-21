package com.prajjwal.UrbanBites.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.email", name = "enabled", havingValue = "false", matchIfMissing = true)
public class NoOpEmailSender implements EmailSender {

	private static final Logger log = LoggerFactory.getLogger(NoOpEmailSender.class);

	@PostConstruct
	void onInit() {
		log.warn("Email sending is disabled (app.email.enabled=false). Using NoOpEmailSender.");
	}

	@Override
	public void sendPasswordResetOtp(String toEmail, String fullName, String otpCode, String expiresAt) {
		log.debug("Skipped sendPasswordResetOtp to {}", toEmail);
	}

	@Override
	public void sendEmailVerificationOtp(String toEmail, String fullName, String otpCode, String expiresAt) {
		log.debug("Skipped sendEmailVerificationOtp to {}", toEmail);
	}

	@Override
	public void sendTransactionalUpdate(String toEmail, String fullName, String title, String message, String referenceLabel) {
		log.debug("Skipped sendTransactionalUpdate to {}", toEmail);
	}

	@Override
	public void sendOrderConfirmation(String toEmail, String fullName, String title, String message, String referenceLabel) {
		log.debug("Skipped sendOrderConfirmation to {}", toEmail);
	}

	@Override
	public void sendOrderDelivered(String toEmail, String fullName, String title, String message, String referenceLabel) {
		log.debug("Skipped sendOrderDelivered to {}", toEmail);
	}

	@Override
	public void sendPaymentReceipt(String toEmail, String fullName, String title, String message, String referenceLabel) {
		log.debug("Skipped sendPaymentReceipt to {}", toEmail);
	}

	@Override
	public void sendRefundConfirmation(String toEmail, String fullName, String title, String message, String referenceLabel) {
		log.debug("Skipped sendRefundConfirmation to {}", toEmail);
	}

	@Override
	public void sendApprovalStatusUpdate(String toEmail, String fullName, String title, String message, String referenceLabel) {
		log.debug("Skipped sendApprovalStatusUpdate to {}", toEmail);
	}

	@Override
	public void sendWelcomeEmail(String toEmail, String fullName) {
		log.debug("Skipped sendWelcomeEmail to {}", toEmail);
	}

	@Override
	public void sendPartnerSignupEmail(String toEmail, String fullName, String partnerType) {
		log.debug("Skipped sendPartnerSignupEmail to {}", toEmail);
	}

	@Override
	public void sendRestaurantOnboardingStatus(String toEmail, String fullName, String restaurantName, String title, String message) {
		log.debug("Skipped sendRestaurantOnboardingStatus to {}", toEmail);
	}

	@Override
	public void sendRestaurantApprovalStatus(String toEmail, String fullName, String restaurantName, boolean approved) {
		log.debug("Skipped sendRestaurantApprovalStatus to {}", toEmail);
	}

	@Override
	public void sendNewLoginAlert(String toEmail, String fullName, String ipAddress, String locationLabel, String deviceInfo, String loginAt) {
		log.debug("Skipped sendNewLoginAlert to {}", toEmail);
	}

	@Override
	public void sendUnknownLoginAlert(String toEmail, String fullName, String ipAddress, String locationLabel, String deviceInfo, String loginAt) {
		log.debug("Skipped sendUnknownLoginAlert to {}", toEmail);
	}
}

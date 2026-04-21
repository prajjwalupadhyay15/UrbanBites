package com.prajjwal.UrbanBites.util;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class EmailTemplateUtil {

	private final String passwordResetTemplate;
	private final String emailVerificationTemplate;
	private final String transactionalTemplate;
	private final String welcomeTemplate;
	private final String loginAlertTemplate;
	private final String partnerSignupTemplate;
	private final String restaurantOnboardingTemplate;
	private final String orderConfirmationTemplate;
	private final String orderDeliveredTemplate;
	private final String paymentReceiptTemplate;
	private final String refundConfirmationTemplate;
	private final String approvalStatusTemplate;

	public EmailTemplateUtil() {
		this.passwordResetTemplate = loadTemplate("templates/password-reset-otp.html");
		this.emailVerificationTemplate = loadTemplate("templates/email-verification-otp.html");
		this.transactionalTemplate = loadTemplate("templates/transactional-email.html");
		this.welcomeTemplate = loadTemplate("templates/welcome-email.html");
		this.loginAlertTemplate = loadTemplate("templates/login-alert-email.html");
		this.partnerSignupTemplate = loadTemplate("templates/partner-signup-email.html");
		this.restaurantOnboardingTemplate = loadTemplate("templates/restaurant-onboarding-email.html");
		this.orderConfirmationTemplate = loadTemplate("templates/order-confirmation-email.html");
		this.orderDeliveredTemplate = loadTemplate("templates/order-delivered-email.html");
		this.paymentReceiptTemplate = loadTemplate("templates/payment-receipt-email.html");
		this.refundConfirmationTemplate = loadTemplate("templates/refund-confirmation-email.html");
		this.approvalStatusTemplate = loadTemplate("templates/approval-status-email.html");
	}

	public String renderPasswordResetOtpTemplate(String fullName, String otp, String expiresAt) {
		return passwordResetTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{otp}}", safe(otp))
				.replace("{{expiresAt}}", safe(expiresAt));
	}

	public String renderEmailVerificationOtpTemplate(String fullName, String otp, String expiresAt) {
		return emailVerificationTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{otp}}", safe(otp))
				.replace("{{expiresAt}}", safe(expiresAt));
	}

	public String renderTransactionalTemplate(String fullName, String title, String message, String referenceLabel) {
		return transactionalTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel));
	}

	public String renderWelcomeTemplate(String fullName) {
		return welcomeTemplate
				.replace("{{name}}", safe(fullName));
	}

	public String renderLoginAlertTemplate(String fullName, String ipAddress, String locationLabel, String deviceInfo, String loginAt) {
		return loginAlertTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{ipAddress}}", safe(ipAddress))
				.replace("{{locationLabel}}", safe(locationLabel))
				.replace("{{deviceInfo}}", safe(deviceInfo))
				.replace("{{loginAt}}", safe(loginAt));
	}

	public String renderPartnerSignupTemplate(String fullName, String partnerType) {
		return partnerSignupTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{partnerType}}", safe(partnerType));
	}

	public String renderRestaurantOnboardingTemplate(String fullName, String restaurantName, String title, String message) {
		return restaurantOnboardingTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{restaurantName}}", safe(restaurantName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message));
	}

	public String renderOrderConfirmationTemplate(String fullName, String title, String message, String referenceLabel) {
		return orderConfirmationTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel));
	}

	public String renderOrderDeliveredTemplate(String fullName, String title, String message, String referenceLabel) {
		return orderDeliveredTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel));
	}

	public String renderPaymentReceiptTemplate(String fullName, String title, String message, String referenceLabel) {
		return paymentReceiptTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel));
	}

	public String renderRefundConfirmationTemplate(String fullName, String title, String message, String referenceLabel) {
		return refundConfirmationTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel));
	}

	public String renderApprovalStatusTemplate(String fullName, String title, String message, String referenceLabel) {
		return approvalStatusTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel));
	}

	private String loadTemplate(String path) {
		try {
			ClassPathResource resource = new ClassPathResource(path);
			return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
		} catch (IOException ex) {
			throw new IllegalStateException("Unable to load template " + path, ex);
		}
	}

	private String safe(String value) {
		String text = (value == null || value.isBlank()) ? "Customer" : value;
		return text.replace("&", "&amp;")
				.replace("<", "&lt;")
				.replace(">", "&gt;")
				.replace("\"", "&quot;")
				.replace("'", "&#39;");
	}
}


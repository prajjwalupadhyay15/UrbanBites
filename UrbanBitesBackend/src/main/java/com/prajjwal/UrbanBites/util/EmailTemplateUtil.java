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
	private final String orderCancelledTemplate;
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
		this.orderCancelledTemplate = loadTemplate("templates/order-cancelled-email.html");
		this.paymentReceiptTemplate = loadTemplate("templates/payment-receipt-email.html");
		this.refundConfirmationTemplate = loadTemplate("templates/refund-confirmation-email.html");
		this.approvalStatusTemplate = loadTemplate("templates/approval-status-email.html");
	}

	public String renderPasswordResetOtpTemplate(String fullName, String otp, String expiresAt) {
					return applyBrandTheme(passwordResetTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{otp}}", safe(otp))
							.replace("{{expiresAt}}", safe(expiresAt)));
	}

	public String renderEmailVerificationOtpTemplate(String fullName, String otp, String expiresAt) {
		return applyBrandTheme(emailVerificationTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{otp}}", safe(otp))
				.replace("{{expiresAt}}", safe(expiresAt)));
	}

	public String renderTransactionalTemplate(String fullName, String title, String message, String referenceLabel) {
		return applyBrandTheme(transactionalTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel)));
	}

	public String renderWelcomeTemplate(String fullName) {
		return applyBrandTheme(welcomeTemplate
				.replace("{{name}}", safe(fullName)));
	}

	public String renderLoginAlertTemplate(String fullName, String ipAddress, String locationLabel, String deviceInfo, String loginAt) {
		return applyBrandTheme(loginAlertTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{ipAddress}}", safe(ipAddress))
				.replace("{{locationLabel}}", safe(locationLabel))
				.replace("{{deviceInfo}}", safe(deviceInfo))
				.replace("{{loginAt}}", safe(loginAt)));
	}

	public String renderPartnerSignupTemplate(String fullName, String partnerType) {
		return applyBrandTheme(partnerSignupTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{partnerType}}", safe(partnerType)));
	}

	public String renderRestaurantOnboardingTemplate(String fullName, String restaurantName, String title, String message) {
		return applyBrandTheme(restaurantOnboardingTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{restaurantName}}", safe(restaurantName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message)));
	}

	public String renderOrderConfirmationTemplate(String fullName, String title, String message, String referenceLabel) {
		return applyBrandTheme(orderConfirmationTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel)));
	}

	public String renderOrderDeliveredTemplate(String fullName, String title, String message, String referenceLabel) {
		return applyBrandTheme(orderDeliveredTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel)));
	}

	public String renderOrderCancelledTemplate(String fullName, String title, String message, String referenceLabel) {
		return applyBrandTheme(orderCancelledTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel)));
	}

	public String renderPaymentReceiptTemplate(String fullName, String title, String message, String referenceLabel) {
		return applyBrandTheme(paymentReceiptTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel)));
	}

	public String renderRefundConfirmationTemplate(String fullName, String title, String message, String referenceLabel) {
		return applyBrandTheme(refundConfirmationTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel)));
	}

	public String renderApprovalStatusTemplate(String fullName, String title, String message, String referenceLabel) {
		return applyBrandTheme(approvalStatusTemplate
				.replace("{{name}}", safe(fullName))
				.replace("{{title}}", safe(title))
				.replace("{{message}}", safe(message))
				.replace("{{referenceLabel}}", safe(referenceLabel)));
	}

	private String applyBrandTheme(String html) {
		String themed = html
				.replace("#06b6d4", "#F7B538")
				.replace("#3b82f6", "#780116")
				.replace("#ff6a00", "#F7B538")
				.replace("#ff3d67", "#780116")
				.replace("#16a34a", "#F7B538")
				.replace("#22c55e", "#780116")
				.replace("#111827", "#780116")
				.replace("#2563eb", "#780116");

		String bodyContent = extractBodyContent(themed);
		return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"/>"
				+ "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>"
				+ "</head><body style=\"margin:0;padding:0;background:#fffaf2;font-family:Arial,sans-serif;\">"
				+ "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:24px 0;background:#fffaf2;\">"
				+ "<tr><td align=\"center\"><div style=\"max-width:680px;margin:0 auto;\">"
				+ bodyContent
				+ "</div></td></tr></table></body></html>";
	}

	private String extractBodyContent(String html) {
		if (html == null || html.isBlank()) {
			return "";
		}
		String lower = html.toLowerCase();
		int bodyStart = lower.indexOf("<body");
		if (bodyStart < 0) {
			return html;
		}
		int bodyOpenEnd = html.indexOf('>', bodyStart);
		if (bodyOpenEnd < 0) {
			return html;
		}
		int bodyEnd = lower.indexOf("</body>", bodyOpenEnd);
		if (bodyEnd < 0) {
			return html.substring(bodyOpenEnd + 1);
		}
		return html.substring(bodyOpenEnd + 1, bodyEnd);
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


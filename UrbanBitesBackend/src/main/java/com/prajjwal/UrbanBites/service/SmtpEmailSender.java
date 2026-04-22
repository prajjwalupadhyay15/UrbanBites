package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.util.EmailTemplateUtil;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.email", name = "enabled", havingValue = "true")
public class SmtpEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailSender.class);

    private final JavaMailSender mailSender;
    private final EmailTemplateUtil emailTemplateUtil;
    private final String fromEmail;
    private final Map<String, OffsetDateTime> recentSends = new ConcurrentHashMap<>();
    private static final Duration DEDUPE_WINDOW = Duration.ofMinutes(5);

    public SmtpEmailSender(JavaMailSender mailSender,
                           EmailTemplateUtil emailTemplateUtil,
                           @Value("${app.email.from:noreply@urbanbites.com}") String fromEmail) {
        this.mailSender = mailSender;
        this.emailTemplateUtil = emailTemplateUtil;
        this.fromEmail = fromEmail;
    }

    @Override
    public void sendPasswordResetOtp(String toEmail, String fullName, String otpCode, String expiresAt) {
        String html = emailTemplateUtil.renderPasswordResetOtpTemplate(fullName, otpCode, expiresAt);
        sendHtmlEmail(toEmail, "UrbanBites Password Reset OTP", html);
    }

    @Override
    public void sendEmailVerificationOtp(String toEmail, String fullName, String otpCode, String expiresAt) {
        String html = emailTemplateUtil.renderEmailVerificationOtpTemplate(fullName, otpCode, expiresAt);
        sendHtmlEmail(toEmail, "UrbanBites Email Verification OTP", html);
    }

    @Override
    public void sendTransactionalUpdate(String toEmail, String fullName, String title, String message, String referenceLabel) {
        String html = emailTemplateUtil.renderTransactionalTemplate(fullName, title, message, referenceLabel);
        sendHtmlEmail(toEmail, "UrbanBites Update", html);
    }

    @Override
    public void sendOrderConfirmation(String toEmail, String fullName, String title, String message, String referenceLabel) {
        String html = emailTemplateUtil.renderOrderConfirmationTemplate(fullName, title, message, referenceLabel);
        sendHtmlEmail(toEmail, "UrbanBites Order Confirmation", html);
    }

    @Override
    public void sendOrderDelivered(String toEmail, String fullName, String title, String message, String referenceLabel) {
        String html = emailTemplateUtil.renderOrderDeliveredTemplate(fullName, title, message, referenceLabel);
        sendHtmlEmail(toEmail, "UrbanBites Order Delivered", html);
    }

    @Override
    public void sendOrderCancelled(String toEmail, String fullName, String title, String message, String referenceLabel) {
        String html = emailTemplateUtil.renderOrderCancelledTemplate(fullName, title, message, referenceLabel);
        sendHtmlEmail(toEmail, "UrbanBites Order Cancelled", html);
    }

    @Override
    public void sendPaymentReceipt(String toEmail, String fullName, String title, String message, String referenceLabel) {
        String html = emailTemplateUtil.renderPaymentReceiptTemplate(fullName, title, message, referenceLabel);
        sendHtmlEmail(toEmail, "UrbanBites Payment Receipt", html);
    }

    @Override
    public void sendRefundConfirmation(String toEmail, String fullName, String title, String message, String referenceLabel) {
        String html = emailTemplateUtil.renderRefundConfirmationTemplate(fullName, title, message, referenceLabel);
        sendHtmlEmail(toEmail, "UrbanBites Refund Confirmation", html);
    }

    @Override
    public void sendApprovalStatusUpdate(String toEmail, String fullName, String title, String message, String referenceLabel) {
        String html = emailTemplateUtil.renderApprovalStatusTemplate(fullName, title, message, referenceLabel);
        sendHtmlEmail(toEmail, "UrbanBites Approval Status", html);
    }

    @Override
    public void sendWelcomeEmail(String toEmail, String fullName) {
        String html = emailTemplateUtil.renderWelcomeTemplate(fullName);
        sendHtmlEmail(toEmail, "Welcome to UrbanBites", html);
    }

    @Override
    public void sendPartnerSignupEmail(String toEmail, String fullName, String partnerType) {
        String html = emailTemplateUtil.renderPartnerSignupTemplate(fullName, partnerType);
        sendHtmlEmail(toEmail, "UrbanBites Partner Onboarding", html);
    }

    @Override
    public void sendRestaurantOnboardingStatus(String toEmail, String fullName, String restaurantName, String title, String message) {
        String html = emailTemplateUtil.renderRestaurantOnboardingTemplate(fullName, restaurantName, title, message);
        sendHtmlEmail(toEmail, "UrbanBites Restaurant Onboarding Update", html);
    }

    @Override
    public void sendRestaurantApprovalStatus(String toEmail, String fullName, String restaurantName, boolean approved) {
        String title = approved ? "Restaurant approved" : "Restaurant approval pending";
        String message = approved
                ? "Your restaurant is now approved and discoverable on UrbanBites."
                : "Your restaurant approval is still pending. Please check your onboarding details.";
        String html = emailTemplateUtil.renderRestaurantOnboardingTemplate(fullName, restaurantName, title, message);
        sendHtmlEmail(toEmail, "UrbanBites Restaurant Approval Status", html);
    }

    @Override
    public void sendNewLoginAlert(String toEmail, String fullName, String ipAddress, String locationLabel, String deviceInfo, String loginAt) {
        String html = emailTemplateUtil.renderLoginAlertTemplate(fullName, ipAddress, locationLabel, deviceInfo, loginAt);
        sendHtmlEmail(toEmail, "Security Notice: New Login", html);
    }

    @Override
    public void sendUnknownLoginAlert(String toEmail, String fullName, String ipAddress, String locationLabel, String deviceInfo, String loginAt) {
        String html = emailTemplateUtil.renderLoginAlertTemplate(fullName, ipAddress, locationLabel, deviceInfo, loginAt);
        sendHtmlEmail(toEmail, "Security Alert: New Login Detected", html);
    }

    private void sendHtmlEmail(String toEmail, String subject, String html) {
        String recipient = toEmail == null ? "" : toEmail.trim();
        if (recipient.isEmpty()) {
            log.warn("Skipping email send because recipient is blank. subject={}", subject);
            return;
        }

        String dedupeKey = buildDedupeKey(recipient, subject, html);
        if (isRecentlySent(dedupeKey)) {
            log.info("Skipping duplicate email within dedupe window. to={}, subject={}", recipient, subject);
            return;
        }

        try {
            var mimeMessage = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(html, true);
            if (isImportantSubject(subject)) {
                mimeMessage.addHeader("X-Priority", "1");
                mimeMessage.addHeader("Priority", "urgent");
                mimeMessage.addHeader("Importance", "high");
            }
            mailSender.send(mimeMessage);
            recentSends.put(dedupeKey, OffsetDateTime.now());
            log.info("Email sent. to={}, subject={}", recipient, subject);
        } catch (Exception ex) {
            log.error("Email send failed. to={}, subject={}, from={}", recipient, subject, fromEmail, ex);
            throw new IllegalStateException("Failed to send email to " + recipient + " with subject " + subject, ex);
        }
    }

    private String buildDedupeKey(String recipient, String subject, String html) {
        int bodyHash = html == null ? 0 : html.hashCode();
        return recipient.toLowerCase(Locale.ROOT) + "|" + subject + "|" + bodyHash;
    }

    private boolean isRecentlySent(String dedupeKey) {
        OffsetDateTime now = OffsetDateTime.now();
        recentSends.entrySet().removeIf(e -> e.getValue().isBefore(now.minus(DEDUPE_WINDOW)));
        OffsetDateTime previous = recentSends.get(dedupeKey);
        return previous != null && previous.isAfter(now.minus(DEDUPE_WINDOW));
    }

    private boolean isImportantSubject(String subject) {
        String normalized = subject == null ? "" : subject.toLowerCase(Locale.ROOT);
        return normalized.contains("otp")
                || normalized.contains("security")
                || normalized.contains("approval")
                || normalized.contains("order confirmation")
                || normalized.contains("out for delivery")
                || normalized.contains("onboarding");
    }
}

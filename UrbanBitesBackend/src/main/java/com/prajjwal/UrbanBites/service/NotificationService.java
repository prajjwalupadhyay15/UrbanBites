package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.response.NotificationResponse;
import com.prajjwal.UrbanBites.entity.Notification;
import com.prajjwal.UrbanBites.entity.NotificationJob;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.NotificationChannel;
import com.prajjwal.UrbanBites.enums.NotificationJobStatus;
import com.prajjwal.UrbanBites.enums.NotificationType;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.NotificationJobRepository;
import com.prajjwal.UrbanBites.repository.NotificationRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationJobRepository notificationJobRepository;
    private final EmailSender emailSender;
    private final PushSender pushSender;
    private final SmsSender smsSender;
    private final RealtimePublisher realtimePublisher;

    public NotificationService(
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            NotificationJobRepository notificationJobRepository,
            EmailSender emailSender,
            PushSender pushSender,
            SmsSender smsSender,
            RealtimePublisher realtimePublisher
    ) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.notificationJobRepository = notificationJobRepository;
        this.emailSender = emailSender;
        this.pushSender = pushSender;
        this.smsSender = smsSender;
        this.realtimePublisher = realtimePublisher;
    }

    @Transactional
    public void publish(
            User user,
            NotificationType type,
            String eventKey,
            String title,
            String message,
            String referenceLabel,
            boolean sendEmail
    ) {
        String normalizedEventKey = normalize(eventKey);
        if (normalizedEventKey.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "eventKey cannot be blank");
        }

        boolean createdNotification = false;
        if (!notificationRepository.existsByUserIdAndEventKey(user.getId(), normalizedEventKey)) {
            Notification notification = new Notification();
            notification.setUser(user);
            notification.setEventKey(normalizedEventKey);
            notification.setType(type);
            notification.setTitle(trimToLength(title, 160));
            notification.setMessage(trimToLength(message, 500));
            notification.setReferenceLabel(trimToLength(referenceLabel, 160));
            notificationRepository.save(notification);
            publishRealtimeNotification(user.getId(), "NOTIFICATION_CREATED", notification);
            createdNotification = true;
        }

        for (NotificationChannel channel : resolveChannels(type, sendEmail)) {
            String recipient = resolveRecipient(user, channel);
            if (recipient.isEmpty()) {
                continue;
            }
            if (notificationJobRepository.existsByEventKeyAndChannelAndRecipient(normalizedEventKey, channel, recipient)) {
                continue;
            }

            NotificationJob job = new NotificationJob();
            job.setUser(user);
            job.setEventKey(normalizedEventKey);
            job.setType(type);
            job.setChannel(channel);
            job.setRecipient(recipient);
            job.setSubject(buildSubject(type));
            job.setTitleText(trimToLength(title, 160));
            job.setBodyText(trimToLength(message, 500));
            job.setReferenceLabel(trimToLength(referenceLabel, 160));
            notificationJobRepository.save(job);
        }

        if (!createdNotification) {
            // Keep clients idempotent-aware: repeated event keys do not create duplicate in-app entries.
            log.debug("Notification with eventKey={} already exists for userId={}", normalizedEventKey, user.getId());
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listMyNotifications(String currentEmail, int page, int size) {
        User user = getUserByEmail(currentEmail);
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.min(Math.max(size, 1), 100);

        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(normalizedPage, normalizedSize))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String currentEmail) {
        User user = getUserByEmail(currentEmail);
        return notificationRepository.countByUserIdAndReadAtIsNull(user.getId());
    }

    @Transactional
    public void markRead(String currentEmail, Long notificationId) {
        User user = getUserByEmail(currentEmail);
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Notification not found"));

        if (notification.getReadAt() == null) {
            notification.setReadAt(OffsetDateTime.now());
            notificationRepository.save(notification);
            publishRealtimeNotification(user.getId(), "NOTIFICATION_READ", notification);
        }
    }

    @Transactional
    public int markAllRead(String currentEmail) {
        User user = getUserByEmail(currentEmail);
        OffsetDateTime now = OffsetDateTime.now();
        List<Notification> pending = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 500))
                .stream()
                .filter(notification -> notification.getReadAt() == null)
                .toList();

        pending.forEach(notification -> notification.setReadAt(now));
        notificationRepository.saveAll(pending);
        if (!pending.isEmpty()) {
            realtimePublisher.publishUserNotification(user.getId(), "NOTIFICATION_ALL_READ", null);
        }
        return pending.size();
    }

    @Transactional
    public int retryDlqJob(Long jobId) {
        NotificationJob job = notificationJobRepository.findById(jobId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Notification job not found"));
        job.setStatus(NotificationJobStatus.PENDING);
        job.setLastError(null);
        job.setNextRetryAt(OffsetDateTime.now());
        notificationJobRepository.save(job);
        return processDueJobs();
    }

    @Transactional
    @Scheduled(fixedDelayString = "${notification.processor.fixed-delay-ms:5000}")
    public int processDueJobs() {
        List<NotificationJob> due = notificationJobRepository.findTop100ByStatusInAndNextRetryAtBeforeOrderByNextRetryAtAsc(
                List.of(NotificationJobStatus.PENDING, NotificationJobStatus.FAILED),
                OffsetDateTime.now().plusNanos(1)
        );

        int processed = 0;
        for (NotificationJob job : due) {
            try {
                dispatch(job);
                job.setStatus(NotificationJobStatus.SENT);
                job.setLastError(null);
                notificationJobRepository.save(job);
                processed++;
            } catch (Exception ex) {
                int nextAttempt = job.getAttemptCount() + 1;
                job.setAttemptCount(nextAttempt);
                job.setLastError(trimToLength(ex.getMessage(), 500));
                if (nextAttempt >= job.getMaxAttempts()) {
                    job.setStatus(NotificationJobStatus.DLQ);
                } else {
                    long backoffSeconds = (long) Math.min(300, Math.pow(2, nextAttempt));
                    job.setStatus(NotificationJobStatus.FAILED);
                    job.setNextRetryAt(OffsetDateTime.now().plusSeconds(backoffSeconds));
                }
                notificationJobRepository.save(job);
                log.warn("Notification job failed id={}, attempt={}, type={}", job.getId(), nextAttempt, job.getType(), ex);
            }
        }
        return processed;
    }

    private void dispatch(NotificationJob job) {
        switch (job.getChannel()) {
            case EMAIL -> dispatchEmail(job);
            case PUSH -> pushSender.send(job.getRecipient(), job.getTitleText(), job.getBodyText(), job.getReferenceLabel());
            case SMS -> smsSender.sendTransactionalMessage(
                    job.getRecipient(),
                    job.getUser().getFullName(),
                    job.getTitleText(),
                    job.getBodyText(),
                    job.getReferenceLabel()
            );
            case IN_APP -> log.debug("In-app channel does not require async dispatch. eventKey={}", job.getEventKey());
        }
    }

    private void dispatchEmail(NotificationJob job) {
        switch (job.getType()) {
            case ORDER_CONFIRMED -> emailSender.sendOrderConfirmation(
                    job.getRecipient(),
                    job.getUser().getFullName(),
                    job.getTitleText(),
                    job.getBodyText(),
                    job.getReferenceLabel()
            );
            case ORDER_DELIVERED -> emailSender.sendOrderDelivered(
                    job.getRecipient(),
                    job.getUser().getFullName(),
                    job.getTitleText(),
                    job.getBodyText(),
                    job.getReferenceLabel()
            );
            case PAYMENT_SUCCESS, PAYMENT_FAILURE -> emailSender.sendPaymentReceipt(
                    job.getRecipient(),
                    job.getUser().getFullName(),
                    job.getTitleText(),
                    job.getBodyText(),
                    job.getReferenceLabel()
            );
            case REFUND_PROCESSED -> emailSender.sendRefundConfirmation(
                    job.getRecipient(),
                    job.getUser().getFullName(),
                    job.getTitleText(),
                    job.getBodyText(),
                    job.getReferenceLabel()
            );
            case PARTNER_APPROVAL_APPROVED,
                 PARTNER_APPROVAL_REJECTED,
                 RESTAURANT_APPROVAL_APPROVED,
                 RESTAURANT_APPROVAL_REJECTED,
                 DELIVERY_AGENT_APPROVAL_APPROVED,
                 DELIVERY_AGENT_APPROVAL_REJECTED -> emailSender.sendApprovalStatusUpdate(
                    job.getRecipient(),
                    job.getUser().getFullName(),
                    job.getTitleText(),
                    job.getBodyText(),
                    job.getReferenceLabel()
            );
            default -> emailSender.sendTransactionalUpdate(
                    job.getRecipient(),
                    job.getUser().getFullName(),
                    job.getTitleText(),
                    job.getBodyText(),
                    job.getReferenceLabel()
            );
        }
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getReferenceLabel(),
                notification.getCreatedAt(),
                notification.getReadAt()
        );
    }

    private void publishRealtimeNotification(Long userId, String eventType, Notification notification) {
        realtimePublisher.publishUserNotification(userId, eventType, toResponse(notification));
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private String buildSubject(NotificationType type) {
        return switch (type) {
            case ACCOUNT_REGISTERED -> "Welcome to UrbanBites";
            case LOGIN_ALERT -> "Security Notice: New Login";
            case ORDER_CONFIRMED -> "Order confirmed";
            case ORDER_ACCEPTED_BY_RESTAURANT -> "Restaurant accepted your order";
            case ORDER_PREPARING -> "Your order is being prepared";
            case ORDER_READY_FOR_PICKUP -> "Order ready for pickup";
            case ORDER_OUT_FOR_DELIVERY -> "Order out for delivery";
            case ORDER_DELIVERED -> "Order delivered";
            case ORDER_CANCELLED -> "Order cancelled";
            case ORDER_OWNER_ACTION_REQUIRED -> "New order requires your action";
            case PAYMENT_SUCCESS -> "Payment successful";
            case PAYMENT_FAILURE -> "Payment failed";
            case REFUND_PROCESSED -> "Refund update";
            case DELIVERY_NO_AGENT_AVAILABLE -> "Delivery assignment delay";
            case PARTNER_APPROVAL_APPROVED -> "Partner account approved";
            case PARTNER_APPROVAL_REJECTED -> "Partner account review update";
            case RESTAURANT_APPROVAL_APPROVED -> "Restaurant approved";
            case RESTAURANT_APPROVAL_REJECTED -> "Restaurant review update";
            case DELIVERY_AGENT_APPROVAL_APPROVED -> "Delivery agent approved";
            case DELIVERY_AGENT_APPROVAL_REJECTED -> "Delivery agent review update";
        };
    }

    private boolean isEmailableAddress(String email) {
        return !email.isEmpty() && !email.endsWith("@phone.urbanbites.local");
    }

    private Set<NotificationChannel> resolveChannels(NotificationType type, boolean sendEmail) {
        Set<NotificationChannel> channels = new LinkedHashSet<>();
        channels.add(NotificationChannel.IN_APP);

        if (sendEmail) {
            channels.add(NotificationChannel.EMAIL);
        }

        if (isOrderOrPaymentEvent(type)) {
            channels.add(NotificationChannel.PUSH);
        }

        return channels;
    }


    private boolean isOrderOrPaymentEvent(NotificationType type) {
        return switch (type) {
            case ORDER_CONFIRMED,
                 ORDER_ACCEPTED_BY_RESTAURANT,
                 ORDER_PREPARING,
                 ORDER_READY_FOR_PICKUP,
                 ORDER_OUT_FOR_DELIVERY,
                 ORDER_DELIVERED,
                 ORDER_CANCELLED,
                 ORDER_OWNER_ACTION_REQUIRED,
                 PAYMENT_SUCCESS,
                 PAYMENT_FAILURE,
                 REFUND_PROCESSED,
                 DELIVERY_NO_AGENT_AVAILABLE -> true;
            default -> false;
        };
    }

    private String resolveRecipient(User user, NotificationChannel channel) {
        return switch (channel) {
            case EMAIL -> {
                String email = normalize(user.getEmail());
                yield isEmailableAddress(email) ? email : "";
            }
            case SMS -> normalize(user.getPhone());
            case PUSH -> "user:" + user.getId();
            case IN_APP -> "";
        };
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim();
    }

    private String trimToLength(String value, int limit) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() <= limit) {
            return normalized;
        }
        return normalized.substring(0, limit);
    }
}


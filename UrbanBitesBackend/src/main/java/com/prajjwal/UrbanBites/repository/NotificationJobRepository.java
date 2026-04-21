package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.NotificationJob;
import com.prajjwal.UrbanBites.enums.NotificationChannel;
import com.prajjwal.UrbanBites.enums.NotificationJobStatus;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationJobRepository extends JpaRepository<NotificationJob, Long> {

    List<NotificationJob> findTop100ByStatusInAndNextRetryAtBeforeOrderByNextRetryAtAsc(
            List<NotificationJobStatus> statuses,
            OffsetDateTime nextRetryAt
    );

    boolean existsByEventKeyAndChannelAndRecipient(String eventKey, NotificationChannel channel, String recipient);
}

package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.DispatchEvent;
import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DispatchEventRepository extends JpaRepository<DispatchEvent, Long> {

	List<DispatchEvent> findByAssignmentOrderIdOrderByCreatedAtAsc(Long orderId);

    long countByStatusAndCreatedAtAfter(DispatchAssignmentStatus status, OffsetDateTime createdAt);
}



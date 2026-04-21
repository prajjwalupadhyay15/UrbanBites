package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.DispatchAssignment;
import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;

public interface DispatchAssignmentRepository extends JpaRepository<DispatchAssignment, Long> {

    Optional<DispatchAssignment> findTopByOrderIdOrderByCreatedAtDesc(Long orderId);

    Optional<DispatchAssignment> findTopByOrderIdAndStatusInOrderByCreatedAtDesc(Long orderId, Collection<DispatchAssignmentStatus> statuses);

    List<DispatchAssignment> findByOrderIdOrderByCreatedAtAsc(Long orderId);

    Optional<DispatchAssignment> findTopByAgentUserIdAndStatusInOrderByCreatedAtDesc(Long agentUserId, Collection<DispatchAssignmentStatus> statuses);

    List<DispatchAssignment> findByAgentUserIdAndStatusInOrderByCreatedAtDesc(Long agentUserId, Collection<DispatchAssignmentStatus> statuses);

    Page<DispatchAssignment> findByAgentUserIdAndStatusIn(Long agentUserId, Collection<DispatchAssignmentStatus> statuses, Pageable pageable);

    List<DispatchAssignment> findByStatusAndOfferExpiresAtBefore(DispatchAssignmentStatus status, OffsetDateTime timestamp);

    List<DispatchAssignment> findByStatusAndRetryAfterBefore(DispatchAssignmentStatus status, OffsetDateTime timestamp);

    List<DispatchAssignment> findByStatusAndCreatedAtBefore(DispatchAssignmentStatus status, OffsetDateTime timestamp);

    long countByAgentUserIdAndStatus(Long agentUserId, DispatchAssignmentStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<DispatchAssignment> findTopByOrderIdOrderByCreatedAtDescIdDesc(Long orderId);

    List<DispatchAssignment> findByStatusAndAdminVisibilityTrueOrderByCreatedAtDesc(DispatchAssignmentStatus status);
}



package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.DeliveryAgentProfile;
import com.prajjwal.UrbanBites.enums.ApprovalStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryAgentProfileRepository extends JpaRepository<DeliveryAgentProfile, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT p FROM DeliveryAgentProfile p WHERE p.id = :id")
    Optional<DeliveryAgentProfile> findByIdForUpdate(Long id);

    Optional<DeliveryAgentProfile> findByUserId(Long userId);

    List<DeliveryAgentProfile> findByApprovalStatusAndOnlineTrueAndAvailableTrueAndActiveShiftTrueOrderByCurrentLoadAscIdAsc(ApprovalStatus status);
    List<DeliveryAgentProfile> findByApprovalStatusAndOnlineTrueAndAvailableTrueOrderByCurrentLoadAscIdAsc(ApprovalStatus status);
    
    List<DeliveryAgentProfile> findByVerifiedTrueAndOnlineTrueAndAvailableTrueAndActiveShiftTrueOrderByCurrentLoadAscIdAsc();
    List<DeliveryAgentProfile> findByVerifiedTrueAndOnlineTrueAndAvailableTrueOrderByCurrentLoadAscIdAsc();
    List<DeliveryAgentProfile> findByOnlineTrueAndAvailableTrueOrderByCurrentLoadAscIdAsc();

    List<DeliveryAgentProfile> findByOnlineTrueAndLastLocationAtBefore(OffsetDateTime threshold);

    List<DeliveryAgentProfile> findByOnlineTrueAndLastLocationAtIsNull();
}



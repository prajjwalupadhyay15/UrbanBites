package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.DeliveryAgentProfile;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryAgentProfileRepository extends JpaRepository<DeliveryAgentProfile, Long> {

    Optional<DeliveryAgentProfile> findByUserId(Long userId);

    List<DeliveryAgentProfile> findByVerifiedTrueAndOnlineTrueAndAvailableTrueAndActiveShiftTrueOrderByCurrentLoadAscIdAsc();

    List<DeliveryAgentProfile> findByOnlineTrueAndAvailableTrueOrderByCurrentLoadAscIdAsc();

    List<DeliveryAgentProfile> findByOnlineTrueAndLastLocationAtBefore(OffsetDateTime threshold);

    List<DeliveryAgentProfile> findByOnlineTrueAndLastLocationAtIsNull();
}



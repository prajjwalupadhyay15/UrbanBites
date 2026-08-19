package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.CouponUsage;
import com.prajjwal.UrbanBites.enums.CouponUsageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.Optional;

public interface CouponUsageRepository extends JpaRepository<CouponUsage, Long> {

    long countByCampaignIdAndStatusIn(Long campaignId, Collection<CouponUsageStatus> statuses);

    Optional<CouponUsage> findByUserIdAndCampaignIdAndStatus(Long userId, Long campaignId, CouponUsageStatus status);

    boolean existsByUserIdAndCampaignIdAndStatusIn(Long userId, Long campaignId, Collection<CouponUsageStatus> statuses);
}

package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.AdminCouponCampaign;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminCouponCampaignRepository extends JpaRepository<AdminCouponCampaign, Long> {

    Optional<AdminCouponCampaign> findByCodeIgnoreCase(String code);
}


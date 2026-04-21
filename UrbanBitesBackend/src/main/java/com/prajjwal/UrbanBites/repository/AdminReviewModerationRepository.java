package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.AdminReviewModeration;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminReviewModerationRepository extends JpaRepository<AdminReviewModeration, Long> {

    List<AdminReviewModeration> findByTargetReviewTypeIgnoreCaseAndTargetReviewIdOrderByCreatedAtDesc(String reviewType, Long reviewId);
}


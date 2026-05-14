package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.Restaurant;
import com.prajjwal.UrbanBites.enums.ApprovalStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    List<Restaurant> findByOwnerIdOrderByIdDesc(Long ownerId);

    Optional<Restaurant> findByIdAndOwnerId(Long id, Long ownerId);

    Optional<Restaurant> findByIdAndActiveTrue(Long id);

    Optional<Restaurant> findByIdAndActiveTrueAndApprovalStatus(Long id, ApprovalStatus approvalStatus);

    List<Restaurant> findByActiveTrueAndOpenNowTrue();

    List<Restaurant> findByActiveTrue();

    List<Restaurant> findByApprovalStatusOrderByCreatedAtDesc(ApprovalStatus approvalStatus);
}


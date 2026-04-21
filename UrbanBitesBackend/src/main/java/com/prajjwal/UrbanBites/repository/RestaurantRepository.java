package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.Restaurant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    List<Restaurant> findByOwnerIdOrderByIdDesc(Long ownerId);

    Optional<Restaurant> findByIdAndOwnerId(Long id, Long ownerId);

    Optional<Restaurant> findByIdAndActiveTrue(Long id);

    Optional<Restaurant> findByIdAndActiveTrueAndApprovalStatus(Long id, String approvalStatus);

    List<Restaurant> findByActiveTrueAndOpenNowTrue();

    List<Restaurant> findByActiveTrue();

    List<Restaurant> findByApprovalStatusOrderByCreatedAtDesc(String approvalStatus);
}


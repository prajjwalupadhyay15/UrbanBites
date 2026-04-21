package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.AdminDisputeCase;
import com.prajjwal.UrbanBites.enums.AdminDisputeStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminDisputeCaseRepository extends JpaRepository<AdminDisputeCase, Long> {

    List<AdminDisputeCase> findByStatusOrderByCreatedAtDesc(AdminDisputeStatus status);
}


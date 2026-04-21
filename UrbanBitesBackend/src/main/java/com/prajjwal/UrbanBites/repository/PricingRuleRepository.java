package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.PricingRule;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PricingRuleRepository extends JpaRepository<PricingRule, Long> {

    Optional<PricingRule> findTopByActiveTrueOrderByVersionDesc();

    boolean existsByVersionIgnoreCase(String version);
}


package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.ServiceZone;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceZoneRepository extends JpaRepository<ServiceZone, Long> {

    List<ServiceZone> findByActiveTrueOrderByNameAsc();

    List<ServiceZone> findByActiveTrueAndMinLatitudeLessThanEqualAndMaxLatitudeGreaterThanEqualAndMinLongitudeLessThanEqualAndMaxLongitudeGreaterThanEqual(
            BigDecimal latitudeMin,
            BigDecimal latitudeMax,
            BigDecimal longitudeMin,
            BigDecimal longitudeMax
    );
}


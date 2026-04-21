package com.prajjwal.UrbanBites.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "service_zones")
public class ServiceZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(name = "min_latitude", precision = 10, scale = 7, nullable = false)
    private BigDecimal minLatitude;

    @Column(name = "max_latitude", precision = 10, scale = 7, nullable = false)
    private BigDecimal maxLatitude;

    @Column(name = "min_longitude", precision = 10, scale = 7, nullable = false)
    private BigDecimal minLongitude;

    @Column(name = "max_longitude", precision = 10, scale = 7, nullable = false)
    private BigDecimal maxLongitude;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getMinLatitude() { return minLatitude; }
    public void setMinLatitude(BigDecimal minLatitude) { this.minLatitude = minLatitude; }
    public BigDecimal getMaxLatitude() { return maxLatitude; }
    public void setMaxLatitude(BigDecimal maxLatitude) { this.maxLatitude = maxLatitude; }
    public BigDecimal getMinLongitude() { return minLongitude; }
    public void setMinLongitude(BigDecimal minLongitude) { this.minLongitude = minLongitude; }
    public BigDecimal getMaxLongitude() { return maxLongitude; }
    public void setMaxLongitude(BigDecimal maxLongitude) { this.maxLongitude = maxLongitude; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}


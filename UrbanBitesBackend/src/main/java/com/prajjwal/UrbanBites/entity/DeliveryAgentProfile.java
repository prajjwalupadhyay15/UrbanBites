package com.prajjwal.UrbanBites.entity;

import com.prajjwal.UrbanBites.enums.ApprovalStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "delivery_agent_profiles")
public class DeliveryAgentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private boolean verified = false;

    @Column(nullable = false)
    private boolean online = false;

    @Column(nullable = false)
    private boolean available = false;

    @Column(name = "current_load", nullable = false)
    private int currentLoad = 0;

    @Column(name = "transport_type", length = 40)
    private String transportType = "BIKE";

    @Column(name = "active_shift", nullable = false)
    private boolean activeShift = false;

    @Column(name = "last_latitude", precision = 10, scale = 7)
    private BigDecimal lastLatitude;

    @Column(name = "last_longitude", precision = 10, scale = 7)
    private BigDecimal lastLongitude;

    @Column(name = "last_location_at")
    private OffsetDateTime lastLocationAt;

    @Column(name = "last_assigned_at")
    private OffsetDateTime lastAssignedAt;

    @Column(name = "approval_rejection_reason", length = 500)
    private String approvalRejectionReason;

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
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public boolean isOnline() { return online; }
    public void setOnline(boolean online) { this.online = online; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public int getCurrentLoad() { return currentLoad; }
    public void setCurrentLoad(int currentLoad) { this.currentLoad = currentLoad; }
    public String getTransportType() { return transportType; }
    public void setTransportType(String transportType) { this.transportType = transportType; }
    public boolean isActiveShift() { return activeShift; }
    public void setActiveShift(boolean activeShift) { this.activeShift = activeShift; }
    public BigDecimal getLastLatitude() { return lastLatitude; }
    public void setLastLatitude(BigDecimal lastLatitude) { this.lastLatitude = lastLatitude; }
    public BigDecimal getLastLongitude() { return lastLongitude; }
    public void setLastLongitude(BigDecimal lastLongitude) { this.lastLongitude = lastLongitude; }
    public OffsetDateTime getLastLocationAt() { return lastLocationAt; }
    public void setLastLocationAt(OffsetDateTime lastLocationAt) { this.lastLocationAt = lastLocationAt; }
    public OffsetDateTime getLastAssignedAt() { return lastAssignedAt; }
    public void setLastAssignedAt(OffsetDateTime lastAssignedAt) { this.lastAssignedAt = lastAssignedAt; }
    public String getApprovalRejectionReason() { return approvalRejectionReason; }
    public void setApprovalRejectionReason(String approvalRejectionReason) { this.approvalRejectionReason = approvalRejectionReason; }
}


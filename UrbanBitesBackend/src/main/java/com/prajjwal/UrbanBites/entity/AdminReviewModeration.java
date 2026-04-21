package com.prajjwal.UrbanBites.entity;

import com.prajjwal.UrbanBites.enums.AdminReviewModerationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "admin_review_moderation")
public class AdminReviewModeration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "target_review_type", nullable = false, length = 40)
    private String targetReviewType;

    @Column(name = "target_review_id", nullable = false)
    private Long targetReviewId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdminReviewModerationStatus status;

    @Column(nullable = false, length = 255)
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "moderated_by_user_id", nullable = false)
    private User moderatedByUser;

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
    public String getTargetReviewType() { return targetReviewType; }
    public void setTargetReviewType(String targetReviewType) { this.targetReviewType = targetReviewType; }
    public Long getTargetReviewId() { return targetReviewId; }
    public void setTargetReviewId(Long targetReviewId) { this.targetReviewId = targetReviewId; }
    public AdminReviewModerationStatus getStatus() { return status; }
    public void setStatus(AdminReviewModerationStatus status) { this.status = status; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public User getModeratedByUser() { return moderatedByUser; }
    public void setModeratedByUser(User moderatedByUser) { this.moderatedByUser = moderatedByUser; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}


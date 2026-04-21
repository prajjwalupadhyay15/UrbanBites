package com.prajjwal.UrbanBites.entity;

import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
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
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dispatch_events")
public class DispatchEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false)
    private DispatchAssignment assignment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DispatchAssignmentStatus status;

    @Column(name = "event_note", length = 255)
    private String eventNote;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public DispatchAssignment getAssignment() { return assignment; }
    public void setAssignment(DispatchAssignment assignment) { this.assignment = assignment; }
    public DispatchAssignmentStatus getStatus() { return status; }
    public void setStatus(DispatchAssignmentStatus status) { this.status = status; }
    public String getEventNote() { return eventNote; }
    public void setEventNote(String eventNote) { this.eventNote = eventNote; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}



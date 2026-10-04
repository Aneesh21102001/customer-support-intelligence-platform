package com.aneesh.support.ticket;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "ticket_activity")
public class TicketActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Column(nullable = false)
    private String activityType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public TicketActivity() {
    }

    public TicketActivity(
            Ticket ticket,
            String activityType,
            String description
    ) {
        this.ticket = ticket;
        this.activityType = activityType;
        this.description = description;
        this.createdAt = LocalDateTime.now();
    }
}
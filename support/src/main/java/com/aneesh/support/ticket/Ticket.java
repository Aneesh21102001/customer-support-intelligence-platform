package com.aneesh.support.ticket;

import com.aneesh.support.customer.Customer;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "tickets")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Setter
    @Column(nullable = false)
    private String subject;

    @Setter
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketStatus status;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketPriority priority;

    @Setter
    @Column
    private String category;

    @Setter
    @Column
    private String sentiment;

    @Setter
    @Column(columnDefinition = "TEXT")
    private String suggestedResponse;

    @Setter
    @Column(columnDefinition = "TEXT")
    private String knowledgeSources;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();

        if (status == null) {
            status = TicketStatus.OPEN;
        }

        if (priority == null) {
            priority = TicketPriority.MEDIUM;
        }
    }

    public Ticket() {
    }

    public Ticket(Customer customer, String subject, String description) {
        this.customer = customer;
        this.subject = subject;
        this.description = description;
    }
}
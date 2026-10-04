package com.aneesh.support.ticket;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketAssignmentHistoryRepository
        extends JpaRepository<TicketAssignmentHistory, Long> {

    List<TicketAssignmentHistory> findByTicketIdOrderByAssignedAtDesc(Long ticketId);
}
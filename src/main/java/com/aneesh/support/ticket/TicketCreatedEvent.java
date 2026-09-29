package com.aneesh.support.ticket;

public record TicketCreatedEvent(
        String eventType,
        Long ticketId,
        Long customerId
) {
}
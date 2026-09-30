package com.aneesh.support.kafka;

import com.aneesh.support.ticket.TicketCreatedEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class TicketEventConsumer {

    private final TicketEventService ticketEventService;

    public TicketEventConsumer(TicketEventService ticketEventService) {
        this.ticketEventService = ticketEventService;
    }

    @KafkaListener(
            topics = "ticket-events",
            groupId = "support-platform"
    )
    public void consumeTicketCreatedEvent(TicketCreatedEvent event) {

        ticketEventService.processTicketCreated(event);
    }
}
package com.aneesh.support.kafka;

import com.aneesh.support.ticket.TicketCreatedEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Service;

@Service
public class TicketEventConsumer {

    private final TicketEventService ticketEventService;

    public TicketEventConsumer(TicketEventService ticketEventService) {
        this.ticketEventService = ticketEventService;
    }

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 2000)
    )
    @KafkaListener(
            topics = "ticket-events",
            groupId = "support-platform"
    )
    public void consumeTicketCreatedEvent(TicketCreatedEvent event) {

        ticketEventService.processTicketCreated(event);
    }
}
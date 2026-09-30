package com.aneesh.support.kafka;

import com.aneesh.support.ticket.TicketCreatedEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class TicketEventProducer {

    private static final String TOPIC = "ticket-events";

    private final KafkaTemplate<String, TicketCreatedEvent> kafkaTemplate;

    public TicketEventProducer(
            KafkaTemplate<String, TicketCreatedEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishTicketCreated(TicketCreatedEvent event) {
        kafkaTemplate.send(
                TOPIC,
                event.ticketId().toString(),
                event
        );
    }
}
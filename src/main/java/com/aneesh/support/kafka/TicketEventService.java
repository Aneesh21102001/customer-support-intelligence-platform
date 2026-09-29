package com.aneesh.support.kafka;

import com.aneesh.support.ticket.TicketCreatedEvent;
import org.springframework.stereotype.Service;

@Service
public class TicketEventService {

    public void processTicketCreated(TicketCreatedEvent event) {

        System.out.println(
                "Processing ticket created event: " + event
        );

        // AI processing will be added here later
    }
}
package com.aneesh.support.kafka;

import com.aneesh.support.ai.AiServiceClient;
import com.aneesh.support.exception.ResourceNotFoundException;
import com.aneesh.support.ticket.*;
import org.springframework.stereotype.Service;

@Service
public class TicketEventService {

    private final AiServiceClient aiServiceClient;
    private final TicketRepository ticketRepository;
    private final TicketActivityRepository ticketActivityRepository;

    public TicketEventService(
            AiServiceClient aiServiceClient,
            TicketRepository ticketRepository,
            TicketActivityRepository ticketActivityRepository) {

        this.aiServiceClient = aiServiceClient;
        this.ticketRepository = ticketRepository;
        this.ticketActivityRepository = ticketActivityRepository;
    }

    public void processTicketCreated(TicketCreatedEvent event) {

        System.out.println(
                "Processing ticket created event: " + event
        );

        Ticket ticket = ticketRepository.findById(event.ticketId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Ticket not found: " + event.ticketId()
                        )
                );

        ticket.setAiStatus(
                com.aneesh.support.ticket.AiProcessingStatus.PROCESSING
        );

        ticketRepository.save(ticket);

        try {
            String analysis = aiServiceClient.analyzeTicket(
                    ticket.getSubject(),
                    ticket.getDescription()
            );

            String json = analysis;
            var objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

            var result = objectMapper.readTree(json);

            ticket.setCategory(result.get("category").asText());
            ticket.setPriority(
                    com.aneesh.support.ticket.TicketPriority.valueOf(
                            result.get("priority").asText()
                    )
            );
            ticket.setSentiment(result.get("sentiment").asText());

            ticket.setSuggestedResponse(
                    result.get("suggested_response").asText()
            );

            ticket.setKnowledgeSources(
                    String.join(
                            ", ",
                            objectMapper.convertValue(
                                    result.get("sources"),
                                    java.util.List.class
                            )
                    )
            );

            ticket.setAiStatus(
                    com.aneesh.support.ticket.AiProcessingStatus.COMPLETED
            );

            ticketRepository.save(ticket);

            TicketActivity activity = new TicketActivity(
                    ticket,
                    "AI_COMPLETED",
                    "AI analysis completed"
            );

            ticketActivityRepository.save(activity);

            System.out.println(
                    "AI analysis saved for ticket " + ticket.getId()
            );

        } catch (Exception e) {

            ticket.setAiStatus(
                    com.aneesh.support.ticket.AiProcessingStatus.FAILED
            );

            ticketRepository.save(ticket);

            TicketActivity activity = new TicketActivity(
                    ticket,
                    "AI_FAILED",
                    "AI analysis failed"
            );

            ticketActivityRepository.save(activity);
        }
    }
}
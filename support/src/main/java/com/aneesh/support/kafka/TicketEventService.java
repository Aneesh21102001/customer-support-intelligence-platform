package com.aneesh.support.kafka;

import com.aneesh.support.ai.AiServiceClient;
import com.aneesh.support.exception.ResourceNotFoundException;
import com.aneesh.support.ticket.*;
import com.fasterxml.jackson.databind.ObjectMapper;
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

        ticket.setAiStatus(AiProcessingStatus.PROCESSING);
        ticketRepository.save(ticket);

        TicketActivity processingActivity = new TicketActivity(
                ticket,
                "AI_PROCESSING",
                "AI analysis started"
        );

        ticketActivityRepository.save(processingActivity);

        try {

            String analysis = aiServiceClient.analyzeTicket(
                    ticket.getSubject(),
                    ticket.getDescription()
            );

            ObjectMapper objectMapper = new ObjectMapper();

            var result = objectMapper.readTree(analysis);

            ticket.setCategory(
                    result.get("category").asText()
            );

            ticket.setPriority(
                    TicketPriority.valueOf(
                            result.get("priority").asText()
                    )
            );

            ticket.setSentiment(
                    result.get("sentiment").asText()
            );

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

            ticket.setAiStatus(AiProcessingStatus.COMPLETED);

            ticketRepository.save(ticket);

            TicketActivity completedActivity = new TicketActivity(
                    ticket,
                    "AI_COMPLETED",
                    "AI analysis completed"
            );

            ticketActivityRepository.save(completedActivity);

            System.out.println(
                    "AI analysis saved for ticket " + ticket.getId()
            );

        } catch (Exception e) {

            ticket.setAiStatus(AiProcessingStatus.FAILED);
            ticketRepository.save(ticket);

            TicketActivity failedActivity = new TicketActivity(
                    ticket,
                    "AI_FAILED",
                    "AI analysis failed"
            );

            ticketActivityRepository.save(failedActivity);

            System.err.println(
                    "AI analysis failed for ticket " + ticket.getId()
                            + ": " + e.getMessage()
            );
        }
    }
}
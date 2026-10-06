package com.aneesh.support.customer;

import com.aneesh.support.ai.AiServiceClient;
import com.aneesh.support.kafka.TicketEventService;
import com.aneesh.support.ticket.Ticket;
import com.aneesh.support.ticket.TicketActivityRepository;
import com.aneesh.support.ticket.TicketRepository;
import com.aneesh.support.ticket.TicketCreatedEvent;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TicketEventServiceTest {

    @Test
    void shouldMarkTicketAsFailedWhenAiAnalysisFails() {

        AiServiceClient aiServiceClient = mock(AiServiceClient.class);
        TicketRepository ticketRepository = mock(TicketRepository.class);
        TicketActivityRepository ticketActivityRepository =
                mock(TicketActivityRepository.class);

        TicketEventService service = new TicketEventService(
                aiServiceClient,
                ticketRepository,
                ticketActivityRepository
        );

        Customer customer = new Customer(
                "Test Customer",
                "test-" + System.nanoTime() + "@example.com"
        );

        Ticket ticket = new Ticket(
                customer,
                "Payment failed",
                "Payment is failing during checkout"
        );

        when(ticketRepository.findById(1L))
                .thenReturn(Optional.of(ticket));

        when(aiServiceClient.analyzeTicket(
                "Payment failed",
                "Payment is failing during checkout"
        )).thenThrow(new RuntimeException("AI service unavailable"));

        TicketCreatedEvent event = new TicketCreatedEvent(
                "TICKET_CREATED",
                1L,
                1L
        );

        assertThrows(
                RuntimeException.class,
                () -> service.processTicketCreated(event)
        );

        verify(ticketRepository, atLeastOnce()).save(ticket);

        verify(ticketActivityRepository).save(
                argThat(activity ->
                        activity.getActivityType().equals("AI_FAILED")
                                && activity.getDescription()
                                .equals("AI analysis failed")
                )
        );
    }
}
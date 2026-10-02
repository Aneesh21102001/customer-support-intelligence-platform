package com.aneesh.support.ticket;

import com.aneesh.support.ai.AiServiceClient;
import com.aneesh.support.customer.Customer;
import com.aneesh.support.customer.CustomerRepository;
import com.aneesh.support.kafka.TicketEventProducer;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketRepository ticketRepository;
    private final CustomerRepository customerRepository;
    private final TicketEventProducer ticketEventProducer;
    private final AiServiceClient aiServiceClient;

    public TicketController(
            TicketRepository ticketRepository,
            CustomerRepository customerRepository,
            TicketEventProducer ticketEventProducer,
            AiServiceClient aiServiceClient) {
        this.ticketRepository = ticketRepository;
        this.customerRepository = customerRepository;
        this.ticketEventProducer = ticketEventProducer;
        this.aiServiceClient = aiServiceClient;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Ticket createTicket(@Valid @RequestBody CreateTicketRequest request) {

        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new RuntimeException(
                        "Customer not found: " + request.customerId()
                ));

        Ticket ticket = new Ticket(
                customer,
                request.subject(),
                request.description()
        );

        Ticket savedTicket = ticketRepository.save(ticket);

        TicketCreatedEvent event = new TicketCreatedEvent(
                "TICKET_CREATED",
                savedTicket.getId(),
                savedTicket.getCustomer().getId()
        );

        ticketEventProducer.publishTicketCreated(event);

        return savedTicket;
    }

    @GetMapping
    public List<Ticket> getTickets() {
        return ticketRepository.findAll();
    }

    @GetMapping("/{id}")
    public Ticket getTicket(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Ticket not found: " + id
                ));
    }

    @GetMapping("/ai-test")
    public String testAi() {
        return aiServiceClient.analyzeTicket(
                "Payment failed",
                "Customer payment is failing during checkout"
        );
    }

    @PatchMapping("/{id}")
    public Ticket updateTicket(
            @PathVariable Long id,
            @RequestBody UpdateTicketRequest request) {

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Ticket not found: " + id
                ));

        if (request.status() != null) {
            ticket.setStatus(request.status());
        }

        if (request.priority() != null) {
            ticket.setPriority(request.priority());
        }

        if (request.subject() != null) {
            ticket.setSubject(request.subject());
        }

        if (request.description() != null) {
            ticket.setDescription(request.description());
        }

        return ticketRepository.save(ticket);
    }

    @PostMapping("/{id}/retry-ai")
    public Ticket retryAiAnalysis(@PathVariable Long id) {

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Ticket not found: " + id)
                );

        ticketEventProducer.publishTicketCreated(
                new TicketCreatedEvent(
                        "TICKET_CREATED",
                        ticket.getId(),
                        ticket.getCustomer().getId()
                )
        );

        return ticket;
    }

    public record CreateTicketRequest(

            @NotNull(message = "customerId is required")
            Long customerId,

            @NotBlank(message = "subject is required")
            String subject,

            @NotBlank(message = "description is required")
            String description
    ) {
    }

    public record UpdateTicketRequest(
            TicketStatus status,
            TicketPriority priority,
            String subject,
            String description
    ) {
    }
}
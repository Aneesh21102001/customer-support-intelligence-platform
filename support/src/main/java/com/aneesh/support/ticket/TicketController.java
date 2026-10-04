package com.aneesh.support.ticket;

import com.aneesh.support.agent.Agent;
import com.aneesh.support.agent.AgentRepository;
import com.aneesh.support.ai.AiServiceClient;
import com.aneesh.support.customer.Customer;
import com.aneesh.support.customer.CustomerRepository;
import com.aneesh.support.exception.ResourceNotFoundException;
import com.aneesh.support.kafka.TicketEventProducer;
import com.aneesh.support.ticket.TicketAssignmentHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketRepository ticketRepository;
    private final CustomerRepository customerRepository;
    private final TicketEventProducer ticketEventProducer;
    private final AiServiceClient aiServiceClient;
    private final AgentRepository agentRepository;
    private final TicketAssignmentHistoryRepository ticketAssignmentHistoryRepository;

    public TicketController(
            TicketRepository ticketRepository,
            CustomerRepository customerRepository,
            TicketEventProducer ticketEventProducer,
            AiServiceClient aiServiceClient,
            AgentRepository agentRepository,
            TicketAssignmentHistoryRepository ticketAssignmentHistoryRepository) {
        this.ticketRepository = ticketRepository;
        this.customerRepository = customerRepository;
        this.ticketEventProducer = ticketEventProducer;
        this.aiServiceClient = aiServiceClient;
        this.agentRepository = agentRepository;
        this.ticketAssignmentHistoryRepository = ticketAssignmentHistoryRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Ticket createTicket(@Valid @RequestBody CreateTicketRequest request) {

        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new ResourceNotFoundException(
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
                .orElseThrow(() -> new ResourceNotFoundException(
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
                .orElseThrow(() -> new ResourceNotFoundException(
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

    @PatchMapping("/{id}/agent/{agentId}")
    public Ticket assignAgent(
            @PathVariable Long id,
            @PathVariable Long agentId) {

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Ticket not found: " + id
                        ));

        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Agent not found: " + agentId
                        ));

        ticket.setAgent(agent);
        ticketRepository.save(ticket);

        TicketAssignmentHistory history =
                new TicketAssignmentHistory(ticket, agent);

        ticketAssignmentHistoryRepository.save(history);

        return ticket;
    }

    @GetMapping("/{id}/assignment-history")
    public List<Map<String, Object>> getAssignmentHistory(
            @PathVariable Long id) {

        if (!ticketRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ticket not found: " + id);
        }

        return ticketAssignmentHistoryRepository
                .findByTicketIdOrderByAssignedAtDesc(id)
                .stream()
                .map(history -> Map.<String, Object>of(
                        "id", history.getId(),
                        "agentId", history.getAgent().getId(),
                        "agentName", history.getAgent().getName(),
                        "agentEmail", history.getAgent().getEmail(),
                        "assignedAt", history.getAssignedAt()
                ))
                .toList();
    }

    @PostMapping("/{id}/retry-ai")
    public Ticket retryAiAnalysis(@PathVariable Long id) {

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Ticket not found: " + id)
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
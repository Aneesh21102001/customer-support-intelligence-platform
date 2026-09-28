package com.aneesh.support.ticket;

import com.aneesh.support.customer.Customer;
import com.aneesh.support.customer.CustomerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketRepository ticketRepository;
    private final CustomerRepository customerRepository;

    public TicketController(
            TicketRepository ticketRepository,
            CustomerRepository customerRepository) {
        this.ticketRepository = ticketRepository;
        this.customerRepository = customerRepository;
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

        return ticketRepository.save(ticket);
    }

    @GetMapping
    public List<Ticket> getTickets() {
        return ticketRepository.findAll();
    }

    @GetMapping("/{id}")
    public Ticket getTicket(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .orElseThrow();
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
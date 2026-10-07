"use client";

import { useEffect, useState } from "react";

type Ticket = {
    id: number;
    subject: string;
    description: string;
    createdAt: string;
    customer?: {
        id: number;
        name: string;
        email: string;
    };
    agent?: {
        id: number;
        name: string;
        email: string;
    };
    status: string;
    priority: string;
    category: string | null;
    sentiment: string | null;
    suggestedResponse: string | null;
    knowledgeSources: string | null;
    aiStatus?: "PROCESSING" | "COMPLETED" | "FAILED";
};

type AssignmentHistory = {
    id: number;
    agentId: number;
    agentName: string;
    agentEmail: string;
    assignedAt: string;
};

type TicketActivity = {
    id: number;
    activityType: string;
    description: string;
    createdAt: string;
};

export default function Home() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [customerId, setCustomerId] = useState("");
    const [customers, setCustomers] = useState<
        { id: number; name: string; email: string }[]
    >([]);
    const [agents, setAgents] = useState<
        { id: number; name: string; email: string }[]
    >([]);
    const [assignmentHistory, setAssignmentHistory] = useState<
        AssignmentHistory[]
    >([]);
    const [ticketActivity, setTicketActivity] = useState<TicketActivity[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerEmail, setNewCustomerEmail] = useState("");
    const [creatingCustomer, setCreatingCustomer] = useState(false);
    const [customerMessage, setCustomerMessage] = useState("");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);
    const [createMessage, setCreateMessage] = useState("");
    const [updating, setUpdating] = useState(false);
    const [retryingAi, setRetryingAi] = useState(false);
    const [assigningAgent, setAssigningAgent] = useState(false);
    const [agentMessage, setAgentMessage] = useState("");
    const [updateStatus, setUpdateStatus] = useState("");
    const [updatePriority, setUpdatePriority] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [priorityFilter, setPriorityFilter] = useState("ALL");
    const [aiStatusFilter, setAiStatusFilter] = useState("ALL");
    const [agentFilter, setAgentFilter] = useState("ALL");
    const [slaFilter, setSlaFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, priorityFilter]);

    useEffect(() => {
        fetch("http://localhost:8080/api/tickets")
            .then((response) => response.json())
            .then((data) => {
                setTickets(data);
                setSelectedTicket(data[0] ?? null);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Failed to fetch tickets:", error);
                setLoading(false);
            });
        fetch("http://localhost:8080/api/customers")
            .then((response) => response.json())
            .then((data) => {
                setCustomers(data);
            })
            .catch((error) => {
                console.error("Failed to fetch customers:", error);
            });
    }, []);

    useEffect(() => {
        fetch("http://localhost:8080/api/agents")
            .then((response) => response.json())
            .then((data) => {
                setAgents(data);
            })
            .catch((error) => {
                console.error("Failed to fetch agents:", error);
            });
    }, []);

    useEffect(() => {
        if (!selectedTicket) {
            setAssignmentHistory([]);
            return;
        }

        fetch(
            `http://localhost:8080/api/tickets/${selectedTicket.id}/assignment-history`
        )
            .then((response) => response.json())
            .then((data) => {
                setAssignmentHistory(data);
            })
            .catch((error) => {
                console.error("Failed to fetch assignment history:", error);
                setAssignmentHistory([]);
            });
    }, [selectedTicket]);

    useEffect(() => {
        if (!selectedTicket) {
            setTicketActivity([]);
            return;
        }

        fetch(
            `http://localhost:8080/api/tickets/${selectedTicket.id}/activity`
        )
            .then((response) => response.json())
            .then((data) => {
                setTicketActivity(data);
            })
            .catch((error) => {
                console.error("Failed to fetch ticket activity:", error);
                setTicketActivity([]);
            });
    }, [selectedTicket]);

    const createCustomer = async () => {
        if (!newCustomerName.trim() || !newCustomerEmail.trim()) {
            setCustomerMessage("Name and email are required.");
            return;
        }

        setCustomerMessage("");
        setCreatingCustomer(true);

        try {
            const response = await fetch("http://localhost:8080/api/customers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: newCustomerName,
                    email: newCustomerEmail,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to create customer");
            }

            const newCustomer = await response.json();

            setCustomers((currentCustomers) => [
                ...currentCustomers,
                newCustomer,
            ]);

            setCustomerId(newCustomer.id.toString());
            setNewCustomerName("");
            setNewCustomerEmail("");
            setCustomerMessage("Customer created successfully.");
        } catch (error) {
            console.error("Failed to create customer:", error);

            setCustomerMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to create customer."
            );
        } finally {
            setCreatingCustomer(false);
        }
    };

    const createTicket = async () => {
        if (!customerId) {
            setCreateMessage("Please select a customer.");
            return;
        }

        if (!subject.trim() || !description.trim()) {
            setCreateMessage("Subject and description are required.");
            return;
        }

        setCreateMessage("");

        setCreating(true);

        try {
            const response = await fetch(
                "http://localhost:8080/api/tickets",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        customerId: Number(customerId),
                        subject,
                        description,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to create ticket");
            }

            const newTicket = await response.json();

            setSubject("");
            setDescription("");

            // Show the newly created ticket immediately
            newTicket.aiStatus = "PROCESSING";
            setSelectedTicket(newTicket);

            // Give Kafka + AI time to process the ticket
            const pollForAiResult = async (attempt = 1) => {
                try {
                    const updatedResponse = await fetch(
                        `http://localhost:8080/api/tickets/${newTicket.id}`
                    );

                    if (!updatedResponse.ok) {
                        throw new Error("Failed to fetch updated ticket");
                    }

                    const updatedTicket = await updatedResponse.json();

                    updatedTicket.aiStatus =
                        updatedTicket.aiStatus ?? "PROCESSING";

                    setTickets((currentTickets) =>
                        currentTickets.map((ticket) =>
                            ticket.id === updatedTicket.id
                                ? updatedTicket
                                : ticket
                        )
                    );

                    setSelectedTicket(updatedTicket);

                    // AI processing is complete
                    if (
                        updatedTicket.aiStatus === "COMPLETED" ||
                        updatedTicket.aiStatus === "FAILED"
                    ) {
                        return;
                    }

                    // Try again every second, up to 10 attempts
                    if (attempt < 10) {
                        setTimeout(() => {
                            pollForAiResult(attempt + 1);
                        }, 1000);
                    } else {
                        updatedTicket.aiStatus = "FAILED";

                        setTickets((currentTickets) =>
                            currentTickets.map((ticket) =>
                                ticket.id === updatedTicket.id
                                    ? updatedTicket
                                    : ticket
                            )
                        );

                        setSelectedTicket(updatedTicket);
                    }
                } catch (error) {
                    console.error(
                        "Failed to refresh ticket:",
                        error
                    );
                }
            };

            pollForAiResult();

            // Add the new ticket to the list
            setTickets((currentTickets) => [
                ...currentTickets,
                newTicket,
            ]);

        } catch (error) {
            console.error("Failed to create ticket:", error);
        } finally {
            setCreating(false);
        }
    };

    const updateTicket = async () => {
        if (!selectedTicket) {
            return;
        }

        setUpdating(true);

        try {
            const response = await fetch(
                `http://localhost:8080/api/tickets/${selectedTicket.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        status: updateStatus || selectedTicket.status,
                        priority: updatePriority || selectedTicket.priority,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update ticket");
            }

            const updatedTicket = await response.json();

            setTickets((currentTickets) =>
                currentTickets.map((ticket) =>
                    ticket.id === updatedTicket.id
                        ? updatedTicket
                        : ticket
                )
            );

            setSelectedTicket(updatedTicket);
        } catch (error) {
            console.error("Failed to update ticket:", error);
        } finally {
            setUpdating(false);
        }
    };

    const assignAgent = async (agentId: string) => {
        if (!selectedTicket) {
            return;
        }

        setAssigningAgent(true);
        setAgentMessage("");

        try {
            const response = await fetch(
                `http://localhost:8080/api/tickets/${selectedTicket.id}/agent/${agentId}`,
                {
                    method: "PATCH",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to assign agent");
            }

            const updatedTicket = await response.json();

            setTickets((currentTickets) =>
                currentTickets.map((ticket) =>
                    ticket.id === updatedTicket.id
                        ? updatedTicket
                        : ticket
                )
            );

            setSelectedTicket(updatedTicket);
            setAgentMessage("Agent assigned successfully.");
        } catch (error) {
            console.error("Failed to assign agent:", error);
            setAgentMessage("Failed to assign agent.");
        } finally {
            setAssigningAgent(false);
        }
    };

    const retryAiAnalysis = async () => {
        if (!selectedTicket) {
            return;
        }

        setRetryingAi(true);

        try {
            const response = await fetch(
                `http://localhost:8080/api/tickets/${selectedTicket.id}/retry-ai`,
                {
                    method: "POST",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to retry AI analysis");
            }

            const ticket = await response.json();

            ticket.aiStatus = "PROCESSING";

            setTickets((currentTickets) =>
                currentTickets.map((currentTicket) =>
                    currentTicket.id === ticket.id
                        ? ticket
                        : currentTicket
                )
            );

            setSelectedTicket(ticket);
        } catch (error) {
            console.error("Failed to retry AI analysis:", error);
        } finally {
            setRetryingAi(false);
        }
    };

    const getSlaStatus = (ticket: Ticket) => {
        if (
            ticket.status === "RESOLVED" ||
            ticket.status === "CLOSED"
        ) {
            return "COMPLETED";
        }

        const slaHours = {
            URGENT: 4,
            HIGH: 8,
            MEDIUM: 24,
            LOW: 48,
        };

        const slaLimit =
            slaHours[ticket.priority as keyof typeof slaHours];

        const createdAt = new Date(ticket.createdAt).getTime();
        const now = new Date().getTime();

        const elapsedHours =
            (now - createdAt) / (1000 * 60 * 60);

        if (elapsedHours >= slaLimit) {
            return "BREACHED";
        }

        if (elapsedHours >= slaLimit * 0.75) {
            return "AT_RISK";
        }

        return "WITHIN_SLA";
    };

    const supportStats = {
        total: tickets.length,
        open: tickets.filter((ticket) => ticket.status === "OPEN").length,
        inProgress: tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length,
        resolved: tickets.filter((ticket) => ticket.status === "RESOLVED").length,
        high: tickets.filter(
            (ticket) => ticket.priority === "HIGH"
        ).length,

        urgent: tickets.filter(
            (ticket) => ticket.priority === "URGENT"
        ).length,
        unassigned: tickets.filter((ticket) => !ticket.agent).length,
        aiCompleted: tickets.filter(
            (ticket) => ticket.aiStatus === "COMPLETED"
        ).length,

        aiProcessing: tickets.filter(
            (ticket) => ticket.aiStatus === "PROCESSING"
        ).length,

        aiFailed: tickets.filter(
            (ticket) => ticket.aiStatus === "FAILED"
        ).length,

        slaBreached: tickets.filter(
            (ticket) => getSlaStatus(ticket) === "BREACHED"
        ).length,

        slaAtRisk: tickets.filter(
            (ticket) => getSlaStatus(ticket) === "AT_RISK"
        ).length,

        slaWithin: tickets.filter(
            (ticket) => getSlaStatus(ticket) === "WITHIN_SLA"
        ).length,
    };

    const aiTotal =
        supportStats.aiCompleted +
        supportStats.aiProcessing +
        supportStats.aiFailed;

    const aiSuccessRate =
        aiTotal === 0
            ? 0
            : Math.round(
                (supportStats.aiCompleted / aiTotal) * 100
            );

    const filteredTickets = tickets
        .filter((ticket) =>
            (statusFilter === "ALL" || ticket.status === statusFilter) &&
            (
                priorityFilter === "ALL" ||
                ticket.priority === priorityFilter ||
                (priorityFilter === "HIGH_URGENT" &&
                    (ticket.priority === "HIGH" || ticket.priority === "URGENT"))
            ) &&
            (selectedCustomer === null || ticket.customer?.id === selectedCustomer) &&
            (aiStatusFilter === "ALL" || ticket.aiStatus === aiStatusFilter) &&
            (slaFilter === "ALL" || getSlaStatus(ticket) === slaFilter) &&
            (
                agentFilter === "ALL" ||
                (agentFilter === "UNASSIGNED" && !ticket.agent) ||
                (agentFilter !== "UNASSIGNED" &&
                    String(ticket.agent?.id) === agentFilter)
            ) &&
            (
                ticket.id.toString().includes(searchTerm.replace("#", "").trim()) ||
                ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.customer?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.agent?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.agent?.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
        )
        .sort((a, b) => a.id - b.id);

    const totalTickets = tickets.length;

    const agentWorkloads = agents.map((agent) => {
        const agentTickets = tickets.filter(
            (ticket) => ticket.agent?.id === agent.id
        );

        return {
            ...agent,
            ticketCount: agentTickets.length,
            openTickets: agentTickets.filter(
                (ticket) => ticket.status === "OPEN"
            ).length,
            resolvedTickets: agentTickets.filter(
                (ticket) => ticket.status === "RESOLVED"
            ).length,
        };
    });

    const totalCustomers = customers.length;

    const openTickets = tickets.filter(
        (ticket) => ticket.status === "OPEN"
    ).length;

    const aiCompleted = tickets.filter(
        (ticket) => ticket.aiStatus === "COMPLETED"
    ).length;

    const aiProcessing = tickets.filter(
        (ticket) => ticket.aiStatus === "PROCESSING"
    ).length;

    const aiFailed = tickets.filter(
        (ticket) => ticket.aiStatus === "FAILED"
    ).length;

    const ticketsPerPage = 10;

    const totalPages = Math.ceil(
        filteredTickets.length / ticketsPerPage
    );

    const startIndex = (currentPage - 1) * ticketsPerPage;

    const paginatedTickets = filteredTickets.slice(
        startIndex,
        startIndex + ticketsPerPage
    );

    const getAiProcessingDuration = () => {
        const processingActivity = ticketActivity.find(
            (activity) => activity.activityType === "AI_PROCESSING"
        );

        const completedActivity = ticketActivity.find(
            (activity) => activity.activityType === "AI_COMPLETED"
        );

        if (!processingActivity || !completedActivity) {
            return null;
        }

        const start = new Date(processingActivity.createdAt).getTime();
        const end = new Date(completedActivity.createdAt).getTime();

        const durationSeconds = Math.round((end - start) / 1000);

        return durationSeconds;
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();

        const diffSeconds = Math.floor(
            (now.getTime() - date.getTime()) / 1000
        );

        if (diffSeconds < 60) {
            return "just now";
        }

        const diffMinutes = Math.floor(diffSeconds / 60);

        if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
        }

        const diffHours = Math.floor(diffMinutes / 60);

        if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
        }

        const diffDays = Math.floor(diffHours / 24);

        if (diffDays < 30) {
            return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
        }

        const diffMonths = Math.floor(diffDays / 30);

        return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-100 p-8">
                <p className="text-gray-600">Loading tickets...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-3xl font-bold text-gray-900">
                Customer Support Dashboard
            </h1>

            <p className="mt-2 text-gray-600">
                Manage customer tickets and AI-powered support insights.
            </p>

            <div
                className="mt-6"
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "16px",
                }}
            >
                <div className="min-h-24 rounded-lg bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">
                        Total Tickets
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {totalTickets}
                    </p>
                </div>

                <div className="min-h-24 rounded-lg bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">
                        Customers
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {totalCustomers}
                    </p>
                </div>

                <div className="min-h-24 rounded-lg bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">
                        Open Tickets
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {openTickets}
                    </p>
                </div>
            </div>

            <div
                className="mt-4"
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "16px",
                }}
            >
                {agentWorkloads.map((agent) => (
                    <div
                        key={agent.id}
                        className="min-h-24 rounded-lg bg-white p-5 shadow"
                    >
                        <p className="text-sm text-gray-500">
                            {agent.name}
                        </p>

                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {agent.ticketCount}
                        </p>

                        <div className="mt-2 flex text-xs text-gray-500">
                            <span>
                                Open: {agent.openTickets}
                            </span>

                            <span style={{ marginLeft: "10px" }}>
                                Resolved: {agent.resolvedTickets}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div
                className="mt-4"
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "16px",
                }}
            >
                <div className="min-h-24 rounded-lg bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">
                        AI Completed
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {aiCompleted}
                    </p>
                </div>

                <div className="min-h-24 rounded-lg bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">
                        AI Processing
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {aiProcessing}
                    </p>
                </div>

                <button
                    onClick={() =>
                        setAiStatusFilter(
                            aiStatusFilter === "FAILED" ? "ALL" : "FAILED"
                        )
                    }
                    className={`w-full rounded-lg bg-white p-4 text-left shadow hover:bg-gray-50 ${
                        aiStatusFilter === "FAILED"
                            ? "ring-2 ring-red-500"
                            : ""
                    }`}
                >
                    <p className="text-sm text-gray-500">
                        AI Failed
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {aiFailed}
                    </p>
                </button>
                <div className="rounded-lg bg-white p-4 shadow">
                    <p className="text-sm text-gray-500">AI Success Rate</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        {aiSuccessRate}%
                    </p>
                </div>
            </div>

            <div
                className="mt-4"
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "16px",
                }}
            >
                <button
                    type="button"
                    onClick={() => setSlaFilter("BREACHED")}
                    className={`rounded-lg bg-white p-4 text-left shadow hover:bg-gray-50 ${
                        slaFilter === "BREACHED"
                            ? "ring-2 ring-blue-500"
                            : ""
                    }`}
                >
                    <p className="text-sm text-gray-500">
                        SLA Breached
                    </p>
                    <p className="mt-1 text-2xl font-bold text-red-600">
                        {supportStats.slaBreached}
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => setSlaFilter("AT_RISK")}
                    className={`rounded-lg bg-white p-4 text-left shadow hover:bg-gray-50 ${
                        slaFilter === "AT_RISK"
                            ? "ring-2 ring-blue-500"
                            : ""
                    }`}
                >
                    <p className="text-sm text-gray-500">
                        SLA At Risk
                    </p>
                    <p className="mt-1 text-2xl font-bold text-orange-600">
                        {supportStats.slaAtRisk}
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => setSlaFilter("WITHIN_SLA")}
                    className={`rounded-lg bg-white p-4 text-left shadow hover:bg-gray-50 ${
                        slaFilter === "WITHIN_SLA"
                            ? "ring-2 ring-blue-500"
                            : ""
                    }`}
                >
                    <p className="text-sm text-gray-500">
                        Within SLA
                    </p>
                    <p className="mt-1 text-2xl font-bold text-green-600">
                        {supportStats.slaWithin}
                    </p>
                </button>
            </div>

            <div className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Support Overview
                </h2>

                <div
                    className="mt-6"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "16px",
                    }}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter("ALL");
                            setPriorityFilter("ALL");
                            setAgentFilter("ALL");
                            setAiStatusFilter("ALL");
                            setSearchTerm("");
                            setCurrentPage(1);
                        }}
                        className="rounded-lg bg-white p-4 text-left shadow transition hover:shadow-md"
                    >
                        <p className="text-sm text-gray-500">Total Tickets</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {supportStats.total}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setStatusFilter("OPEN")}
                        className="rounded-lg bg-white p-4 text-left shadow transition hover:shadow-md"
                    >
                        <p className="text-sm text-gray-500">Open</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {supportStats.open}
                        </p>
                    </button>

                    <div className="rounded-lg bg-white p-4 shadow">
                        <p className="text-sm text-gray-500">In Progress</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {supportStats.inProgress}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setStatusFilter("RESOLVED")}
                        className="rounded-lg bg-white p-4 text-left shadow transition hover:shadow-md"
                    >
                        <p className="text-sm text-gray-500">Resolved</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {supportStats.resolved}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setPriorityFilter("HIGH");
                            setStatusFilter("ALL");
                            setAgentFilter("ALL");
                            setAiStatusFilter("ALL");
                        }}
                        className="rounded-lg bg-white p-4 text-left shadow transition hover:shadow-md"
                    >
                        <p className="text-sm text-gray-500">High</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {supportStats.high}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setPriorityFilter("URGENT");
                            setStatusFilter("ALL");
                            setAgentFilter("ALL");
                            setAiStatusFilter("ALL");
                        }}
                        className="rounded-lg bg-white p-4 text-left shadow transition hover:shadow-md"
                    >
                        <p className="text-sm text-gray-500">Urgent</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {supportStats.urgent}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setAgentFilter("UNASSIGNED")}
                        className="rounded-lg bg-white p-4 text-left shadow transition hover:shadow-md"
                    >
                        <p className="text-sm text-gray-500">Unassigned</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {supportStats.unassigned}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setAiStatusFilter("PROCESSING")}
                        className="rounded-lg bg-white p-4 text-left shadow transition hover:shadow-md"
                    >
                        <p className="text-sm text-gray-500">AI Processing</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {supportStats.aiProcessing}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setAiStatusFilter("FAILED")}
                        className="rounded-lg bg-white p-4 text-left shadow transition hover:shadow-md"
                    >
                        <p className="text-sm text-gray-500">AI Failed</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {supportStats.aiFailed}
                        </p>
                    </button>
                </div>
            </div>

            <div
                className="mt-8"
                style={{
                    display: "flex",
                    gap: "24px",
                    alignItems: "flex-start",
                }}
            >
                {/* Ticket List */}
                <section
                    style={{
                        width: "320px",
                        flexShrink: 0,
                    }}
                >
                    <div className="mb-4 rounded-lg bg-white p-4 shadow">
                        <h3 className="font-semibold text-gray-900">
                            Customers
                        </h3>

                        {selectedCustomer !== null && (
                            <button
                                onClick={() => setSelectedCustomer(null)}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                                Clear customer filter
                            </button>
                        )}

                        <div className="mt-3 space-y-2">
                            {customers.map((customer) => (
                                <div
                                    key={customer.id}
                                    onClick={() => setSelectedCustomer(customer.id)}
                                    className={`cursor-pointer rounded-md border p-3 ${
                                        selectedCustomer === customer.id
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                    <p className="text-sm font-medium text-gray-900">
                                        {customer.name}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                        {tickets.filter(
                                            (ticket) => ticket.customer?.id === customer.id
                                        ).length}{" "}
                                        {tickets.filter(
                                            (ticket) => ticket.customer?.id === customer.id
                                        ).length === 1
                                            ? "ticket"
                                            : "tickets"}
                                    </p>
                                    {selectedCustomer === customer.id && (
                                        <div className="mt-3 border-t border-gray-200 pt-3">
                                            <p className="text-xs font-semibold text-gray-700">
                                                Ticket History
                                            </p>

                                            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                                                {tickets
                                                    .filter((ticket) => ticket.customer?.id === customer.id)
                                                    .map((ticket) => (
                                                        <div
                                                            key={ticket.id}
                                                            onClick={() => setSelectedTicket(ticket)}
                                                            className="cursor-pointer rounded-md bg-gray-50 p-2 hover:bg-gray-100"
                                                        >
                                                            <p className="text-sm font-medium text-gray-900">
                                                                #{ticket.id} {ticket.subject}
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-500">
                                                                Created {getRelativeTime(ticket.createdAt)}
                                                            </p>

                                                            <p className="text-xs text-gray-500">
                                                                {ticket.status} · {ticket.priority}
                                                            </p>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mb-4 rounded-lg bg-white p-4 shadow">
                        <h3 className="font-semibold text-gray-900">
                            Create Customer
                        </h3>

                        <input
                            type="text"
                            placeholder="Customer name"
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />

                        <input
                            type="email"
                            placeholder="Customer email"
                            value={newCustomerEmail}
                            onChange={(e) => setNewCustomerEmail(e.target.value)}
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />

                        <button
                            onClick={createCustomer}
                            disabled={creatingCustomer}
                            className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {creatingCustomer ? "Creating..." : "Create Customer"}
                        </button>

                        {customerMessage && (
                            <p className="mt-2 text-sm text-gray-600">
                                {customerMessage}
                            </p>
                        )}
                    </div>
                    <div className="mt-4 rounded-lg bg-white p-4 shadow">
                        <h3 className="font-semibold text-gray-900">
                            Create Ticket
                        </h3>

                        <select
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        >
                            <option value="">Select a customer</option>
                            {customers.map((customer) => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.name} ({customer.email})
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            placeholder="Subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />

                        <textarea
                            placeholder="Describe the customer's issue..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />

                        <button
                            onClick={createTicket}
                            disabled={creating}
                            className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {creating ? "Creating..." : "Create Ticket"}
                        </button>
                        {createMessage && (
                            <p className="mt-2 text-sm text-red-600">
                                {createMessage}
                            </p>
                        )}
                    </div>

                    {slaFilter !== "ALL" && (
                        <button
                            type="button"
                            onClick={() => {
                                setSlaFilter("ALL");
                                setCurrentPage(1);
                            }}
                            className="mb-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                            Clear SLA filter
                        </button>
                    )}

                    <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    >
                        <option value="ALL">Status</option>
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    >
                        <option value="ALL">Priority</option>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                    </select>

                    <select
                        value={agentFilter}
                        onChange={(e) => setAgentFilter(e.target.value)}
                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    >
                        <option value="ALL">Agents</option>
                        <option value="UNASSIGNED">Unassigned</option>

                        {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                                {agent.name}
                            </option>
                        ))}
                    </select>

                    <div
                        className="mt-4 flex flex-col gap-3 overflow-y-auto"
                        style={{ maxHeight: "600px" }}
                    >
                        {paginatedTickets.map((ticket) => (
                            <button
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className={`block w-full rounded-lg p-4 text-left shadow ${
                                    selectedTicket?.id === ticket.id
                                        ? "bg-blue-50 ring-2 ring-blue-500"
                                        : "bg-white hover:bg-gray-50"
                                }`}
                            >
                                <h3 className="font-semibold text-gray-900">
                                    #{ticket.id} {ticket.subject}
                                </h3>

                                <p className="mt-1 text-xs text-gray-500">
                                    Created {getRelativeTime(ticket.createdAt)}
                                </p>

                                {ticket.customer && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        {ticket.customer.name}
                                    </p>
                                )}

                                {ticket.agent && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Agent: {ticket.agent.name}
                                    </p>
                                )}

                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
                                        {ticket.status}
                                    </span>

                                    <span
                                        className={`rounded-full px-2 py-1 font-medium ${
                                            ticket.priority === "URGENT"
                                                ? "bg-red-100 text-red-700"
                                                : ticket.priority === "HIGH"
                                                    ? "bg-orange-100 text-orange-700"
                                                    : ticket.priority === "MEDIUM"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-green-100 text-green-700"
                                        }`}
                                    >
                                        {ticket.priority}
                                    </span>

                                    {ticket.category && (
                                        <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-700">
                                            {ticket.category}
                                        </span>
                                    )}

                                    <span
                                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                                            getSlaStatus(ticket) === "BREACHED"
                                                ? "bg-red-100 text-red-700"
                                                : getSlaStatus(ticket) === "AT_RISK"
                                                    ? "bg-orange-100 text-orange-700"
                                                    : getSlaStatus(ticket) === "COMPLETED"
                                                        ? "bg-gray-100 text-gray-700"
                                                        : "bg-green-100 text-green-700"
                                        }`}
                                    >
                                        {getSlaStatus(ticket) === "BREACHED"
                                            ? "SLA BREACHED"
                                            : getSlaStatus(ticket) === "AT_RISK"
                                                ? "SLA AT RISK"
                                                : getSlaStatus(ticket) === "COMPLETED"
                                                    ? "SLA COMPLETED"
                                                    : "WITHIN SLA"}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <button
                            onClick={() => setCurrentPage((page) => page - 1)}
                            disabled={currentPage === 1}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:opacity-50"
                        >
                            Previous
                        </button>

                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages || 1}
                        </span>

                        <button
                            onClick={() => setCurrentPage((page) => page + 1)}
                            disabled={currentPage >= totalPages}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </section>

                {/* Ticket Details */}
                <section
                    style={{
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    {selectedTicket ? (
                        <div className="rounded-lg bg-white p-6 shadow">
                            <h2 className="text-2xl font-bold text-gray-900">
                                #{selectedTicket.id} {selectedTicket.subject}
                            </h2>

                            <p className="mt-4 text-gray-900">
                                {selectedTicket.description}
                            </p>

                            {selectedTicket.customer && (
                                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                                    <h3 className="font-semibold text-gray-900">
                                        Customer
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-700">
                                        {selectedTicket.customer.name}
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        {selectedTicket.customer.email}
                                    </p>
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap gap-2 text-sm">
                              <span
                                  className={`rounded-full px-3 py-1 font-medium ${
                                      selectedTicket.status === "IN_PROGRESS"
                                          ? "bg-blue-100 text-blue-700"
                                          : selectedTicket.status === "RESOLVED"
                                              ? "bg-green-100 text-green-700"
                                              : selectedTicket.status === "CLOSED"
                                                  ? "bg-gray-200 text-gray-700"
                                                  : "bg-gray-100 text-gray-700"
                                  }`}
                              >
                                {selectedTicket.status}
                              </span>

                                <span
                                    className={`rounded-full px-3 py-1 font-medium ${
                                        selectedTicket.priority === "URGENT"
                                            ? "bg-red-100 text-red-700"
                                            : selectedTicket.priority === "HIGH"
                                                ? "bg-orange-100 text-orange-700"
                                                : selectedTicket.priority === "MEDIUM"
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-green-100 text-green-700"
                                    }`}
                                >
                                    {selectedTicket.priority}
                                </span>

                                <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
                                    {selectedTicket.category ?? "Pending"}
                                </span>

                                <span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700">
                                    {selectedTicket.sentiment ?? "Pending"}
                                </span>
                            </div>

                            <div className="mt-4 rounded-lg bg-gray-50 p-4">
                                <h3 className="font-semibold text-gray-900">
                                    Assigned Agent
                                </h3>

                                <p className="mt-1 text-sm text-gray-700">
                                    {selectedTicket.agent
                                        ? `${selectedTicket.agent.name} (${selectedTicket.agent.email})`
                                        : "Unassigned"}
                                </p>

                                <select
                                    value={selectedTicket.agent?.id ?? ""}
                                    onChange={(e) => assignAgent(e.target.value)}
                                    disabled={assigningAgent}
                                    className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                                >
                                    <option value="">Select an agent</option>

                                    {agents.map((agent) => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.name} ({agent.email})
                                        </option>
                                    ))}
                                </select>

                                {agentMessage && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        {agentMessage}
                                    </p>
                                )}
                            </div>

                            <div className="mt-4 rounded-lg bg-gray-50 p-4">
                                <h3 className="font-semibold text-gray-900">
                                    Assignment History
                                </h3>

                                {assignmentHistory.length === 0 ? (
                                    <p className="mt-2 text-sm text-gray-500">
                                        No assignment history yet.
                                    </p>
                                ) : (
                                    <div className="mt-3 space-y-3">
                                        {assignmentHistory.map((history) => (
                                            <div
                                                key={history.id}
                                                className="border-l-2 border-blue-400 pl-3"
                                            >
                                                <p className="text-sm font-medium text-gray-900">
                                                    {history.agentName}
                                                </p>

                                                <p className="text-xs text-gray-500">
                                                    {history.agentEmail}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-400">
                                                    {new Date(history.assignedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 rounded-lg bg-gray-50 p-4">
                                <h3 className="font-semibold text-gray-900">
                                    Ticket Activity
                                </h3>

                                {ticketActivity.length === 0 ? (
                                    <p className="mt-2 text-sm text-gray-500">
                                        No activity yet.
                                    </p>
                                ) : (
                                    <div className="mt-3 space-y-4">
                                        {ticketActivity.map((activity) => (
                                            <div
                                                key={activity.id}
                                                className="flex gap-3"
                                            >
                                                <div className="flex flex-col items-center">
                                                    <div
                                                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                                                            activity.activityType === "TICKET_CREATED"
                                                                ? "bg-gray-100 text-gray-700"
                                                                : activity.activityType === "AGENT_ASSIGNED"
                                                                    ? "bg-blue-100 text-blue-700"
                                                                    : activity.activityType === "STATUS_CHANGED"
                                                                        ? "bg-purple-100 text-purple-700"
                                                                        : activity.activityType === "PRIORITY_CHANGED"
                                                                            ? "bg-amber-100 text-amber-700"
                                                                            : activity.activityType === "AI_COMPLETED"
                                                                                ? "bg-green-100 text-green-700"
                                                                                : activity.activityType === "AI_PROCESSING"
                                                                                    ? "bg-blue-100 text-blue-700"
                                                                                : activity.activityType === "AI_FAILED"
                                                                                    ? "bg-red-100 text-red-700"
                                                                                    : activity.activityType === "AI_RETRY"
                                                                                        ? "bg-yellow-100 text-yellow-700"
                                                                                        : "bg-gray-100 text-gray-700"
                                                        }`}
                                                    >
                                                        {activity.activityType === "TICKET_CREATED" && "＋"}
                                                        {activity.activityType === "AGENT_ASSIGNED" && "→"}
                                                        {activity.activityType === "STATUS_CHANGED" && "↻"}
                                                        {activity.activityType === "PRIORITY_CHANGED" && "!"}
                                                        {activity.activityType === "AI_PROCESSING" && "…"}
                                                        {activity.activityType === "AI_COMPLETED" && "✓"}
                                                        {activity.activityType === "AI_FAILED" && "⚠"}
                                                        {activity.activityType === "AI_RETRY" && "↻"}
                                                    </div>

                                                    <div className="mt-1 h-full w-px bg-gray-200" />
                                                </div>

                                                <div className="pb-4">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                        {activity.activityType.replace("_", " ")}
                                                    </p>

                                                    <p className="text-sm font-medium text-gray-900">
                                                        {activity.description}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-400">
                                                        {new Date(activity.createdAt).toLocaleString()}
                                                    </p>
                                                    {activity.activityType === "AI_COMPLETED" &&
                                                        getAiProcessingDuration() !== null && (
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                Processing time: {getAiProcessingDuration()}s
                                                            </p>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 rounded-lg border border-gray-200 p-4">
                                <h3 className="font-semibold text-gray-900">
                                    Update Ticket
                                </h3>

                                <div className="mt-3 flex items-center gap-3">
                                    <select
                                        value={updateStatus || selectedTicket.status}
                                        onChange={(e) => setUpdateStatus(e.target.value)}
                                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                                    >
                                        <option value="OPEN">OPEN</option>
                                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                                        <option value="RESOLVED">RESOLVED</option>
                                        <option value="CLOSED">CLOSED</option>
                                    </select>

                                    <select
                                        value={updatePriority || selectedTicket.priority}
                                        onChange={(e) => setUpdatePriority(e.target.value)}
                                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                                    >
                                        <option value="LOW">LOW</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HIGH">HIGH</option>
                                        <option value="URGENT">URGENT</option>
                                    </select>

                                    <button
                                        onClick={updateTicket}
                                        disabled={updating}
                                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {updating ? "Updating..." : "Update Ticket"}
                                    </button>
                                </div>
                            </div>

                            {selectedTicket.aiStatus === "PROCESSING" && (
                                <div className="mt-5 rounded-lg bg-yellow-50 p-4">
                                    <p className="text-sm font-medium text-yellow-800">
                                        AI analysis is still processing...
                                    </p>
                                </div>
                            )}

                            {selectedTicket.aiStatus === "FAILED" && (
                                <div className="mt-5 rounded-lg bg-red-50 p-4">
                                    <p className="text-sm font-medium text-red-800">
                                        AI analysis failed. Please try again later.
                                    </p>

                                    <button
                                        onClick={retryAiAnalysis}
                                        disabled={retryingAi}
                                        className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {retryingAi ? "Retrying..." : "Retry AI Analysis"}
                                    </button>
                                </div>
                            )}

                            {selectedTicket.suggestedResponse && (
                                <div className="mt-8 rounded-lg bg-blue-50 p-5">
                                    <h3 className="font-semibold text-gray-900">
                                        AI Suggested Response
                                    </h3>

                                    <p className="mt-2 text-gray-900">
                                        {selectedTicket.suggestedResponse}
                                    </p>
                                </div>
                            )}

                            {selectedTicket.knowledgeSources && (
                                <div className="mt-5">
                                    <h3 className="font-semibold text-gray-900">
                                        Knowledge Sources
                                    </h3>

                                    <p className="mt-2 text-sm text-gray-600">
                                        {selectedTicket.knowledgeSources}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-lg bg-white p-6 shadow">
                            <p className="text-gray-600">
                                Select a ticket to view its details.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
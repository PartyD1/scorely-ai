"""Static DECA event hierarchy data.

Events are organized into clusters. Each cluster maps to a single rubric in the
database (by cluster_name). Specific events within a cluster each have a unique
code and description that defines the prompt students must address.

Events may optionally specify a `rubric_name` to override the cluster-level rubric
lookup. When present, the system looks up that name in the DB instead of cluster_name.
"""

from typing import Optional, TypedDict


class _EventInfoRequired(TypedDict):
    code: str
    name: str
    description: str


class EventInfo(_EventInfoRequired, total=False):
    """Event entry. `required_outline` is optional; if absent, falls back to the
    cluster-level outline stored in the rubric JSON.
    `rubric_name` is optional; if set, overrides cluster_name for rubric lookup."""
    required_outline: Optional[dict]
    rubric_name: str   # overrides cluster_name for rubric lookup when present


class ClusterInfo(TypedDict):
    cluster_name: str    # matches Rubric.event_name in the database
    display_label: str   # shown as the first dropdown label in the UI
    events: list[EventInfo]


CLUSTERS: list[ClusterInfo] = [
    {
        "cluster_name": "Business Operations Research",
        "display_label": "Business Operations Research Events",
        "events": [
            {
                "code": "BOR",
                "name": "Business Services Operations Research",
                "description": (
                    "A research study of a specific company that provides services to businesses "
                    "on a fee or contract basis or provides services to consumers. The report must "
                    "analyze the operations of that specific company — not the industry in general. "
                    "Eligible companies include: human resources firms, IT companies, legal services "
                    "firms, training and development organizations, health care service providers, "
                    "libraries, construction companies, real estate firms, landscaping companies, "
                    "beauty salons, car washes, automotive repair companies, interior decorating "
                    "firms, child care services, photography studios, and tutoring services.\n\n"
                    "2025-2026 MANDATORY TOPIC: The report MUST be centered on collaborating with "
                    "that specific company to seek and incorporate customer feedback into the "
                    "company's corporate social responsibility (CSR) initiatives and overall business "
                    "strategies. Using the research findings, the report must develop a CSR strategy "
                    "to achieve internal and/or external results. A report that does not substantively "
                    "address CSR — regardless of writing quality or structure — cannot score well. "
                    "CSR alignment is the primary filter for this event."
                ),
            },
            {
                "code": "FOR",
                "name": "Finance Operations Research",
                "description": (
                    "A research study of a specific company that provides financial services to "
                    "commercial or retail customers. The report must analyze the operations of that "
                    "specific company — not the finance industry in general. Eligible companies "
                    "include: banks, credit unions, accounting firms, investment companies, and "
                    "insurance companies.\n\n"
                    "2025-2026 MANDATORY TOPIC: The report MUST be centered on collaborating with "
                    "that specific company to seek and incorporate customer feedback into the "
                    "company's corporate social responsibility (CSR) initiatives and overall business "
                    "strategies. Using the research findings, the report must develop a CSR strategy "
                    "to achieve internal and/or external results. A report that does not substantively "
                    "address CSR — regardless of writing quality or structure — cannot score well. "
                    "CSR alignment is the primary filter for this event."
                ),
            },
            {
                "code": "HTOR",
                "name": "Hospitality and Tourism Operations Research",
                "description": (
                    "A research study of a specific company that provides products or services in "
                    "event management, lodging, restaurant management, or travel and tourism. The "
                    "report must analyze the operations of that specific company — not the "
                    "hospitality or tourism industry in general. Eligible companies include: hotels, "
                    "lodging services, convention centers, food and beverage providers, restaurants, "
                    "museums, amusement parks, zoos, and other tourism-related businesses.\n\n"
                    "2025-2026 MANDATORY TOPIC: The report MUST be centered on collaborating with "
                    "that specific company to seek and incorporate customer feedback into the "
                    "company's corporate social responsibility (CSR) initiatives and overall business "
                    "strategies. Using the research findings, the report must develop a CSR strategy "
                    "to achieve internal and/or external results. A report that does not substantively "
                    "address CSR — regardless of writing quality or structure — cannot score well. "
                    "CSR alignment is the primary filter for this event."
                ),
            },
            {
                "code": "BMOR",
                "name": "Buying and Merchandising Operations Research",
                "description": (
                    "A research study of a specific company that gets products into customers' hands "
                    "through forecasting, planning, buying, displaying, selling, and customer service. "
                    "The report must analyze the operations of that specific company — not the retail "
                    "or wholesale industry in general. Eligible companies include: specialty stores, "
                    "department stores, shopping malls, grocery stores, convenience stores, "
                    "pharmacies, discount stores, farmers markets, and car dealerships.\n\n"
                    "2025-2026 MANDATORY TOPIC: The report MUST be centered on collaborating with "
                    "that specific company to seek and incorporate customer feedback into the "
                    "company's corporate social responsibility (CSR) initiatives and overall business "
                    "strategies. Using the research findings, the report must develop a CSR strategy "
                    "to achieve internal and/or external results. A report that does not substantively "
                    "address CSR — regardless of writing quality or structure — cannot score well. "
                    "CSR alignment is the primary filter for this event."
                ),
            },
            {
                "code": "SEOR",
                "name": "Sports and Entertainment Marketing Operations Research",
                "description": (
                    "A research study of a specific company that provides products, services, or "
                    "experiences in amateur or professional sports, entertainment events, recreational "
                    "equipment, or leisure and cultural activities. The report must analyze the "
                    "operations of that specific company — not the sports or entertainment industry "
                    "in general. Eligible companies include: sports teams, movie theaters, "
                    "waterparks, music venues, concert promoters, festivals, amateur practice "
                    "facilities, tournament organizers, summer camps, outdoor adventure companies, "
                    "and craft or music class providers.\n\n"
                    "2025-2026 MANDATORY TOPIC: The report MUST be centered on collaborating with "
                    "that specific company to seek and incorporate customer feedback into the "
                    "company's corporate social responsibility (CSR) initiatives and overall business "
                    "strategies. Using the research findings, the report must develop a CSR strategy "
                    "to achieve internal and/or external results. A report that does not substantively "
                    "address CSR — regardless of writing quality or structure — cannot score well. "
                    "CSR alignment is the primary filter for this event."
                ),
            },
        ],
    },
    {
        "cluster_name": "Entrepreneurship",
        "display_label": "Entrepreneurship Events",
        "events": [
            {
                "code": "EBG",
                "name": "Business Growth Plan",
                "rubric_name": "Business Growth Plan",
                "description": (
                    "Participants analyze an existing business they personally own and operate "
                    "(a parent's business does not qualify) and develop a written growth strategy. "
                    "IMPORTANT: This event requires proof of business ownership or operation. "
                    "The submission may include un-numbered documentation pages (business license, "
                    "tax filings, notarized affidavit, certificates of insurance, or local permits) "
                    "that do not count toward the 20-page content limit. If the submitted report "
                    "contains no credible evidence that the business is real and student-owned, "
                    "flag this prominently in overall_feedback as a potential disqualifying issue."
                ),
            },
            {
                "code": "EFB",
                "name": "Franchise Business Plan",
                "rubric_name": "Franchise Business Plan",
                "description": (
                    "Participants develop a comprehensive business plan proposal to buy into "
                    "an existing franchise and present it in a role-playing interview."
                ),
            },
            {
                "code": "EIB",
                "name": "Independent Business Plan",
                "rubric_name": "Independent Business Plan",
                "description": (
                    "Participants develop a comprehensive proposal to start a new business "
                    "and request financing in a role-playing interview with a bank or venture "
                    "capital official. Any type of business may be used."
                ),
            },
            {
                "code": "IBP",
                "name": "International Business Plan",
                "rubric_name": "International Business Plan",
                "description": (
                    "Participants develop a proposal to start a new business venture in an "
                    "international setting. It may be a new business or a new product/service "
                    "of an existing business. Any type of business may be used."
                ),
            },
        ],
    },
    {
        "cluster_name": "Project Management",
        "display_label": "Project Management Events",
        "events": [
            {
                "code": "PMBS",
                "name": "Business Solutions Project",
                "description": (
                    "uses the project management process to work with a local business or organization to identify a specific problem with the current business operations and implement a solution. Examples include talent acquisition, employee onboarding, policies and procedures, technology integration, customer service improvement, safety operations, marketing and promotion activities, and productivity and output enhancement."
                ),
            },
            {
                "code": "PMCD",
                "name": "Career Development Project",
                "description": (
                    "uses the project management process to promote/educate the knowledge and skills needed for careers in marketing, finance, hospitality, management and entrepreneurship. Examples include career fairs, summer boot camps, professional dress seminars, résumé development workshops, career exploration initiatives, mock interviews, and career workplace re-entry and mentor programs."
                ),
            },
            {
                "code": "PMCA",
                "name": "Community Awareness Project",
                "description": (
                    "uses the project management process to raise awareness for a community issue or cause. Examples include day of service, distracted driving, driving under the influence, bullying, disease awareness, mental health awareness, drug awareness, ethics, environmental and green issues, and vaping."
                ),
            },
            {
                "code": "PMCG",
                "name": "Community Giving Project",
                "description": (
                    "uses the project management process to raise funds or collect donations to be given to a cause/charity. Examples include food bank donations, homeless shelter donations, 5K's, sports tournaments, auctions, banquets, item collections, holiday drives, adopt-a-family events, etc."
                ),
            },
            {
                "code": "PMFL",
                "name": "Financial Literacy Project",
                "description": (
                    "uses the project management process to promote the importance of financial literacy, including spending and saving, credit and debt, employment and income, investing, risk and insurance and financial decision making. Examples include organizing and implementing seminars for students (elementary, middle, high and post-secondary), tax preparation assistance, retirement planning and student loan workshops."
                ),
            },
            {
                "code": "PMSP",
                "name": "Sales Project",
                "description": (
                    "uses the project management process to raise funds for the local DECA chapter. Examples include sports tournaments, t-shirt sales, 5K's, school merchandise sales, catalog sales, sponsorship development initiatives, fashion shows, pageants, restaurant nights, value cards and yearbook sales."
                ),
            },
        ],
    },
]


def get_event_by_code(code: str) -> Optional[EventInfo]:
    """Return the EventInfo for a given event code, or None if not found."""
    for cluster in CLUSTERS:
        for event in cluster["events"]:
            if event["code"] == code:
                return event
    return None


def get_cluster_for_code(code: str) -> Optional[ClusterInfo]:
    """Return the ClusterInfo that contains the given event code, or None."""
    for cluster in CLUSTERS:
        for event in cluster["events"]:
            if event["code"] == code:
                return cluster
    return None


def get_rubric_name_for_code(code: str) -> Optional[str]:
    """Get the DB rubric name for an event code.

    Checks event-level rubric_name override first, falls back to cluster_name.
    Returns None if the event code is not found.
    """
    event = get_event_by_code(code)
    if event and event.get("rubric_name"):
        return event["rubric_name"]
    cluster = get_cluster_for_code(code)
    return cluster["cluster_name"] if cluster else None

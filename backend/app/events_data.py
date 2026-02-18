"""Static DECA event hierarchy data.

Events are organized into clusters. Each cluster maps to a single rubric in the
database (by cluster_name). Specific events within a cluster each have a unique
code and description that defines the prompt students must address.
"""

from typing import Optional, TypedDict


class EventInfo(TypedDict):
    code: str
    name: str
    description: str


class ClusterInfo(TypedDict):
    cluster_name: str    # matches Rubric.event_name in the database
    display_label: str   # shown as the first dropdown label in the UI
    events: list[EventInfo]


CLUSTERS: list[ClusterInfo] = [
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

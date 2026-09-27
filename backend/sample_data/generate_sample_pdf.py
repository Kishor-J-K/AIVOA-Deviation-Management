"""
Generates a realistic sample pharmaceutical process-deviation report PDF,
used to demo/test the "Document Extraction Tool" (Tool 3).

Run:
    python sample_data/generate_sample_pdf.py
Outputs:
    sample_data/sample_deviation_report.pdf
"""
import os

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)

OUT_PATH = os.path.join(os.path.dirname(__file__), "sample_deviation_report.pdf")

styles = getSampleStyleSheet()
title_style = ParagraphStyle("TitleCustom", parent=styles["Title"], fontSize=16, spaceAfter=6)
heading_style = ParagraphStyle("HeadingCustom", parent=styles["Heading2"], fontSize=12,
                                spaceBefore=14, spaceAfter=6, textColor=colors.HexColor("#1f3a5f"))
body_style = ParagraphStyle("BodyCustom", parent=styles["Normal"], fontSize=10, leading=14)


def build_pdf():
    doc = SimpleDocTemplate(
        OUT_PATH, pagesize=letter,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.75 * inch, bottomMargin=0.75 * inch,
    )
    story = []

    story.append(Paragraph("Deviation Report - Manufacturing / Process", title_style))
    story.append(Paragraph("Apex Active Pharmaceutical Ingredients Pvt. Ltd.", body_style))
    story.append(Spacer(1, 12))

    header_table_data = [
        ["Deviation Number:", "DEV-2026-0912"],
        ["Date Raised:", "2026-09-18"],
        ["Raised By:", "R. Nair, Shift Production Supervisor"],
        ["Department:", "API Manufacturing - Reactor Block C"],
    ]
    header_table = Table(header_table_data, colWidths=[1.8 * inch, 4.2 * inch])
    header_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)

    story.append(Paragraph("1. Product / Batch Information", heading_style))
    product_table_data = [
        ["Product Name", "Metformin Hydrochloride API"],
        ["Product Grade / Strength", "USP Grade, 99.5% purity spec"],
        ["Batch / Lot Number", "MFH26-0712A"],
        ["Manufacturing Date", "12-Sep-2026"],
        ["Expiry / Retest Date", "11-Sep-2028"],
    ]
    product_table = Table(product_table_data, colWidths=[2.2 * inch, 3.8 * inch])
    product_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f2f5f9")),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(product_table)

    story.append(Paragraph("2. Deviation Event Details", heading_style))
    event_table_data = [
        ["Process Step", "Step 3 - Exothermic Reaction / Crystallization"],
        ["Equipment ID", "Reactor R-204 (Glass-Lined Steel, 2000L)"],
        ["Affected Quantity", "180 kg (full reactor charge, Batch MFH26-0712A)"],
    ]
    event_table = Table(event_table_data, colWidths=[2.2 * inch, 3.8 * inch])
    event_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f2f5f9")),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(event_table)

    story.append(Paragraph("3. Description of Deviation", heading_style))
    story.append(Paragraph(
        "During Step 3 (exothermic reaction / crystallization hold) of Batch MFH26-0712A, the reactor "
        "jacket temperature control loop failed to compensate for the exotherm, and batch temperature "
        "exceeded the validated upper limit of 65&deg;C, reaching a peak of 78.4&deg;C and remaining above "
        "75&deg;C for approximately 20 minutes before the operator manually engaged emergency cooling. "
        "The batch record specifies a validated hold range of 55&deg;C - 65&deg;C for this step. In-process "
        "sampling immediately after the excursion showed an unexpected impurity peak (RRT 1.42) at 0.38%, "
        "versus the historical trend of &lt;0.10% for this intermediate.",
        body_style,
    ))

    story.append(Paragraph("4. Immediate Actions Taken", heading_style))
    story.append(Paragraph(
        "Batch was placed on hold in Reactor R-204. Manual cooling was engaged and temperature was "
        "returned to the validated range within 6 minutes of detection. Batch quarantined pending "
        "Quality Assurance disposition. Reactor R-204's temperature control loop has been flagged for "
        "calibration and maintenance review before further use.",
        body_style,
    ))

    story.append(Paragraph("5. Preliminary Observations", heading_style))
    story.append(Paragraph(
        "Maintenance logs indicate the jacket temperature control valve on R-204 was last calibrated "
        "11 months ago, exceeding the internal 6-month calibration interval for this equipment class. "
        "No other batches processed on R-204 in the interim reported similar excursions, but this is "
        "under review.",
        body_style,
    ))

    doc.build(story)
    print(f"Sample deviation report generated at: {OUT_PATH}")


if __name__ == "__main__":
    build_pdf()

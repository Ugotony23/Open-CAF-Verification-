"""Export Service for Open CAF Remediation Tasks & Action Plans.
Supports CSV (RFC 4180), Jira REST API bulk format, GitHub Issues payload, and styled Excel (.xlsx).
"""
import io
import csv
import json
from datetime import datetime, date, timezone
from typing import List, Dict, Any, Optional
from uuid import UUID

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.models.remediation import RemediationTask, RemediationStatus, RemediationPriority


class ExportService:
    @classmethod
    def export_remediation_csv(cls, tasks: List[RemediationTask]) -> str:
        """
        Outputs RFC 4180 compliant CSV of all remediation tasks with outcome codes,
        owners, costs, and statuses. Uses CRLF line terminators and standard quoting.
        """
        output = io.StringIO()
        writer = csv.writer(
            output,
            quoting=csv.QUOTE_MINIMAL,
            lineterminator="\r\n",
        )

        # Header row
        headers = [
            "Task ID",
            "Assessment ID",
            "Contributing Outcome",
            "Title",
            "Description",
            "Status",
            "Priority",
            "Assigned Owner Name",
            "Assigned Owner Email",
            "Estimated Effort (Hours)",
            "Estimated Cost (GBP)",
            "Target Completion Date",
            "Completed At",
            "External Ticket ID",
            "Created At",
        ]
        writer.writerow(headers)

        # Data rows
        for t in tasks:
            writer.writerow([
                str(t.id),
                str(t.assessment_id),
                t.outcome_id,
                t.title,
                t.description or "",
                t.status.value if hasattr(t.status, "value") else str(t.status),
                t.priority.value if hasattr(t.priority, "value") else str(t.priority),
                t.assigned_owner_name or "",
                t.assigned_owner_email or "",
                f"{t.estimated_effort_hours:.1f}" if t.estimated_effort_hours is not None else "0.0",
                f"{t.estimated_cost_gbp:.2f}" if t.estimated_cost_gbp is not None else "0.00",
                t.target_completion_date.isoformat() if t.target_completion_date else "",
                t.completed_at.isoformat() if t.completed_at else "",
                t.external_ticket_id or "",
                t.created_at.isoformat() if t.created_at else "",
            ])

        return output.getvalue()

    @classmethod
    def export_jira_payload(
        cls,
        tasks: List[RemediationTask],
        project_key: str = "CAF",
        issue_type: str = "Task",
    ) -> Dict[str, Any]:
        """
        Formats tasks into Jira REST API v2/v3 bulk issue creation JSON structure:
        POST /rest/api/3/issue/bulk
        Each item includes project, summary, description, priority, labels, and duedate.
        """
        priority_map = {
            RemediationPriority.CRITICAL: "Highest",
            RemediationPriority.HIGH: "High",
            RemediationPriority.MEDIUM: "Medium",
            RemediationPriority.LOW: "Low",
        }

        issue_updates = []
        for t in tasks:
            jira_priority = priority_map.get(t.priority, "Medium")

            # Format technical steps into readable markdown checklist
            steps_text = ""
            if t.technical_steps:
                steps_text = "\n\n*Action Steps:*\n"
                if isinstance(t.technical_steps, list):
                    for step in t.technical_steps:
                        if isinstance(step, dict):
                            done = "[x]" if step.get("completed") else "[ ]"
                            steps_text += f"- {done} {step.get('step', '')}\n"
                        elif isinstance(step, str):
                            steps_text += f"- [ ] {step}\n"

            description_text = (
                f"*NCSC CAF Contributing Outcome:* {t.outcome_id}\n"
                f"*Estimated Effort:* {t.estimated_effort_hours}h | *Estimated Budget:* £{t.estimated_cost_gbp:,.2f}\n"
                f"*Assigned Lead:* {t.assigned_owner_name or 'Unassigned'} ({t.assigned_owner_email or 'N/A'})\n\n"
                f"{t.description or 'No detailed description provided.'}"
                f"{steps_text}"
            )

            fields: Dict[str, Any] = {
                "project": {"key": project_key},
                "summary": f"[{t.outcome_id}] {t.title}",
                "description": description_text,
                "issuetype": {"name": issue_type},
                "priority": {"name": jira_priority},
                "labels": ["OpenCAF", "NCSC-CAF", f"CAF-{t.outcome_id.replace('.', '_')}"],
            }

            if t.target_completion_date:
                fields["duedate"] = t.target_completion_date.isoformat()

            issue_updates.append({"fields": fields})

        return {
            "total_tasks": len(tasks),
            "project_key": project_key,
            "issueUpdates": issue_updates,
        }

    @classmethod
    def export_github_issues_payload(cls, tasks: List[RemediationTask]) -> Dict[str, Any]:
        """
        Formats tasks into GitHub Issues batch creation payload format.
        """
        issues = []
        for t in tasks:
            steps_md = ""
            if t.technical_steps:
                steps_md = "\n\n#### Technical Checklist\n"
                if isinstance(t.technical_steps, list):
                    for step in t.technical_steps:
                        if isinstance(step, dict):
                            done = "x" if step.get("completed") else " "
                            steps_md += f"- [{done}] {step.get('step', '')}\n"
                        elif isinstance(step, str):
                            steps_md += f"- [ ] {step}\n"

            body = (
                f"### NCSC Cyber Assessment Framework Action Item\n\n"
                f"- **Contributing Outcome:** `{t.outcome_id}`\n"
                f"- **Priority:** `{t.priority.value}`\n"
                f"- **Status:** `{t.status.value}`\n"
                f"- **Est. Cost:** £{t.estimated_cost_gbp:,.2f}\n"
                f"- **Est. Effort:** {t.estimated_effort_hours} hours\n"
                f"- **Target Completion Date:** {t.target_completion_date or 'TBD'}\n\n"
                f"#### Context & Scope\n{t.description or 'No description provided.'}"
                f"{steps_md}"
            )

            labels = [
                "opencaf",
                "ncsc-caf",
                f"outcome:{t.outcome_id.lower()}",
                f"priority:{t.priority.value.lower()}",
            ]

            assignees = []
            if t.assigned_owner_email and "@" in t.assigned_owner_email:
                assignees.append(t.assigned_owner_email.split("@")[0])

            issues.append({
                "title": f"[{t.outcome_id}] {t.title}",
                "body": body,
                "labels": labels,
                "assignees": assignees,
            })

        return {
            "total_tasks": len(tasks),
            "issues": issues,
        }

    @classmethod
    def export_excel_action_plan(
        cls,
        tasks: List[RemediationTask],
        assessment_title: str = "Council Cyber Assessment",
        council_name: str = "Borsetshire Council",
    ) -> bytes:
        """
        Generates a professionally formatted .xlsx spreadsheet using openpyxl:
        - Styled header banner with GOV.UK Blue (#1D70B8)
        - Column widths auto-scaled
        - Currency formatting for £ GBP
        - Conditional status & priority cell highlights
        - Total SUM row at bottom
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Remediation Action Plan"

        # Ensure grid lines are visible
        ws.views.sheetView[0].showGridLines = True

        # Styles
        font_title = Font(name="Calibri", size=16, bold=True, color="0B0C0C")
        font_meta = Font(name="Calibri", size=10, italic=True, color="505A5F")
        font_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        font_data = Font(name="Calibri", size=10)
        font_bold = Font(name="Calibri", size=10, bold=True)

        fill_header = PatternFill(start_color="1D70B8", end_color="1D70B8", fill_type="solid")
        fill_total = PatternFill(start_color="F3F2F1", end_color="F3F2F1", fill_type="solid")

        thin_side = Side(border_style="thin", color="D0D5DD")
        border_all = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        border_total = Border(
            top=Side(border_style="thin", color="0B0C0C"),
            bottom=Side(border_style="double", color="0B0C0C"),
            left=thin_side,
            right=thin_side,
        )

        align_center = Alignment(horizontal="center", vertical="center")
        align_left = Alignment(horizontal="left", vertical="center")
        align_right = Alignment(horizontal="right", vertical="center")

        # Title block
        ws.merge_cells("A1:K1")
        title_cell = ws["A1"]
        title_cell.value = f"Open CAF – Cyber Remediation Action Plan: {council_name}"
        title_cell.font = font_title
        ws.row_dimensions[1].height = 28

        ws.merge_cells("A2:K2")
        meta_cell = ws["A2"]
        meta_cell.value = (
            f"Assessment: {assessment_title}  |  Generated: {datetime.now(timezone.utc).strftime('%d %B %Y %H:%M UTC')}  |  "
            f"Total Actions: {len(tasks)}"
        )
        meta_cell.font = font_meta
        ws.row_dimensions[2].height = 18

        # Blank row 3
        ws.row_dimensions[3].height = 10

        # Table headers in Row 4
        headers = [
            "Ref #",
            "Outcome",
            "Remediation Action Item",
            "Priority",
            "Status",
            "Assigned Lead",
            "Lead Email",
            "Effort (Hrs)",
            "Est. Budget (£)",
            "Target Date",
            "Ticket ID",
        ]

        ws.row_dimensions[4].height = 26
        for col_idx, h in enumerate(headers, 1):
            cell = ws.cell(row=4, column=col_idx, value=h)
            cell.font = font_header
            cell.fill = fill_header
            cell.border = border_all
            cell.alignment = align_center if col_idx in (1, 2, 4, 5, 10, 11) else align_left

        # Status styling maps
        status_styles = {
            "COMPLETED": {"fill": "D1E7DD", "font": "0F5132"},
            "IN_PROGRESS": {"fill": "CFE2FF", "font": "084298"},
            "IN_REVIEW": {"fill": "E2D9F3", "font": "432874"},
            "BACKLOG": {"fill": "F8F9FA", "font": "495057"},
            "CANCELLED": {"fill": "E9ECEF", "font": "6C757D"},
        }

        priority_styles = {
            "CRITICAL": {"fill": "F8D7DA", "font": "842029"},
            "HIGH": {"fill": "FFE5D0", "font": "8A3B00"},
            "MEDIUM": {"fill": "FFF3CD", "font": "664D03"},
            "LOW": {"fill": "E2E3E5", "font": "41464B"},
        }

        # Data rows start at 5
        start_row = 5
        for idx, t in enumerate(tasks, 1):
            current_row = start_row + idx - 1
            ws.row_dimensions[current_row].height = 20

            status_val = t.status.value if hasattr(t.status, "value") else str(t.status)
            priority_val = t.priority.value if hasattr(t.priority, "value") else str(t.priority)

            # Ref #
            c1 = ws.cell(row=current_row, column=1, value=idx)
            c1.alignment = align_center
            c1.font = font_data
            c1.border = border_all

            # Outcome
            c2 = ws.cell(row=current_row, column=2, value=t.outcome_id)
            c2.alignment = align_center
            c2.font = font_bold
            c2.border = border_all

            # Action title
            c3 = ws.cell(row=current_row, column=3, value=t.title)
            c3.alignment = align_left
            c3.font = font_data
            c3.border = border_all

            # Priority (styled)
            c4 = ws.cell(row=current_row, column=4, value=priority_val)
            c4.alignment = align_center
            c4.border = border_all
            if priority_val in priority_styles:
                p_cfg = priority_styles[priority_val]
                c4.fill = PatternFill(start_color=p_cfg["fill"], end_color=p_cfg["fill"], fill_type="solid")
                c4.font = Font(name="Calibri", size=10, bold=True, color=p_cfg["font"])
            else:
                c4.font = font_data

            # Status (styled)
            c5 = ws.cell(row=current_row, column=5, value=status_val)
            c5.alignment = align_center
            c5.border = border_all
            if status_val in status_styles:
                s_cfg = status_styles[status_val]
                c5.fill = PatternFill(start_color=s_cfg["fill"], end_color=s_cfg["fill"], fill_type="solid")
                c5.font = Font(name="Calibri", size=10, bold=True, color=s_cfg["font"])
            else:
                c5.font = font_data

            # Lead
            c6 = ws.cell(row=current_row, column=6, value=t.assigned_owner_name or "—")
            c6.alignment = align_left
            c6.font = font_data
            c6.border = border_all

            # Lead Email
            c7 = ws.cell(row=current_row, column=7, value=t.assigned_owner_email or "—")
            c7.alignment = align_left
            c7.font = font_data
            c7.border = border_all

            # Effort Hours
            c8 = ws.cell(row=current_row, column=8, value=t.estimated_effort_hours or 0.0)
            c8.alignment = align_right
            c8.font = font_data
            c8.number_format = "#,##0.0"
            c8.border = border_all

            # Est Budget (£)
            c9 = ws.cell(row=current_row, column=9, value=float(t.estimated_cost_gbp or 0.0))
            c9.alignment = align_right
            c9.font = font_bold
            c9.number_format = "£#,##0.00"
            c9.border = border_all

            # Target Date
            target_str = t.target_completion_date.strftime("%Y-%m-%d") if t.target_completion_date else "—"
            c10 = ws.cell(row=current_row, column=10, value=target_str)
            c10.alignment = align_center
            c10.font = font_data
            c10.border = border_all

            # Ticket ID
            c11 = ws.cell(row=current_row, column=11, value=t.external_ticket_id or "—")
            c11.alignment = align_center
            c11.font = font_data
            c11.border = border_all

        # Total Summary Row at bottom
        end_data_row = start_row + len(tasks) - 1 if tasks else start_row
        total_row = end_data_row + 1
        ws.row_dimensions[total_row].height = 24

        ws.merge_cells(f"A{total_row}:G{total_row}")
        tot_label = ws.cell(row=total_row, column=1, value="Total Action Plan Commitment:")
        tot_label.alignment = Alignment(horizontal="right", vertical="center")
        tot_label.font = font_bold
        tot_label.fill = fill_total
        tot_label.border = border_total

        for col in range(2, 8):
            cell = ws.cell(row=total_row, column=col)
            cell.border = border_total
            cell.fill = fill_total

        # Sum Effort
        tot_effort = ws.cell(
            row=total_row,
            column=8,
            value=f"=SUM(H{start_row}:H{end_data_row})" if tasks else 0.0,
        )
        tot_effort.alignment = align_right
        tot_effort.font = font_bold
        tot_effort.fill = fill_total
        tot_effort.border = border_total
        tot_effort.number_format = "#,##0.0"

        # Sum Cost
        tot_cost = ws.cell(
            row=total_row,
            column=9,
            value=f"=SUM(I{start_row}:I{end_data_row})" if tasks else 0.0,
        )
        tot_cost.alignment = align_right
        tot_cost.font = Font(name="Calibri", size=11, bold=True, color="0B0C0C")
        tot_cost.fill = fill_total
        tot_cost.border = border_total
        tot_cost.number_format = "£#,##0.00"

        # Blank remaining total row cells
        for col in (10, 11):
            cell = ws.cell(row=total_row, column=col, value="")
            cell.border = border_total
            cell.fill = fill_total

        # Column widths auto-adjustment
        column_min_widths = {
            1: 8,   # Ref #
            2: 12,  # Outcome
            3: 38,  # Title
            4: 14,  # Priority
            5: 16,  # Status
            6: 22,  # Lead
            7: 28,  # Email
            8: 14,  # Effort
            9: 18,  # Cost
            10: 16, # Target Date
            11: 14, # Ticket ID
        }

        for col_idx, min_w in column_min_widths.items():
            col_letter = get_column_letter(col_idx)
            max_len = min_w
            for cell in ws[col_letter]:
                if cell.row > 2 and cell.value:
                    max_len = max(max_len, len(str(cell.value)) + 2)
            ws.column_dimensions[col_letter].width = min(max_len, 50)

        # Save to bytes stream
        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream.getvalue()

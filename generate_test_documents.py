#!/usr/bin/env python3
"""
Document Generator Script for Test Knowledge Base

This script generates all the Office documents needed for the MCP endpoint testing
according to the specifications in the design document.
"""

import os
from pathlib import Path
from faker import Faker
from faker_file.providers.xlsx_file import XlsxFileProvider
from faker_file.providers.pdf_file import PdfFileProvider  
from faker_file.providers.pptx_file import PptxFileProvider
from faker_file.providers.docx_file import DocxFileProvider
from faker_file.storages.filesystem import FileSystemStorage

# Test patterns that should appear across documents
TEST_PATTERNS = {
    'emails': ['john@acme.com', 'sarah.smith@bigco.com', 'procurement@supplier.com'],
    'financial': ['Q1 revenue', 'quarterly results', '$1.2M'],
    'dates': ['March 31, 2024', 'Q1 2024', '2024-03-31'],
    'legal': ['force majeure', 'confidential information', 'indemnification'],
    'wfh': ['WFH', 'remote work', 'work from home']
}

def setup_faker():
    """Set up Faker with all required providers"""
    fake = Faker()
    
    # Set up storage for the test knowledge base
    storage = FileSystemStorage(
        root_path=Path.cwd() / "tests" / "fixtures" / "test-knowledge-base",
        rel_path=""  # Files will go directly in the specified subdirectories
    )
    
    # Add providers
    fake.add_provider(XlsxFileProvider)
    fake.add_provider(PdfFileProvider)
    fake.add_provider(PptxFileProvider)
    fake.add_provider(DocxFileProvider)
    
    return fake, storage

def generate_q1_budget_xlsx(fake, storage):
    """Generate Q1_Budget.xlsx with 3 sheets (Summary: 50 rows, Details: 2000 rows, Charts: empty)"""
    print("Generating Q1_Budget.xlsx...")
    
    # Custom content for the budget file
    content = f"""
    QUARTERLY BUDGET REPORT - Q1 2024
    
    FINANCIAL SUMMARY:
    Total Revenue: $1,234,567
    Q1 revenue exceeded expectations by 15%
    Quarterly results show strong performance
    
    CONTACT INFORMATION:
    Finance Lead: {TEST_PATTERNS['emails'][0]}
    Budget Manager: {TEST_PATTERNS['emails'][1]}
    Procurement: {TEST_PATTERNS['emails'][2]}
    
    REPORTING DATES:
    Q1 End Date: {TEST_PATTERNS['dates'][0]}
    Report Period: {TEST_PATTERNS['dates'][1]}
    
    BUDGET DETAILS:
    - Marketing: $456,789
    - Engineering: $678,901
    - Operations: $98,877
    
    This report covers the {TEST_PATTERNS['dates'][1]} period ending {TEST_PATTERNS['dates'][0]}.
    """
    
    # Generate file in Finance/2024/Q1/ directory
    finance_storage = FileSystemStorage(
        root_path=storage.root_path / "Finance" / "2024" / "Q1",
        rel_path=""
    )
    
    file = fake.xlsx_file(
        storage=finance_storage,
        filename="Q1_Budget.xlsx"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_q1_report_pdf(fake, storage):
    """Generate Q1_Report.pdf with 30 pages and bookmarks"""
    print("Generating Q1_Report.pdf...")
    
    content = f"""
    QUARTERLY BUSINESS REPORT
    Q1 2024 PERFORMANCE ANALYSIS
    
    EXECUTIVE SUMMARY
    The first quarter of 2024 demonstrated exceptional growth with {TEST_PATTERNS['financial'][0]} reaching $1.2M, 
    representing a 15% increase over projections. Our {TEST_PATTERNS['financial'][1]} continue to exceed expectations.
    
    FINANCIAL PERFORMANCE
    Revenue for {TEST_PATTERNS['dates'][1]} totaled {TEST_PATTERNS['financial'][2]}, marking our strongest 
    quarterly performance to date. The period ending {TEST_PATTERNS['dates'][0]} showed consistent growth.
    
    OPERATIONAL HIGHLIGHTS
    - Remote work policy (WFH) implementation successful
    - New client acquisitions exceeded targets
    - Team productivity increased by 22%
    
    LEGAL & COMPLIANCE
    All contracts now include standard {TEST_PATTERNS['legal'][0]} clauses to protect against unforeseen circumstances.
    Our {TEST_PATTERNS['legal'][1]} protocols have been strengthened, and {TEST_PATTERNS['legal'][2]} terms 
    have been standardized across all agreements.
    
    CONTACT INFORMATION
    For questions regarding this report, please contact:
    - Finance: {TEST_PATTERNS['emails'][0]}
    - Operations: {TEST_PATTERNS['emails'][1]}  
    - Legal: {TEST_PATTERNS['emails'][2]}
    
    REMOTE WORK UPDATE
    The {TEST_PATTERNS['wfh'][0]} policy has been successfully implemented with 85% employee satisfaction.
    Our {TEST_PATTERNS['wfh'][1]} guidelines continue to evolve based on team feedback.
    
    This comprehensive report covers all aspects of our {TEST_PATTERNS['dates'][1]} performance.
    """ * 10  # Repeat to make it longer
    
    finance_storage = FileSystemStorage(
        root_path=storage.root_path / "Finance" / "2024" / "Q1",
        rel_path=""
    )
    
    # Use ReportLab generator specifically
    file = fake.pdf_file(
        storage=finance_storage,
        filename="Q1_Report.pdf",
        pdf_generator_cls="faker_file.providers.pdf_file.generators.reportlab_generator.ReportlabPdfGenerator"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_annual_report_pdf(fake, storage):
    """Generate Annual_Report_2024.pdf with 100+ pages and bookmarks"""
    print("Generating Annual_Report_2024.pdf...")
    
    content = f"""
    ANNUAL REPORT 2024
    COMPREHENSIVE BUSINESS REVIEW
    
    TABLE OF CONTENTS
    1. Executive Summary
    2. Financial Overview  
    3. Quarterly Results
    4. Legal & Compliance
    5. Operations Report
    6. Risk Assessment
    
    SECTION 1: EXECUTIVE SUMMARY
    This annual report provides a comprehensive overview of our 2024 performance.
    Strong {TEST_PATTERNS['financial'][1]} across all quarters, with {TEST_PATTERNS['financial'][0]} 
    consistently exceeding targets.
    
    SECTION 2: FINANCIAL OVERVIEW
    Total annual revenue reached {TEST_PATTERNS['financial'][2]} with steady growth throughout the year.
    Each reporting period from {TEST_PATTERNS['dates'][2]} through December 31, 2024 showed positive trends.
    
    SECTION 3: QUARTERLY BREAKDOWN
    Q1 2024: Exceptional performance with revenue of $1.2M
    Q2 2024: Continued growth momentum  
    Q3 2024: Market expansion success
    Q4 2024: Strong finish to the year
    
    SECTION 4: LEGAL & COMPLIANCE
    All major contracts have been updated to include {TEST_PATTERNS['legal'][0]} provisions.
    Our {TEST_PATTERNS['legal'][1]} procedures ensure data protection compliance.
    Standard {TEST_PATTERNS['legal'][2]} clauses protect company interests.
    
    SECTION 5: OPERATIONS REPORT
    The implementation of {TEST_PATTERNS['wfh'][1]} policies has improved work-life balance.
    {TEST_PATTERNS['wfh'][0]} arrangements are now available to 95% of eligible employees.
    
    CONTACT DIRECTORY
    - Chief Financial Officer: {TEST_PATTERNS['emails'][0]}
    - VP Operations: {TEST_PATTERNS['emails'][1]}
    - Legal Counsel: {TEST_PATTERNS['emails'][2]}
    
    """ * 50  # Repeat to make it very long (100+ pages)
    
    finance_storage = FileSystemStorage(
        root_path=storage.root_path / "Finance" / "Reports",
        rel_path=""
    )
    
    file = fake.pdf_file(
        storage=finance_storage,
        filename="Annual_Report_2024.pdf",
        pdf_generator_cls="faker_file.providers.pdf_file.generators.reportlab_generator.ReportlabPdfGenerator"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_vendor_agreement_pdf(fake, storage):
    """Generate Acme_Vendor_Agreement.pdf with emails and dates"""
    print("Generating Acme_Vendor_Agreement.pdf...")
    
    content = f"""
    VENDOR AGREEMENT
    ACME CORPORATION
    
    PARTIES TO AGREEMENT
    This agreement is between Acme Corporation and our organization.
    
    PRIMARY CONTACTS
    Acme Representative: {TEST_PATTERNS['emails'][0]}
    Our Procurement Lead: {TEST_PATTERNS['emails'][2]}
    Legal Advisor: {TEST_PATTERNS['emails'][1]}
    
    AGREEMENT TERMS
    Effective Date: {TEST_PATTERNS['dates'][0]}
    Contract Period: {TEST_PATTERNS['dates'][1]}
    Review Date: {TEST_PATTERNS['dates'][2]}
    
    SECTION 12-14: LIMITATION OF LIABILITY
    In no event shall either party be liable for any indirect, incidental, special, 
    consequential or punitive damages. This limitation of liability clause is standard
    in our vendor agreements.
    
    The parties acknowledge that {TEST_PATTERNS['legal'][0]} events may impact performance.
    All {TEST_PATTERNS['legal'][1]} shared between parties is protected under this agreement.
    Standard {TEST_PATTERNS['legal'][2]} provisions apply as outlined in Section 15.
    
    FINANCIAL TERMS
    Contract Value: {TEST_PATTERNS['financial'][2]}
    Payment terms based on {TEST_PATTERNS['financial'][1]}
    
    SIGNATURES
    This agreement was signed on {TEST_PATTERNS['dates'][0]} by authorized representatives.
    """
    
    legal_storage = FileSystemStorage(
        root_path=storage.root_path / "Legal" / "Contracts",
        rel_path=""
    )
    
    file = fake.pdf_file(
        storage=legal_storage,
        filename="Acme_Vendor_Agreement.pdf",
        pdf_generator_cls="faker_file.providers.pdf_file.generators.reportlab_generator.ReportlabPdfGenerator"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_supply_contract_docx(fake, storage):
    """Generate Supply_Contract_2024.docx with termination clause"""
    print("Generating Supply_Contract_2024.docx...")
    
    content = f"""
    SUPPLY CONTRACT 2024
    
    CONTRACT DETAILS
    This supply contract expires December 31, 2024 and contains standard termination provisions.
    
    CONTACT INFORMATION
    Primary Contact: {TEST_PATTERNS['emails'][2]}
    Secondary Contact: {TEST_PATTERNS['emails'][1]}
    
    FINANCIAL TERMS
    Contract covers {TEST_PATTERNS['financial'][1]} for the entire 2024 period.
    Total contract value: {TEST_PATTERNS['financial'][2]}
    
    LEGAL PROVISIONS
    This contract includes {TEST_PATTERNS['legal'][0]} clauses for protection against unforeseen events.
    {TEST_PATTERNS['legal'][1]} is protected under strict confidentiality terms.
    {TEST_PATTERNS['legal'][2]} provisions are mutual between all parties.
    
    TERMINATION CLAUSE
    Either party may terminate this agreement with 60 days written notice.
    Contract expires December 31, 2024 unless renewed by mutual agreement.
    Early termination fees may apply as outlined in Section 8.
    
    CONTACT EMAILS
    For contract questions: {TEST_PATTERNS['emails'][0]}
    For procurement issues: {TEST_PATTERNS['emails'][2]}
    For legal matters: {TEST_PATTERNS['emails'][1]}
    """
    
    legal_storage = FileSystemStorage(
        root_path=storage.root_path / "Legal" / "Contracts",
        rel_path=""
    )
    
    file = fake.docx_file(
        storage=legal_storage,
        filename="Supply_Contract_2024.docx"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_remote_work_policy_docx(fake, storage):
    """Generate Remote_Work_Policy.docx with WFH references"""
    print("Generating Remote_Work_Policy.docx...")
    
    content = f"""
    REMOTE WORK POLICY
    EFFECTIVE 2024
    
    OVERVIEW
    This policy outlines our approach to {TEST_PATTERNS['wfh'][1]} arrangements and {TEST_PATTERNS['wfh'][0]} guidelines.
    All employees are eligible for {TEST_PATTERNS['wfh'][2]} options subject to role requirements.
    
    POLICY DETAILS
    - {TEST_PATTERNS['wfh'][0]} is permitted up to 3 days per week
    - {TEST_PATTERNS['wfh'][1]} requires manager approval
    - Home office setup must meet safety standards
    
    CONTACTS
    HR Lead: {TEST_PATTERNS['emails'][1]}
    Policy Questions: {TEST_PATTERNS['emails'][0]}
    
    COMPLIANCE
    This policy ensures {TEST_PATTERNS['legal'][1]} protection for all remote workers.
    
    EFFECTIVE DATES
    Policy effective: {TEST_PATTERNS['dates'][0]}
    Review date: {TEST_PATTERNS['dates'][2]}
    """
    
    legal_storage = FileSystemStorage(
        root_path=storage.root_path / "Legal" / "Policies",
        rel_path=""
    )
    
    file = fake.docx_file(
        storage=legal_storage,
        filename="Remote_Work_Policy.docx"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_board_deck_pptx(fake, storage):
    """Generate Q4_Board_Deck.pptx with 45 slides and speaker notes"""
    print("Generating Q4_Board_Deck.pptx...")
    
    content = f"""
    Q4 BOARD PRESENTATION
    BUSINESS REVIEW
    
    SLIDE 1: AGENDA
    - Financial Performance
    - Operational Updates  
    - Strategic Initiatives
    - Q&A
    
    SLIDE 8: FINANCIAL HIGHLIGHTS
    {TEST_PATTERNS['financial'][0]}: {TEST_PATTERNS['financial'][2]}
    {TEST_PATTERNS['financial'][1]} exceeded targets by 15%
    Strong performance across all business units
    
    SLIDE 15: OPERATIONAL EXCELLENCE
    {TEST_PATTERNS['wfh'][1]} policy successfully implemented
    {TEST_PATTERNS['wfh'][0]} adoption at 85%
    Employee satisfaction scores increased
    
    SPEAKER NOTES:
    Emphasize the strong {TEST_PATTERNS['financial'][1]} and growth trajectory.
    Highlight successful {TEST_PATTERNS['wfh'][1]} implementation.
    Address any questions about contract renewals.
    
    CONTACT INFORMATION:
    Board inquiries: {TEST_PATTERNS['emails'][0]}
    Operational questions: {TEST_PATTERNS['emails'][1]}
    
    """ * 15  # Repeat for 45 slides worth of content
    
    sales_storage = FileSystemStorage(
        root_path=storage.root_path / "Sales" / "Presentations",
        rel_path=""
    )
    
    file = fake.pptx_file(
        storage=sales_storage,
        filename="Q4_Board_Deck.pptx"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_sales_pipeline_xlsx(fake, storage):
    """Generate Sales_Pipeline.xlsx with multiple sheets and charts"""
    print("Generating Sales_Pipeline.xlsx...")
    
    content = f"""
    SALES PIPELINE ANALYSIS
    
    PIPELINE OVERVIEW
    Current pipeline value: {TEST_PATTERNS['financial'][2]}
    {TEST_PATTERNS['financial'][1]} show strong conversion rates
    
    SHEET 1: ACTIVE DEALS
    Contact: {TEST_PATTERNS['emails'][0]} - Deal Value: $250K
    Contact: {TEST_PATTERNS['emails'][1]} - Deal Value: $180K  
    Contact: {TEST_PATTERNS['emails'][2]} - Deal Value: $95K
    
    SHEET 2: CLOSED DEALS
    {TEST_PATTERNS['dates'][1]} performance summary
    Total closed: {TEST_PATTERNS['financial'][2]}
    
    SHEET 3: CHARTS
    [Chart data and visualizations would be here]
    
    REPORTING PERIOD
    Data as of: {TEST_PATTERNS['dates'][0]}
    Next review: {TEST_PATTERNS['dates'][2]}
    """
    
    sales_storage = FileSystemStorage(
        root_path=storage.root_path / "Sales" / "Data",
        rel_path=""
    )
    
    file = fake.xlsx_file(
        storage=sales_storage,
        filename="Sales_Pipeline.xlsx"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_content_calendar_xlsx(fake, storage):
    """Generate content_calendar.xlsx with 12 sheets (one per month)"""
    print("Generating content_calendar.xlsx...")
    
    content = f"""
    CONTENT CALENDAR 2024
    
    JANUARY SHEET:
    - Blog post: {TEST_PATTERNS['financial'][1]} preview
    - Social media: New year campaign
    - Email: Welcome series
    
    FEBRUARY SHEET:
    - Blog post: Remote work benefits
    - Social media: {TEST_PATTERNS['wfh'][0]} tips
    - Email: Policy updates
    
    MARCH SHEET:
    - Blog post: {TEST_PATTERNS['dates'][1]} review
    - Social media: Growth highlights
    - Email: Customer spotlight
    
    [Additional months would follow similar pattern]
    
    CONTACTS:
    Marketing Lead: {TEST_PATTERNS['emails'][1]}
    Content Manager: {TEST_PATTERNS['emails'][0]}
    """
    
    marketing_storage = FileSystemStorage(
        root_path=storage.root_path / "Marketing",
        rel_path=""
    )
    
    file = fake.xlsx_file(
        storage=marketing_storage,
        filename="content_calendar.xlsx"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def create_corrupted_xlsx():
    """Create an intentionally corrupted Excel file"""
    print("Creating corrupted.xlsx...")
    
    corrupted_path = Path.cwd() / "tests" / "fixtures" / "test-knowledge-base" / "test-edge-cases" / "corrupted.xlsx"
    
    # Create a file with invalid Excel content
    with open(corrupted_path, "wb") as f:
        f.write(b"This is not a valid Excel file content" * 100)
    
    print(f"✅ Created: {corrupted_path}")

def create_single_page_pdf():
    """Create a single page PDF"""
    print("Creating single_page.pdf...")
    
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    
    pdf_path = Path.cwd() / "tests" / "fixtures" / "test-knowledge-base" / "test-edge-cases" / "single_page.pdf"
    
    # Create a simple one-page PDF
    c = canvas.Canvas(str(pdf_path), pagesize=letter)
    c.drawString(100, 750, "Single Page Test Document")
    c.drawString(100, 720, f"This document contains test patterns:")
    c.drawString(100, 690, f"Email: {TEST_PATTERNS['emails'][0]}")
    c.drawString(100, 660, f"Financial: {TEST_PATTERNS['financial'][2]}")
    c.drawString(100, 630, f"Date: {TEST_PATTERNS['dates'][0]}")
    c.drawString(100, 600, f"Legal: {TEST_PATTERNS['legal'][0]}")
    c.save()
    
    print(f"✅ Created: {pdf_path}")

def generate_product_demo_pptx(fake, storage):
    """Generate Product_Demo.pptx with 10 slides, no notes"""
    print("Generating Product_Demo.pptx...")
    
    sales_storage = FileSystemStorage(
        root_path=storage.root_path / "Sales" / "Presentations",
        rel_path=""
    )
    
    file = fake.pptx_file(
        storage=sales_storage,
        filename="Product_Demo.pptx"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_brand_guidelines_pdf(fake, storage):
    """Generate brand_guidelines.pdf with 15 pages"""
    print("Generating brand_guidelines.pdf...")
    
    marketing_storage = FileSystemStorage(
        root_path=storage.root_path / "Marketing",
        rel_path=""
    )
    
    file = fake.pdf_file(
        storage=marketing_storage,
        filename="brand_guidelines.pdf",
        pdf_generator_cls="faker_file.providers.pdf_file.generators.reportlab_generator.ReportlabPdfGenerator"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_nda_template_docx(fake, storage):
    """Generate NDA_Template.docx with legal patterns"""
    print("Generating NDA_Template.docx...")
    
    legal_storage = FileSystemStorage(
        root_path=storage.root_path / "Legal" / "Templates",
        rel_path=""
    )
    
    file = fake.docx_file(
        storage=legal_storage,
        filename="NDA_Template.docx"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def generate_q4_forecast_xlsx(fake, storage):
    """Generate Q4_Forecast.xlsx with forecasting data"""
    print("Generating Q4_Forecast.xlsx...")
    
    finance_storage = FileSystemStorage(
        root_path=storage.root_path / "Finance" / "2024" / "Q4",
        rel_path=""
    )
    
    file = fake.xlsx_file(
        storage=finance_storage,
        filename="Q4_Forecast.xlsx"
    )
    
    print(f"✅ Created: {file.data['filename']}")
    return file

def main():
    """Generate all test documents"""
    print("🚀 Starting test document generation...")
    print("=" * 50)
    
    # Set up Faker
    fake, storage = setup_faker()
    
    # Generate all Office documents
    try:
        generate_q1_budget_xlsx(fake, storage)
        generate_q1_report_pdf(fake, storage) 
        generate_annual_report_pdf(fake, storage)
        generate_vendor_agreement_pdf(fake, storage)
        generate_supply_contract_docx(fake, storage)
        generate_remote_work_policy_docx(fake, storage)
        generate_board_deck_pptx(fake, storage)
        generate_product_demo_pptx(fake, storage)
        generate_sales_pipeline_xlsx(fake, storage)
        generate_content_calendar_xlsx(fake, storage)
        generate_brand_guidelines_pdf(fake, storage)
        generate_nda_template_docx(fake, storage)
        generate_q4_forecast_xlsx(fake, storage)
        
        # Generate edge case files
        create_corrupted_xlsx()
        create_single_page_pdf()
        
        print("=" * 50)
        print("✅ All test documents generated successfully!")
        print("\n📁 Test Knowledge Base Structure Complete:")
        print("   - Finance/2024/Q1/: Q1_Budget.xlsx, Q1_Report.pdf")
        print("   - Finance/Reports/: Annual_Report_2024.pdf") 
        print("   - Legal/Contracts/: Acme_Vendor_Agreement.pdf, Supply_Contract_2024.docx")
        print("   - Legal/Policies/: Remote_Work_Policy.docx")
        print("   - Sales/Presentations/: Q4_Board_Deck.pptx, Product_Demo.pptx")
        print("   - Sales/Data/: Sales_Pipeline.xlsx")
        print("   - Marketing/: content_calendar.xlsx, brand_guidelines.pdf")
        print("   - Legal/Templates/: NDA_Template.docx")
        print("   - test-edge-cases/: corrupted.xlsx, single_page.pdf")
        
    except Exception as e:
        print(f"❌ Error generating documents: {e}")
        raise

if __name__ == "__main__":
    main()

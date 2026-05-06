const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, 
        WidthType, BorderStyle, ShadingType, HeadingLevel, PageBreak, LevelFormat, VerticalAlign } = require('docx');
const fs = require('fs');

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }
        ]
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }
        ]
      }
    ]
  },
  styles: {
    default: {
      document: {
        run: { font: "Segoe UI", size: 22, color: "2C3E50" }
      }
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 36, bold: true, font: "Segoe UI", color: "0052CC" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 }
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Segoe UI", color: "003D99" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 }
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: "Segoe UI", color: "0066CC" },
        paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 2 }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // ===== COVER PAGE =====
      
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: 720, after: 360 },
        children: [new TextRun("")]
      }),

      // Company Header
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({
          text: "NEXUS TECH SOLUTIONS",
          size: 36,
          bold: true,
          color: "0052CC"
        })]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [new TextRun({
          text: "Enterprise Software Development",
          size: 22,
          color: "666666",
          italic: true
        })]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        border: { bottom: { style: BorderStyle.DOUBLE, size: 12, color: "0052CC" } },
        children: [new TextRun("")]
      }),

      // Main Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({
          text: "COST ESTIMATION & INFRASTRUCTURE PLAN",
          size: 32,
          bold: true,
          color: "0052CC"
        })]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [new TextRun({
          text: "Production-Grade SaaS Platform Development",
          size: 24,
          color: "003D99"
        })]
      }),

      // Document Info Box
      new Paragraph({
        spacing: { before: 240, after: 240 },
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: "E0E0E0" },
                 bottom: { style: BorderStyle.SINGLE, size: 6, color: "E0E0E0" } },
        children: [new TextRun({
          text: "CONFIDENTIAL",
          bold: true,
          size: 24,
          color: "D32F2F"
        })]
      }),

      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({
          text: "Document Type: ",
          bold: true
        }), new TextRun("Cost Estimation & Infrastructure Plan")]
      }),

      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({
          text: "Prepared By: ",
          bold: true
        }), new TextRun("Nexus Tech Solutions")]
      }),

      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({
          text: "Document Date: ",
          bold: true
        }), new TextRun("May 15, 2026")]
      }),

      new Paragraph({
        spacing: { after: 360 },
        children: [new TextRun({
          text: "Valid Until: ",
          bold: true
        }), new TextRun("June 15, 2026 (30 Days)")]
      }),

      new Paragraph({
        spacing: { line: 360 },
        children: [new TextRun({
          text: "© 2026 Nexus Tech Solutions. All Rights Reserved. This document contains confidential information intended solely for the recipient. Unauthorized reproduction or distribution is prohibited.",
          italic: true,
          size: 20,
          color: "666666"
        })]
      }),

      // ===== PAGE 2: OVERVIEW =====
      new Paragraph({ children: [new TextRun("")], pageBreakBefore: true }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("1. Executive Overview")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1.1 Project Description")]
      }),

      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun("This document provides a comprehensive cost estimation and infrastructure plan for the development of a production-grade SaaS platform. The platform is designed to serve enterprise clients with scalable, secure, and high-performance solutions. Our approach emphasizes architectural excellence, long-term maintainability, and seamless scalability to support growth from startup phase to enterprise scale.")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1.2 Technology Stack")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Frontend: ",
          bold: true
        }), new TextRun("React.js 18+ with TypeScript, Redux Toolkit, Next.js for SSR")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Backend: ",
          bold: true
        }), new TextRun("Node.js with Express.js, RESTful & GraphQL APIs")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Database: ",
          bold: true
        }), new TextRun("PostgreSQL 15+ for relational data, Redis for caching")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Authentication: ",
          bold: true
        }), new TextRun("JWT, OAuth 2.0, SAML 2.0 support")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Testing: ",
          bold: true
        }), new TextRun("Jest, Mocha, Cypress, Selenium for E2E testing")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun({
          text: "DevOps: ",
          bold: true
        }), new TextRun("Docker, Kubernetes, CI/CD pipelines (GitHub Actions)")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1.3 Infrastructure Stack")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Cloud Platform: ",
          bold: true
        }), new TextRun("AWS (EC2, RDS, S3, CloudFront, Lambda)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Container Orchestration: ",
          bold: true
        }), new TextRun("Kubernetes (EKS) for auto-scaling")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Monitoring & Logging: ",
          bold: true
        }), new TextRun("DataDog, CloudWatch, ELK Stack")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "CDN: ",
          bold: true
        }), new TextRun("CloudFront for global content distribution")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun({
          text: "Security: ",
          bold: true
        }), new TextRun("SSL/TLS, WAF, DDoS protection, encryption at rest")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1.4 Architecture Highlights")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Microservices architecture for independent scaling")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("API-first design enabling seamless integrations")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("99.9% uptime SLA with multi-region deployment")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Horizontal scaling capability for unlimited growth")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Production-grade security and compliance (GDPR, SOC2)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 360 },
        children: [new TextRun("Automated testing and continuous deployment pipeline")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1.5 Document Purpose")]
      }),

      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun("This Cost Estimation & Infrastructure Plan outlines the complete financial investment required for developing a production-ready SaaS platform. It includes detailed cost breakdowns by component, a structured sprint-based payment schedule, clear delineation of included deliverables versus client responsibilities, and infrastructure requirements. This document serves as the basis for project agreement and resource allocation.")]
      }),

      // ===== PAGE 3: DEVELOPMENT COST =====
      new Paragraph({ children: [new TextRun("")], pageBreakBefore: true }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("2. Total Development Cost")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2.1 Cost Summary")]
      }),

      createCostSummaryTable(),

      new Paragraph({ children: [new TextRun("")], spacing: { after: 240 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2.2 Detailed Cost Breakdown")]
      }),

      createDetailedCostTable(),

      new Paragraph({ children: [new TextRun("")], spacing: { after: 240 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2.3 What's Included")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Complete frontend and backend development")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Database design, optimization, and administration setup")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Automated testing suite (unit, integration, E2E tests)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Security implementation (authentication, authorization, encryption)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Code documentation and technical specifications")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Performance optimization and code review")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("3 months post-launch support and bug fixes")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Developer handoff documentation and knowledge transfer")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2.4 Exclusions")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Infrastructure Costs: ",
          bold: true
        }), new TextRun("Hosting, CDN, databases (See Section 3)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Third-Party APIs: ",
          bold: true
        }), new TextRun("Payment gateways, email services, SMS, analytics")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Licenses & Tools: ",
          bold: true
        }), new TextRun("SSL certificates, monitoring tools, design software")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Maintenance Beyond 3 Months: ",
          bold: true
        }), new TextRun("Billed separately at ₹1,50,000/month")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 360 },
        children: [new TextRun({
          text: "Additional Features: ",
          bold: true
        }), new TextRun("Estimated separately based on complexity")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2.5 Monthly Infrastructure Costs (Post-Launch)")]
      }),

      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({
          text: "Estimated: ₹80,000 - ₹1,20,000/month",
          bold: true,
          size: 24
        })]
      }),

      new Paragraph({
        spacing: { after: 360 },
        children: [new TextRun("Includes AWS hosting, CDN, monitoring, database backups, and security tools. Exact costs vary based on user load and data volume.")]
      }),

      // ===== PAGE 4: SPRINT-BASED PAYMENT =====
      new Paragraph({ children: [new TextRun("")], pageBreakBefore: true }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("3. Sprint-Based Payment Schedule")]
      }),

      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun("The project is structured into 6 development sprints over 24 weeks. Each sprint concludes with deliverables and corresponding payment milestone. This approach provides transparency, risk mitigation, and regular progress checkpoints.")]
      }),

      createSprintPaymentTable(),

      new Paragraph({ children: [new TextRun("")], spacing: { after: 240 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Payment Terms")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Initial Deposit: ",
          bold: true
        }), new TextRun("₹15,00,000 (30%) due upon agreement signing")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Sprint Payments: ",
          bold: true
        }), new TextRun("Due within 7 days of sprint completion")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Final Payment: ",
          bold: true
        }), new TextRun("₹10,00,000 upon production deployment")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Payment Methods: ",
          bold: true
        }), new TextRun("Bank transfer, cheque, or wire transfer")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 360 },
        children: [new TextRun({
          text: "Late Payment: ",
          bold: true
        }), new TextRun("1.5% monthly interest on overdue amounts")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Sprint Details")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Sprint 1: Requirements, Design & Architecture (Weeks 1-4)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Requirements finalization and technical specifications")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("System architecture design and database schema")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun("Infrastructure setup and CI/CD pipeline")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Sprint 2-5: Core Development Sprints")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Frontend component development and UI implementation")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Backend API endpoints and business logic")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun("Database integration and testing")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Sprint 6: Testing, Optimization & Deployment")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Comprehensive QA and security testing")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Performance optimization and load testing")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 360 },
        children: [new TextRun("Production deployment and launch support")]
      }),

      // ===== PAGE 5: INCLUDED VS CLIENT =====
      new Paragraph({ children: [new TextRun("")], pageBreakBefore: true }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("4. Included vs Client Responsibility")]
      }),

      createIncludedVsClientTable(),

      new Paragraph({ children: [new TextRun("")], spacing: { after: 360 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Client Responsibilities - Detailed")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.1 Content & Requirements")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Provide detailed functional and non-functional requirements")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Furnish all content, copy, and marketing materials")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun("Provide branding guidelines, logos, and design assets")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.2 Timely Feedback & Approvals")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Review sprint deliverables and provide feedback within 5 business days")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Approve design mockups before development")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun("Sign off on requirements and architectural decisions")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.3 Infrastructure & External Services")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Arrange and pay for hosting infrastructure (AWS, etc.)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Procure third-party API keys (payment gateway, SMS, email)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Provide SSL certificates and domain management")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun("Configure monitoring and analytics tools")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.4 Data & Testing")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Prepare test data and user accounts for QA")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Provide access to production environment credentials")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 360 },
        children: [new TextRun("Participate in UAT and provide timely feedback")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Nexus Tech Responsibilities - Detailed")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.5 Development Excellence")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Deliver production-grade code following industry standards")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Implement comprehensive automated testing (80%+ code coverage)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Conduct code reviews and security audits")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun("Optimize performance and ensure scalability")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.6 Security & Compliance")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Implement industry-standard security practices")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Ensure GDPR and data protection compliance")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Conduct penetration testing and vulnerability assessment")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun("Implement encryption and secure data handling")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.7 Documentation & Support")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Provide comprehensive API documentation")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create deployment and maintenance guides")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Deliver developer handoff documentation")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 360 },
        children: [new TextRun("Provide 3 months of post-launch support")]
      }),

      // ===== PAGE 6: FUTURE FEATURES & TERMS =====
      new Paragraph({ children: [new TextRun("")], pageBreakBefore: true }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("5. Future Feature Development")]
      }),

      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun("Features not included in the current scope will be estimated separately following the completion of this project. Additional feature development will be priced based on complexity, timeline, and resource requirements.")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5.1 Feature Estimation Process")]
      }),

      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("Client submits detailed feature requirements and business context")]
      }),

      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("Technical analysis and effort estimation (3-5 business days)")]
      }),

      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("Cost proposal and timeline provided to client")]
      }),

      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun("Upon approval, project initiation with new sprint cycle")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5.2 Pricing Factors for Additional Features")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Complexity Level: ",
          bold: true
        }), new TextRun("Simple (UI), Moderate (Business Logic), Complex (Integration)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Timeline: ",
          bold: true
        }), new TextRun("Longer timelines allow better optimization and lower costs")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Integration Requirements: ",
          bold: true
        }), new TextRun("Third-party APIs or legacy system integration")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Testing Scope: ",
          bold: true
        }), new TextRun("Comprehensive QA or focused testing")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 240 },
        children: [new TextRun({
          text: "Resource Allocation: ",
          bold: true
        }), new TextRun("Team size and seniority")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5.3 Maintenance & Support Pricing")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Post-Launch (3 Months): ",
          bold: true
        }), new TextRun("Included in development cost")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Ongoing Support: ",
          bold: true
        }), new TextRun("₹1,50,000/month (40 hours/month) or ₹3,75,000/month (120 hours/month)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({
          text: "Feature Updates: ",
          bold: true
        }), new TextRun("Hourly rate ₹2,500/hour")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 360 },
        children: [new TextRun({
          text: "Emergency Support: ",
          bold: true
        }), new TextRun("₹1,00,000/incident or retainer-based")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("6. General Terms & Conditions")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("6.1 Project Timeline")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Total Duration: 24 weeks (6 sprints of 4 weeks each)")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Delays caused by client (content, approvals): Extended timeline")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun("Delays from our side: Proportional time extension")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("6.2 Intellectual Property")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Client receives full IP ownership upon final payment")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Nexus Tech retains rights to use methodology and reusable components")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun("All third-party libraries and tools retain their original licenses")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("6.3 Limitations & Disclaimers")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("This estimate is valid for 30 days from the document date")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Scope changes may affect timeline and costs")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Client responsible for securing necessary licenses and approvals")]
      }),

      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 360 },
        children: [new TextRun("Force majeure events may impact delivery")]
      }),

      // Signature Section
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({
          text: "AUTHORIZATION & ACCEPTANCE",
          bold: true,
          size: 26,
          color: "0052CC"
        })]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "0052CC" } },
        children: [new TextRun("")]
      }),

      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun("By signing below, both parties agree to the terms, conditions, cost structure, and timeline outlined in this Cost Estimation & Infrastructure Plan. This document forms the basis of the development agreement.")]
      }),

      new Paragraph({
        spacing: { line: 360, after: 120 },
        children: [new TextRun("Client Name: ________________________________     Date: _______________")]
      }),

      new Paragraph({
        spacing: { line: 360, after: 120 },
        children: [new TextRun("Authorized Signature: ________________________________")]
      }),

      new Paragraph({
        spacing: { line: 360, after: 240 },
        children: [new TextRun("Title/Position: ________________________________")]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240 },
        children: [new TextRun({
          text: "FOR NEXUS TECH SOLUTIONS",
          bold: true,
          size: 20
        })]
      }),

      new Paragraph({
        spacing: { line: 360, after: 120 },
        children: [new TextRun("Project Manager: ________________________________     Date: _______________")]
      }),

      new Paragraph({
        spacing: { line: 360, after: 360 },
        children: [new TextRun("Authorized Signature: ________________________________")]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: "E0E0E0" } },
        children: [new TextRun({
          text: "NEXUS TECH SOLUTIONS",
          bold: true,
          size: 20
        })]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({
          text: "Enterprise Software Development | www.nexustech.com",
          size: 20
        })]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: "Email: enterprise@nexustech.com | Phone: +91-XX-XXXX-XXXX",
          size: 20
        })]
      })
    ]
  }]
});

function createCostSummaryTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerShading = { fill: "0052CC", type: ShadingType.CLEAR };
  const totalShading = { fill: "003D99", type: ShadingType.CLEAR };

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [5616, 1872, 1872],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({
              children: [new TextRun({
                text: "Cost Category",
                bold: true,
                color: "FFFFFF",
                size: 22
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "Percentage",
                bold: true,
                color: "FFFFFF",
                size: 22
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({
                text: "Amount (₹)",
                bold: true,
                color: "FFFFFF",
                size: 22
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun("Architecture & Design")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("12%")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹30,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun("Frontend Development")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("28%")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹70,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun("Backend Development")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("32%")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹80,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun("Testing & QA")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("16%")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹40,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun("Deployment & Documentation")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("12%")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹30,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: totalShading,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({
              children: [new TextRun({
                text: "TOTAL DEVELOPMENT COST",
                bold: true,
                color: "FFFFFF",
                size: 24
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: totalShading,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "100%",
                bold: true,
                color: "FFFFFF",
                size: 24
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: totalShading,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({
                text: "₹2,50,00,000",
                bold: true,
                color: "FFFFFF",
                size: 24
              })]
            })]
          })
        ]
      })
    ]
  });
}

function createDetailedCostTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerShading = { fill: "0052CC", type: ShadingType.CLEAR };
  const rowShading = { fill: "F0F4FF", type: ShadingType.CLEAR };

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3744, 2340, 1872, 1404],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({
              children: [new TextRun({
                text: "Component",
                bold: true,
                color: "FFFFFF",
                size: 20
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "Description",
                bold: true,
                color: "FFFFFF",
                size: 20
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "Days",
                bold: true,
                color: "FFFFFF",
                size: 20
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({
                text: "Cost (₹)",
                bold: true,
                color: "FFFFFF",
                size: 20
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("System Architecture")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Design & specifications")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("15")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹15,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Database Design")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Schema & optimization")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("10")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹10,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Frontend Components")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("React components & UI")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("45")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹45,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("State Management")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Redux, API integration")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("25")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹25,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Backend APIs")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("REST/GraphQL endpoints")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("50")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹50,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Authentication & Auth")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("JWT, OAuth, SAML")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("20")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹20,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Automated Testing")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Unit, Integration, E2E")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("30")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹30,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Performance Opt.")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Caching, Load testing")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("15")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹15,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("DevOps & Deployment")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Docker, K8s, CI/CD")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("20")] })]
          }),
          new TableCell({
            borders,
            shading: rowShading,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹20,00,000")] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("Documentation")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun("API, deployment guides")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("10")] })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("₹10,00,000")] })]
          })
        ]
      })
    ]
  });
}

function createSprintPaymentTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerShading = { fill: "0052CC", type: ShadingType.CLEAR };
  const alternateShading = { fill: "F0F4FF", type: ShadingType.CLEAR };

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 1200, 2400, 2040, 2520],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "Sprint",
                bold: true,
                color: "FFFFFF",
                size: 20
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "Timeline",
                bold: true,
                color: "FFFFFF",
                size: 20
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "Key Deliverables",
                bold: true,
                color: "FFFFFF",
                size: 20
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "Payment",
                bold: true,
                color: "FFFFFF",
                size: 20
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: headerShading,
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "Cumulative",
                bold: true,
                color: "FFFFFF",
                size: 20
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "Initial",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("Day 1")]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun("Agreement signing & deposit")]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹15,00,000",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹15,00,000",
                bold: true
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "1",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("W1-W4")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun("Architecture, Design, DB Schema")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹40,00,000",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹55,00,000",
                bold: true
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "2",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("W5-W8")]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun("Frontend components & APIs")]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹40,00,000",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹95,00,000",
                bold: true
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "3",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("W9-W12")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun("Business logic & integrations")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹40,00,000",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹1,35,00,000",
                bold: true
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "4",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("W13-W16")]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun("Complete development & testing")]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹35,00,000",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹1,70,00,000",
                bold: true
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "5",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("W17-W20")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun("QA, optimization & documentation")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹25,00,000",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹1,95,00,000",
                bold: true
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "6",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("W21-W24")]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun("Deployment & launch support")]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹10,00,000",
                bold: true
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: alternateShading,
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹2,05,00,000",
                bold: true
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: { fill: "003D99", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("")]
            })]
          }),
          new TableCell({
            borders,
            shading: { fill: "003D99", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("")]
            })]
          }),
          new TableCell({
            borders,
            shading: { fill: "003D99", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("")]
            })]
          }),
          new TableCell({
            borders,
            shading: { fill: "003D99", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "Final",
                bold: true,
                color: "FFFFFF",
                size: 20
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: { fill: "003D99", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "₹2,50,00,000",
                bold: true,
                color: "FFFFFF",
                size: 22
              })]
            })]
          })
        ]
      })
    ]
  });
}

function createIncludedVsClientTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const includedShading = { fill: "D4EDDA", type: ShadingType.CLEAR };
  const clientShading = { fill: "FFF3CD", type: ShadingType.CLEAR };
  const headerShading = { fill: "0052CC", type: ShadingType.CLEAR };

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: includedShading,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "INCLUDED IN DEVELOPMENT COST",
                bold: true,
                color: "155724",
                size: 22
              })]
            })]
          }),
          new TableCell({
            borders,
            shading: clientShading,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "CLIENT RESPONSIBILITY",
                bold: true,
                color: "856404",
                size: 22
              })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Complete frontend development")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Provide detailed requirements")]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Complete backend development")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Timely feedback & approvals")]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Database design & optimization")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Arrange AWS hosting & infrastructure")]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Automated testing (unit, integration)")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Procure API keys & third-party services")]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Security implementation")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Provide domain & SSL certificates")]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Code review & quality assurance")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Participate in UAT")]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Performance optimization")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Provide test data & test users")]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("CI/CD pipeline setup")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Configure monitoring tools")]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Comprehensive documentation")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Pay all infrastructure & API costs")]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("3 months post-launch support")]
            })]
          }),
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun("Regular status reviews")]
            })]
          })
        ]
      })
    ]
  });
}

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Cost_Estimation_Infrastructure_Plan.docx", buffer);
  console.log("Professional Cost Estimation document created successfully!");
});